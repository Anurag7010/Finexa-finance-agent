const { Worker } = require('bullmq');
const mongoose = require('mongoose');
const config = require('../config/env');
const logger = require('../lib/logger');
const { runImportPipeline, failSyncJob } = require('../services/syncService');
const { transformAaTransaction, fetchAaData } = require('../services/connectors/accountAggregator');

/**
 * BullMQ worker that processes sync jobs from the 'data-sync' queue.
 *
 * Job payload shape:
 * {
 *   syncJobId: string,
 *   dataSourceId: string,
 *   userId: string,
 *   connectorType: 'account_aggregator' | 'upi_gpay' | 'upi_phonepe',
 *   metadata: object   // connector-specific params (consent_id, etc.)
 * }
 */
const syncWorker = new Worker(
  'data-sync',
  async (job) => {
    const { syncJobId, dataSourceId, userId, connectorType, metadata } = job.data;

    logger.info({ syncJobId, connectorType, jobId: job.id }, 'Sync worker picked up job');

    try {
      let rawTransactions = [];

      if (connectorType === 'account_aggregator') {
        const { consent_id, count = 15 } = metadata;
        const aaData = fetchAaData(consent_id, count);
        rawTransactions = aaData.transactions.map((t) =>
          transformAaTransaction(t, userId, dataSourceId)
        );
      } else if (connectorType === 'upi_gpay' || connectorType === 'upi_phonepe') {
        // UPI transactions are pushed via webhook one at a time — nothing to batch-fetch
        rawTransactions = [];
      }

      const result = await runImportPipeline({
        userId,
        dataSourceId,
        syncJobId,
        rawTransactions,
      });

      logger.info({ syncJobId, ...result }, 'Sync worker job completed');
      return result;
    } catch (err) {
      logger.error({ syncJobId, err: err.message }, 'Sync worker job failed');
      await failSyncJob(syncJobId, dataSourceId, err.message);
      throw err;
    }
  },
  {
    connection: { url: config.redisUrl },
    concurrency: 2,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 50,
      removeOnFail: 25,
    },
  }
);

syncWorker.on('completed', (job, result) => {
  logger.info({ jobId: job.id, result }, 'Sync job completed');
});

syncWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err: err.message }, 'Sync job failed in worker');
});

module.exports = syncWorker;
