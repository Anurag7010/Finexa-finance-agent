const { Queue } = require('bullmq');
const { bullConnection } = require('../lib/redis');

const ALERT_QUEUE_NAME = 'alert-generation';

const alertQueue = new Queue(ALERT_QUEUE_NAME, {
  connection: bullConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

/**
 * Enqueues alert generation for a given user and analysis result.
 */
async function enqueueAlertGenerationJob(data, options = {}) {
  return alertQueue.add('generate-alerts', data, options);
}

module.exports = {
  ALERT_QUEUE_NAME,
  alertQueue,
  enqueueAlertGenerationJob,
};
