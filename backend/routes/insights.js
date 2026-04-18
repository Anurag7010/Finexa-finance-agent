const express = require('express');
const User = require('../models/User');
const Insight = require('../models/Insight');
const authMiddleware = require('../middleware/auth');
const logger = require('../lib/logger');
const { insightsRefreshRateLimiter } = require('../middleware/rateLimiter');
const { enqueueInsightRefreshJob, insightQueueEvents } = require('../queues/insightQueue');
const { refreshUserInsight } = require('../workers/insightJobProcessor');
const { redisClient } = require('../lib/redis');

const router = express.Router();

router.use(authMiddleware);

function analysisInsightFilter(userId) {
  return {
    user_id: userId,
    $or: [
      { insight_type: 'analysis' },
      { insight_type: { $exists: false } },
    ],
  };
}

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
    // Check Redis cache first (5-minute TTL)
    const cacheKey = `insights:${req.user.id}`;
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        logger.info({ userId: req.user.id }, 'Insights served from cache');
        return res.json({ insight: JSON.parse(cached), cached: true });
      }
    } catch (cacheErr) {
      logger.warn({ err: cacheErr.message }, 'Redis cache read failed — falling through to DB');
    }

    const insight = await Insight.findOne(analysisInsightFilter(req.user.id)).sort({ generated_at: -1 });

    if (!insight) {
      return res.status(404).json({ error: 'No insights found' });
    }

    // Store in cache
    try {
      await redisClient.setex(cacheKey, 300, JSON.stringify(insight));
    } catch (cacheErr) {
      logger.warn({ err: cacheErr.message }, 'Redis cache write failed — continuing without cache');
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

    const forceRefresh = String(req.query.force || req.body?.force || '').toLowerCase() === 'true';

    // Invalidate insight cache so next GET returns fresh data
    try {
      await redisClient.del(`insights:${req.user.id}`);
    } catch (cacheErr) {
      logger.warn({ err: cacheErr.message }, 'Failed to invalidate insight cache');
    }

    if (forceRefresh) {
      const forcedResult = await refreshUserInsight(String(req.user.id), 'manual-force');
      return res.json({
        insight: forcedResult.insight,
        alerts_generated: Number(forcedResult.alertsGenerated || 0),
        queued: false,
        forced: true,
      });
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

    const latestInsight = await Insight.findOne(analysisInsightFilter(req.user.id)).sort({ generated_at: -1 });

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
    const insight = await Insight.findOne(analysisInsightFilter(req.user.id)).sort({ generated_at: -1 });

    if (!insight) {
      return res.status(404).json({ error: 'No insights found' });
    }

    return res.json({ forecast: insight.forecast || [] });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch forecast' });
  }
});

router.get('/monthly-plan', async (req, res) => {
  try {
    const monthlyPlan = await Insight.findOne({
      user_id: req.user.id,
      insight_type: 'monthly_plan',
    }).sort({ generated_at: -1 });

    if (!monthlyPlan) {
      return res.status(404).json({ error: 'No monthly plan available' });
    }

    return res.json({ monthly_plan: monthlyPlan.monthly_plan, insight: monthlyPlan });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch monthly plan' });
  }
});

module.exports = router;
