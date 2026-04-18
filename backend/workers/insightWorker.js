const { Worker } = require('bullmq');
const { INSIGHT_QUEUE_NAME } = require('../queues/insightQueue');
const { bullConnection } = require('../lib/redis');
const logger = require('../lib/logger');
const { refreshUserInsight } = require('./insightJobProcessor');

const insightWorker = new Worker(
  INSIGHT_QUEUE_NAME,
  async (job) => {
    const { userId, triggeredBy = 'manual' } = job.data;

    logger.info({ jobId: job.id, userId, triggeredBy }, 'Insight job started');

    const result = await refreshUserInsight(userId, triggeredBy);

    logger.info(
      {
        jobId: job.id,
        userId,
        alertsGenerated: result.alertsGenerated,
      },
      'Insight job completed'
    );

    return result;
  },
  {
    connection: bullConnection,
    concurrency: 2,
  }
);

insightWorker.on('failed', (job, error) => {
  logger.error({ jobId: job?.id, error }, 'Insight job failed');
});

module.exports = {
  insightWorker,
  refreshUserInsight,
};
