const { Queue } = require('bullmq');
const { bullConnection } = require('../lib/redis');

const PROACTIVE_ALERT_QUEUE_NAME = 'proactive-alerts';

const proactiveAlertQueue = new Queue(PROACTIVE_ALERT_QUEUE_NAME, {
  connection: bullConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 50,
    removeOnFail: 50,
  },
});

module.exports = {
  PROACTIVE_ALERT_QUEUE_NAME,
  proactiveAlertQueue,
};
