const { Queue, QueueEvents } = require('bullmq');
const logger = require('../lib/logger');
const { bullConnection } = require('../lib/redis');

const INSIGHT_QUEUE_NAME = 'insight-refresh';

const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000,
  },
  removeOnComplete: 100,
  removeOnFail: 50,
};

const insightQueue = new Queue(INSIGHT_QUEUE_NAME, {
  connection: bullConnection,
  defaultJobOptions,
});

const insightQueueEvents = new QueueEvents(INSIGHT_QUEUE_NAME, {
  connection: bullConnection,
});

insightQueueEvents.on('error', (error) => {
  logger.error({ error }, 'Insight queue events error');
});

/**
 * Enqueues an insight refresh job for a single user.
 */
async function enqueueInsightRefreshJob(data, options = {}) {
  return insightQueue.add('refresh-user-insight', data, options);
}

module.exports = {
  INSIGHT_QUEUE_NAME,
  insightQueue,
  insightQueueEvents,
  enqueueInsightRefreshJob,
  defaultJobOptions,
};
