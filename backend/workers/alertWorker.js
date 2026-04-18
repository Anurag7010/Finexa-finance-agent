const { Worker } = require('bullmq');
const User = require('../models/User');
const Alert = require('../models/Alert');
const { pushAlertToUser } = require('../services/socketService');
const { buildAlerts } = require('../services/alertBuilder');
const { ALERT_QUEUE_NAME } = require('../queues/alertQueue');
const { bullConnection } = require('../lib/redis');
const logger = require('../lib/logger');

/**
 * Builds and stores alerts from an analysis payload.
 */
async function generateAlertsFromAnalysis(userId, analysisResult) {
  const user = await User.findById(userId).select('monthly_budget');

  if (!user) {
    throw new Error(`User ${userId} not found`);
  }

  const alertsToCreate = buildAlerts(userId, analysisResult, user);
  if (alertsToCreate.length === 0) {
    return { alertsGenerated: 0 };
  }

  const savedAlerts = await Alert.insertMany(alertsToCreate);
  await Promise.all(savedAlerts.map((alert) => pushAlertToUser(userId, alert)));

  return { alertsGenerated: savedAlerts.length };
}

const alertWorker = new Worker(
  ALERT_QUEUE_NAME,
  async (job) => {
    const { userId, analysisResult } = job.data;

    logger.info({ jobId: job.id, userId }, 'Alert generation job started');

    const result = await generateAlertsFromAnalysis(userId, analysisResult || {});

    logger.info({ jobId: job.id, userId, ...result }, 'Alert generation job completed');

    return result;
  },
  {
    connection: bullConnection,
  }
);

alertWorker.on('failed', (job, error) => {
  logger.error({ jobId: job?.id, error }, 'Alert generation job failed');
});

module.exports = {
  alertWorker,
  generateAlertsFromAnalysis,
};
