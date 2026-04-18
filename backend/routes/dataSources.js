const express = require('express');
const authMiddleware = require('../middleware/auth');
const DataSource = require('../models/DataSource');
const SyncJob = require('../models/SyncJob');
const { initiateConsent, getConsentStatus, fetchAaData, transformAaTransaction } = require('../services/connectors/accountAggregator');
const { connectProvider } = require('../services/connectors/upiConnector');
const { createSyncJob, runImportPipeline, failSyncJob } = require('../services/syncService');
const logger = require('../lib/logger');

const router = express.Router();

/**
 * GET /api/datasources
 * Returns all connected data sources for the authenticated user.
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const sources = await DataSource.find({ user_id: req.user.id })
      .sort({ createdAt: 1 })
      .lean();

    return res.json({ sources });
  } catch (err) {
    logger.error({ err: err.message, userId: req.user.id }, 'Failed to list data sources');
    return res.status(500).json({ error: 'Failed to list data sources' });
  }
});

/**
 * POST /api/datasources/connect
 * Register a new data source connection (type-driven).
 */
router.post('/connect', authMiddleware, async (req, res) => {
  try {
    const { type, account_name, bank_name, metadata } = req.body;

    if (!type) {
      return res.status(400).json({ error: 'type is required' });
    }

    const allowed = ['account_aggregator', 'upi_gpay', 'upi_phonepe', 'manual'];
    if (!allowed.includes(type)) {
      return res.status(400).json({ error: `Unknown connector type: ${type}` });
    }

    const source = await DataSource.create({
      user_id: req.user.id,
      type,
      account_name: account_name || type,
      bank_name: bank_name || null,
      metadata: metadata || {},
      status: 'connected',
    });

    logger.info({ userId: req.user.id, type, sourceId: source._id }, 'Data source connected');
    return res.status(201).json({ source });
  } catch (err) {
    logger.error({ err: err.message }, 'Failed to connect data source');
    return res.status(500).json({ error: 'Failed to connect data source' });
  }
});

/**
 * DELETE /api/datasources/:id
 * Disconnect a data source. The seed source is non-deletable.
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const source = await DataSource.findOne({
      _id: req.params.id,
      user_id: req.user.id,
    }).lean();

    if (!source) {
      return res.status(404).json({ error: 'Data source not found' });
    }

    if (source.type === 'seed') {
      return res.status(403).json({ error: 'Seed data source cannot be disconnected' });
    }

    await DataSource.findByIdAndDelete(req.params.id);
    logger.info({ sourceId: req.params.id, userId: req.user.id }, 'Data source disconnected');
    return res.json({ message: 'Data source disconnected' });
  } catch (err) {
    logger.error({ err: err.message }, 'Failed to delete data source');
    return res.status(500).json({ error: 'Failed to delete data source' });
  }
});

// ─── Account Aggregator sub-routes ───────────────────────────────────────────

/**
 * POST /api/datasources/aa/initiate-consent
 * Starts the AA consent flow — returns consent_id and mock redirect URL.
 */
router.post('/aa/initiate-consent', authMiddleware, async (req, res) => {
  try {
    const result = initiateConsent(req.user.id);
    return res.json(result);
  } catch (err) {
    logger.error({ err: err.message }, 'AA consent initiation failed');
    return res.status(500).json({ error: 'Failed to initiate AA consent' });
  }
});

/**
 * GET /api/datasources/aa/consent-status/:id
 * Poll consent status — returns 'pending' initially, then 'approved' after 3s.
 */
router.get('/aa/consent-status/:id', authMiddleware, async (req, res) => {
  try {
    const status = getConsentStatus(req.params.id);
    return res.json(status);
  } catch (err) {
    logger.error({ err: err.message }, 'AA consent status check failed');
    return res.status(500).json({ error: 'Failed to check consent status' });
  }
});

/**
 * POST /api/datasources/aa/fetch-data
 * Fetches AA mock data, deduplicates, categorizes, and inserts into DB.
 * Expects: { consent_id, data_source_id? }
 */
