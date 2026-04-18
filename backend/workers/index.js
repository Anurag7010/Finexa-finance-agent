require('dotenv').config();

const mongoose = require('mongoose');
const User = require('../models/User');
const logger = require('../lib/logger');
const config = require('../config/env');
const { insightQueue } = require('../queues/insightQueue');
const { proactiveAlertQueue } = require('../queues/proactiveAlertQueue');
const { monthlyPlanQueue } = require('../queues/monthlyPlanQueue');
const { insightWorker } = require('./insightWorker');
const { alertWorker } = require('./alertWorker');
const { proactiveAlertWorker } = require('./proactiveAlertWorker');
const { monthlyPlanWorker } = require('./monthlyPlanWorker');
const syncWorker = require('./syncWorker');

/**
 * Schedules recurring insight refresh jobs for all users every 6 hours.
 */
async function scheduleRecurringInsightJobs() {
  const users = await User.find({}).select('_id').lean();

  await Promise.all(
    users.map((user) =>
      insightQueue.add(
        'refresh-user-insight',
        {
          userId: String(user._id),
          triggeredBy: 'scheduled',
        },
        {
          jobId: `scheduled:${String(user._id)}`,
          repeat: {
            every: 6 * 60 * 60 * 1000,
          },
        }
      )
    )
  );

  logger.info({ userCount: users.length }, 'Scheduled recurring insight jobs');
}

/**
 * Schedules proactive alert scans for active users.
 */
async function scheduleProactiveAlertJobs() {
  await proactiveAlertQueue.add(
    'proactive-scan-all-users',
    {},
    {
      jobId: 'proactive:global',
      repeat: {
        every: 6 * 60 * 60 * 1000,
      },
    }
  );

  logger.info('Scheduled recurring proactive alert jobs');
}

/**
 * Schedules monthly planning jobs on first day of month at 9:00 AM IST.
 */
async function scheduleMonthlyPlanJobs() {
  await monthlyPlanQueue.add(
    'monthly-plan-all-users',
    {},
    {
      jobId: 'monthly-plan:global',
      repeat: {
        pattern: '0 9 1 * *',
        tz: 'Asia/Kolkata',
      },
    }
  );

  logger.info('Scheduled recurring monthly plan jobs');
}

/**
 * Starts workers and wiring required resources.
 */
async function startWorkers() {
  await mongoose.connect(config.mongodbUri);
  logger.info('Workers connected to MongoDB');

  await scheduleRecurringInsightJobs();
  await scheduleProactiveAlertJobs();
  await scheduleMonthlyPlanJobs();

  logger.info('Insight, alert, proactive, monthly-plan, and sync workers are running');
}

/**
 * Gracefully shuts down worker process resources.
 */
async function shutdown() {
  logger.info('Shutting down workers');
  await Promise.all([
    insightWorker.close(),
    alertWorker.close(),
    proactiveAlertWorker.close(),
    monthlyPlanWorker.close(),
    syncWorker.close(),
    insightQueue.close(),
    proactiveAlertQueue.close(),
    monthlyPlanQueue.close(),
  ]);
  await mongoose.connection.close();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

startWorkers().catch((error) => {
  logger.error({ error }, 'Workers failed to start');
  process.exit(1);
});
