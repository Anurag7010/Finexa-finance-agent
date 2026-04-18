const axios = require('axios');
const config = require('../config/env');
const logger = require('../lib/logger');
const Transaction = require('../models/Transaction');
const DataSource = require('../models/DataSource');
const SyncJob = require('../models/SyncJob');

/**
 * Sync service — orchestrates the import pipeline:
 * 1. Deduplication check against existing transactions
 * 2. Batch auto-categorization via the Python AI service
 * 3. Bulk insert of new transactions
 * 4. DataSource + SyncJob status updates
 */

/**
 * Normalizes a merchant string for fuzzy comparison.
 * @param {string} name
 * @returns {string}
 */
function normalizeMerchant(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30);
}

/**
 * Checks whether a transaction already exists in the DB for this user.
 * Uses external_id first (exact), then falls back to date+amount+merchant fuzzy match.
 * @param {string|import('mongoose').Types.ObjectId} userId
 * @param {object} txn - Transformed transaction object (pre-insert)
 * @returns {Promise<boolean>} true if duplicate
 */
async function isDuplicate(userId, txn) {
  // Fast path: external_id match
  if (txn.external_id) {
    const existing = await Transaction.findOne({
      user_id: userId,
      external_id: txn.external_id,
    }).select('_id').lean();
    if (existing) return true;
  }

  // Fuzzy match: same user, same amount (±1%), same day window (±1 day), merchant prefix match
  const dateMin = new Date(txn.date);
  dateMin.setDate(dateMin.getDate() - 1);
  const dateMax = new Date(txn.date);
  dateMax.setDate(dateMax.getDate() + 1);

  const amountMin = txn.amount * 0.99;
  const amountMax = txn.amount * 1.01;
  const normalizedMerchant = normalizeMerchant(txn.merchant);

  const candidates = await Transaction.find({
    user_id: userId,
    date: { $gte: dateMin, $lte: dateMax },
    amount: { $gte: amountMin, $lte: amountMax },
  })
    .select('merchant')
    .lean();

  return candidates.some((c) => {
    const norm = normalizeMerchant(c.merchant);
    // Simple prefix overlap — first 6 chars match
    return norm.slice(0, 6) === normalizedMerchant.slice(0, 6);
  });
}

/**
 * Batch-categorizes transactions using the Python AI service.
 * Falls back to the existing category if the service is unavailable.
 * @param {object[]} transactions - Array of transformed transaction objects
 * @returns {Promise<object[]>} Same array with category field updated
 */
async function categorizeBatch(transactions) {
  try {
    const payload = transactions.map((t) => ({
      merchant: t.merchant,
      description: t.description || t.merchant,
      amount: t.amount,
    }));

    const response = await axios.post(
      `${config.aiServiceUrl}/categorize-batch`,
      { transactions: payload },
      { timeout: 15000 }
    );

    const categories = response.data?.categories || [];

    return transactions.map((t, i) => ({
      ...t,
      category: categories[i] || t.category || 'Other',
    }));
  } catch (err) {
    logger.warn({ err: err.message }, 'Batch categorization failed — using hint categories');
    return transactions;
  }
}

/**
 * Core import pipeline: dedup → categorize → insert.
 * Updates the SyncJob with progress at each step.
 *
 * @param {object} options
 * @param {string|import('mongoose').Types.ObjectId} options.userId
 * @param {string|import('mongoose').Types.ObjectId} options.dataSourceId
 * @param {string|import('mongoose').Types.ObjectId} options.syncJobId
 * @param {object[]} options.rawTransactions - Already-transformed Transaction objects (pre-insert)
 * @returns {Promise<{ imported: number, skipped: number }>}
 */
async function runImportPipeline({ userId, dataSourceId, syncJobId, rawTransactions }) {
  logger.info({ syncJobId, count: rawTransactions.length }, 'Import pipeline started');

  // Mark job as running
  await SyncJob.findByIdAndUpdate(syncJobId, {
    status: 'running',
    started_at: new Date(),
    current_step: `Checking ${rawTransactions.length} transactions for duplicates...`,
  });

  // Step 1: Deduplication
  const toInsert = [];
  let skipped = 0;

  for (const txn of rawTransactions) {
    const dup = await isDuplicate(userId, txn);
    if (dup) {
      skipped++;
    } else {
      toInsert.push(txn);
    }
  }

  await SyncJob.findByIdAndUpdate(syncJobId, {
    current_step: `Categorizing ${toInsert.length} new transactions...`,
    transactions_skipped: skipped,
  });

  // Step 2: Batch categorization
  const categorized = toInsert.length > 0 ? await categorizeBatch(toInsert) : [];

  await SyncJob.findByIdAndUpdate(syncJobId, {
    current_step: `Saving ${categorized.length} transactions...`,
  });

  // Step 3: Bulk insert
  let imported = 0;
  if (categorized.length > 0) {
    const result = await Transaction.insertMany(categorized, { ordered: false });
    imported = result.length;
  }

  // Step 4: Update DataSource + SyncJob
  const now = new Date();

  await DataSource.findByIdAndUpdate(dataSourceId, {
    last_sync_at: now,
    status: 'connected',
    $inc: { transactions_count: imported },
  });

  await SyncJob.findByIdAndUpdate(syncJobId, {
    status: 'completed',
    transactions_imported: imported,
    transactions_skipped: skipped,
    completed_at: now,
    current_step: `Done — ${imported} imported, ${skipped} skipped`,
  });

  logger.info({ syncJobId, imported, skipped }, 'Import pipeline completed');

  return { imported, skipped };
}

/**
 * Creates a new SyncJob record in the DB and returns it.
 * @param {string|import('mongoose').Types.ObjectId} userId
 * @param {string|import('mongoose').Types.ObjectId} dataSourceId
 * @returns {Promise<import('mongoose').Document>}
 */
async function createSyncJob(userId, dataSourceId) {
  const job = await SyncJob.create({
    user_id: userId,
    data_source_id: dataSourceId,
    status: 'pending',
    current_step: 'Queued — waiting to start...',
  });

  await DataSource.findByIdAndUpdate(dataSourceId, { status: 'syncing' });

  return job;
}

/**
 * Marks a sync job as failed with an error message.
 * @param {string|import('mongoose').Types.ObjectId} syncJobId
 * @param {string|import('mongoose').Types.ObjectId} dataSourceId
 * @param {string} errorMessage
 */
async function failSyncJob(syncJobId, dataSourceId, errorMessage) {
  await SyncJob.findByIdAndUpdate(syncJobId, {
    status: 'failed',
    error_message: errorMessage,
    completed_at: new Date(),
    current_step: 'Failed',
  });

  await DataSource.findByIdAndUpdate(dataSourceId, { status: 'error' });
  logger.error({ syncJobId, errorMessage }, 'Sync job failed');
}

module.exports = {
  runImportPipeline,
  createSyncJob,
  failSyncJob,
  categorizeBatch,
};