router.post('/aa/fetch-data', authMiddleware, async (req, res) => {
  const { consent_id, data_source_id } = req.body;

  if (!consent_id) {
    return res.status(400).json({ error: 'consent_id is required' });
  }

  let dataSourceId = data_source_id;

  try {
    // Fetch AA transactions
    const aaData = fetchAaData(consent_id, 15);

    // Create or find a DataSource record for this AA connection
    if (!dataSourceId) {
      const source = await DataSource.create({
        user_id: req.user.id,
        type: 'account_aggregator',
        account_name: `${aaData.bank_name} Account`,
        bank_name: aaData.bank_name,
        masked_account_number: aaData.account_number,
        status: 'syncing',
        metadata: { consent_id },
      });
      dataSourceId = source._id;
    }

    const syncJob = await createSyncJob(req.user.id, dataSourceId);

    // Transform AA format → internal format
    const rawTransactions = aaData.transactions.map((t) =>
      transformAaTransaction(t, req.user.id, dataSourceId)
    );

    // Run import pipeline (blocking — kept sync for direct endpoint)
    const result = await runImportPipeline({
      userId: req.user.id,
      dataSourceId,
      syncJobId: syncJob._id,
      rawTransactions,
    });

    logger.info({ userId: req.user.id, consent_id, ...result }, 'AA data import complete');

    return res.json({
      data_source_id: dataSourceId,
      sync_job_id: syncJob._id,
      bank_name: aaData.bank_name,
      account_number: aaData.account_number,
      ...result,
    });
  } catch (err) {
    logger.error({ err: err.message, consent_id }, 'AA data fetch failed');
    return res.status(400).json({ error: err.message });
  }
});

// ─── UPI sub-routes ───────────────────────────────────────────────────────────

/**
 * GET /api/datasources/upi/connect?provider=gpay|phonepe
 * Simulates UPI OAuth connect and creates a DataSource record.
 */
router.get('/upi/connect', authMiddleware, async (req, res) => {
  const provider = req.query.provider;

  if (!provider || !['gpay', 'phonepe'].includes(provider)) {
    return res.status(400).json({ error: 'provider must be gpay or phonepe' });
  }

  try {
    const result = connectProvider(provider);
    const type = provider === 'gpay' ? 'upi_gpay' : 'upi_phonepe';

    // Upsert: avoid duplicate sources for same provider
    const existing = await DataSource.findOne({ user_id: req.user.id, type }).lean();

    if (existing) {
      return res.json({
        message: 'Already connected',
        source: existing,
        ...result,
      });
    }

    const source = await DataSource.create({
      user_id: req.user.id,
      type,
      account_name: `${result.provider_name} — ${result.vpa}`,
      bank_name: result.bank_name,
      masked_account_number: result.masked_account,
      metadata: { vpa: result.vpa },
      status: 'connected',
    });

    logger.info({ userId: req.user.id, provider, sourceId: source._id }, 'UPI source connected');
    return res.json({ source, ...result });
  } catch (err) {
    logger.error({ err: err.message, provider }, 'UPI connect failed');
    return res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/datasources/upi/webhook
 * Accepts a UPI transaction push and immediately imports it.
 * This is the live demo endpoint — calling it makes a transaction appear within 5s via Socket.io.
 *
 * Body: { provider, payeeName, payeeVpa, amount, transactionId, timestamp }
 */
router.post('/upi/webhook', authMiddleware, async (req, res) => {
  const { provider = 'gpay', payeeName, payeeVpa, amount, transactionId, timestamp } = req.body;

  if (!amount || Number(amount) <= 0) {
    return res.status(400).json({ error: 'amount is required and must be positive' });
  }

  try {
    const { transformUpiTransaction } = require('../services/connectors/upiConnector');
    const type = provider === 'phonepe' ? 'upi_phonepe' : 'upi_gpay';

    // Find or create a DataSource for this UPI provider
    let source = await DataSource.findOne({ user_id: req.user.id, type });
    if (!source) {
      source = await DataSource.create({
        user_id: req.user.id,
        type,
        account_name: `${provider === 'phonepe' ? 'PhonePe' : 'Google Pay'} UPI`,
        bank_name: provider === 'phonepe' ? 'PhonePe UPI' : 'Google Pay UPI',
        status: 'connected',
        metadata: {},
      });
    }

    const syncJob = await createSyncJob(req.user.id, source._id);

    const txn = transformUpiTransaction(
      { payeeName, payeeVpa, amount, transactionId, timestamp },
      req.user.id,
      provider
    );

    const result = await runImportPipeline({
      userId: req.user.id,
      dataSourceId: source._id,
      syncJobId: syncJob._id,
      rawTransactions: [txn],
    });

    // Publish to Redis pub/sub so Socket.io pushes this to the browser
    try {
      const { redisPublisher } = require('../lib/redis');
      await redisPublisher.publish(
        `transaction:${req.user.id}`,
        JSON.stringify({ type: 'new_transaction', transaction: txn, source: type })
      );
    } catch (pubErr) {
      logger.warn({ pubErr: pubErr.message }, 'Redis pub failed for UPI transaction — continuing');
    }

    logger.info({ userId: req.user.id, provider, ...result }, 'UPI webhook transaction imported');
    return res.json({ sync_job_id: syncJob._id, ...result });
  } catch (err) {
    logger.error({ err: err.message }, 'UPI webhook import failed');
    return res.status(500).json({ error: 'Failed to import UPI transaction' });
  }
});

module.exports = router;
