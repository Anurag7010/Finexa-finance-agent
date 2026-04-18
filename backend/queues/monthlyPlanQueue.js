const { Queue } = require('bullmq');
const { bullConnection } = require('../lib/redis');

const MONTHLY_PLAN_QUEUE_NAME = 'monthly-plan';

const monthlyPlanQueue = new Queue(MONTHLY_PLAN_QUEUE_NAME, {
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
  MONTHLY_PLAN_QUEUE_NAME,
  monthlyPlanQueue,
};
