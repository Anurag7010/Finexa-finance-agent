const express = require('express');
const authMiddleware = require('../middleware/auth');
const SyncJob = require('../models/SyncJob');
const DataSource = require('../models/DataSource');
const { Queue } = require('bullmq');
const { createSyncJob, runImportPipeline } = require('../services/syncService');
const config = require('../config/env');
const logger = require('../lib/logger');

const router = express.Router();

/** BullMQ queue reference for enqueuing async sync jobs */
const syncQueue = new Queue('data-sync', {
  connection: { url: config.redisUrl },
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 50,
    removeOnFail: 25,
  },
});

/**
 * POST /api/sync/trigger/:sourceId
 * Enqueues a sync job for the given data source.
 * For AA type: also needs consent_id in the body.
 */
router.post('/trigger/:sourceId', authMiddleware, async (req, res) => {
  const { sourceId } = req.params;

  try {
    const source = await DataSource.findOne({
      _id: sourceId,
      user_id: req.user.id,
    }).lean();

    if (!source) {
      return res.status(404).json({ error: 'Data source not found' });
    }

    if (source.type === 'seed') {
      return res.status(400).json({ error: 'Seed source does not support manual sync' });
    }

    const syncJob = await createSyncJob(req.user.id, sourceId);

    // Enqueue to BullMQ for async processing
    await syncQueue.add('sync', {
      syncJobId: syncJob._id.toString(),
      dataSourceId: sourceId,
      userId: req.user.id,
      connectorType: source.type,
      metadata: { ...source.metadata, ...(req.body.metadata || {}) },
    });

    logger.info({ sourceId, userId: req.user.id, syncJobId: syncJob._id }, 'Sync job enqueued');
    return res.json({ sync_job_id: syncJob._id, status: 'pending' });
  } catch (err) {
    logger.error({ err: err.message, sourceId }, 'Failed to trigger sync');
    return res.status(500).json({ error: 'Failed to trigger sync' });
  }
});

/**
 * GET /api/sync/status/:jobId
 * Returns current sync job status — polled every 2 seconds by the frontend.
 */
router.get('/status/:jobId', authMiddleware, async (req, res) => {
  try {
    const job = await SyncJob.findOne({
      _id: req.params.jobId,
      user_id: req.user.id,
    })
      .select('status transactions_imported transactions_skipped current_step error_message started_at completed_at')
      .lean();

    if (!job) {
      return res.status(404).json({ error: 'Sync job not found' });
    }

    return res.json({ job });
  } catch (err) {
    logger.error({ err: err.message, jobId: req.params.jobId }, 'Failed to fetch sync status');
    return res.status(500).json({ error: 'Failed to fetch sync job status' });
  }
});

/**
 * GET /api/sync/history
 * Returns the 10 most recent sync jobs for the authenticated user.
 */
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const jobs = await SyncJob.find({ user_id: req.user.id })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('data_source_id', 'account_name type bank_name')
      .lean();

    return res.json({ jobs });
  } catch (err) {
    logger.error({ err: err.message }, 'Failed to fetch sync history');
    return res.status(500).json({ error: 'Failed to fetch sync history' });
  }
});

module.exports = router;
