const express = require('express');
const User = require('../models/User');
const Insight = require('../models/Insight');
const authMiddleware = require('../middleware/auth');
const logger = require('../lib/logger');
const { insightsRefreshRateLimiter } = require('../middleware/rateLimiter');
const { enqueueInsightRefreshJob, insightQueueEvents } = require('../queues/insightQueue');
const { refreshUserInsight } = require('../workers/insightJobProcessor');

const router = express.Router();

router.use(authMiddleware);

/**
 * Waits briefly for worker completion and returns null when still processing.
 */
async function waitForJobResult(job, timeoutMs) {
  try {
    return await job.waitUntilFinished(insightQueueEvents, timeoutMs);
  } catch (error) {
    logger.info({ jobId: job.id, timeoutMs }, 'Insight job still processing');
    return null;
  }
}

router.get('/', async (req, res) => {
  try {
    const insight = await Insight.findOne({ user_id: req.user.id }).sort({ generated_at: -1 });

    if (!insight) {
      return res.status(404).json({ error: 'No insights found' });
    }

    return res.json({ insight });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch insights' });
  }
});

router.post('/refresh', insightsRefreshRateLimiter, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('_id');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const job = await enqueueInsightRefreshJob({
      userId: String(req.user.id),
      triggeredBy: 'manual',
    });

    const completedResult = await waitForJobResult(job, 5000);

    if (completedResult?.insight) {
      return res.status(202).json({
        insight: completedResult.insight,
        alerts_generated: Number(completedResult.alertsGenerated || 0),
        queued: true,
        jobId: job.id,
      });
    }

    const latestInsight = await Insight.findOne({ user_id: req.user.id }).sort({ generated_at: -1 });

    if (!latestInsight) {
      const bootstrapResult = await refreshUserInsight(String(req.user.id), 'bootstrap-fallback');
      return res.status(202).json({
        insight: bootstrapResult.insight,
        alerts_generated: Number(bootstrapResult.alertsGenerated || 0),
        queued: true,
        jobId: job.id,
        bootstrapFallback: true,
      });
    }

    return res.status(202).json({
      insight: latestInsight,
      alerts_generated: 0,
      queued: true,
      jobId: job.id,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to enqueue insight refresh');
    return res.status(500).json({ error: 'Failed to refresh insights' });
  }
});

router.get('/forecast', async (req, res) => {
  try {
    const insight = await Insight.findOne({ user_id: req.user.id }).sort({ generated_at: -1 });

    if (!insight) {
      return res.status(404).json({ error: 'No insights found' });
    }

    return res.json({ forecast: insight.forecast || [] });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch forecast' });
  }
});

module.exports = router;
