require('dotenv').config();

const mongoose = require('mongoose');
const User = require('../models/User');
const logger = require('../lib/logger');
const config = require('../config/env');
const { insightQueue } = require('../queues/insightQueue');
const { insightWorker } = require('./insightWorker');
const { alertWorker } = require('./alertWorker');

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
 * Starts workers and wiring required resources.
 */
async function startWorkers() {
  await mongoose.connect(config.mongodbUri);
  logger.info('Workers connected to MongoDB');

  await scheduleRecurringInsightJobs();

  logger.info('Insight and alert workers are running');
}

/**
 * Gracefully shuts down worker process resources.
 */
async function shutdown() {
  logger.info('Shutting down workers');
  await Promise.all([insightWorker.close(), alertWorker.close()]);
  await mongoose.connection.close();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

startWorkers().catch((error) => {
  logger.error({ error }, 'Workers failed to start');
  process.exit(1);
});
