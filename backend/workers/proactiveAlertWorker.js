const { Worker } = require('bullmq');
const User = require('../models/User');
const Alert = require('../models/Alert');
const Goal = require('../models/Goal');
const Insight = require('../models/Insight');
const Subscription = require('../models/Subscription');
const Transaction = require('../models/Transaction');
const { PROACTIVE_ALERT_QUEUE_NAME } = require('../queues/proactiveAlertQueue');
const { bullConnection } = require('../lib/redis');
const { pushAlertToUser } = require('../services/socketService');
const logger = require('../lib/logger');

/**
 * Creates an alert if a similar one was not created recently.
 */
async function createAlertIfNotRecent(userId, payload, hoursWindow = 12) {
  const windowStart = new Date(Date.now() - (hoursWindow * 60 * 60 * 1000));

  const existing = await Alert.findOne({
    user_id: userId,
    type: payload.type,
    title: payload.title,
    triggered_at: { $gte: windowStart },
  }).lean();

  if (existing) {
    return null;
  }

  const alert = await Alert.create({
    user_id: userId,
    ...payload,
    triggered_at: new Date(),
  });

  await pushAlertToUser(userId, alert);
  return alert;
}

/**
 * Checks one user and creates proactive alerts when needed.
 */
async function evaluateUserForProactiveAlerts(user) {
  let created = 0;

  const latestInsight = await Insight.findOne({ user_id: user._id, insight_type: 'analysis' })
    .sort({ generated_at: -1 })
    .lean();

  if (latestInsight) {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const expectedPaceBudget = user.monthly_budget > 0
      ? (Math.max(now.getDate(), 1) / daysInMonth) * user.monthly_budget
      : 0;

    if (expectedPaceBudget > 0 && Number(latestInsight.monthly_spend || 0) > expectedPaceBudget * 1.15) {
      const alert = await createAlertIfNotRecent(user._id, {
        type: 'overspend_pace',
        severity: 'high',
        title: 'Proactive alert: spending pace is high',
        message: `You are spending faster than plan this month. Spent Rs ${Math.round(latestInsight.monthly_spend || 0)} vs expected Rs ${Math.round(expectedPaceBudget)} by now.`,
      });
      if (alert) {
        created += 1;
      }
    }
  }

  const nextThreeDays = new Date(Date.now() + (3 * 24 * 60 * 60 * 1000));
  const upcomingCharges = await Subscription.find({
    user_id: user._id,
    is_dismissed: false,
    next_predicted_date: {
      $gte: new Date(),
      $lte: nextThreeDays,
    },
  })
    .sort({ next_predicted_date: 1 })
    .limit(3)
    .lean();

  if (upcomingCharges.length > 0) {
    const details = upcomingCharges
      .map((item) => `${item.merchant} (Rs ${Math.round(item.amount || 0)})`)
      .join(', ');

    const alert = await createAlertIfNotRecent(user._id, {
      type: 'nudge',
      severity: 'medium',
      title: 'Upcoming subscription charges',
      message: `You have ${upcomingCharges.length} recurring charge(s) due in the next 3 days: ${details}.`,
    });

    if (alert) {
      created += 1;
    }
  }

  const atRiskGoals = await Goal.find({
    user_id: user._id,
    deleted_at: null,
    status: 'active',
    feasibility_score: { $lt: 40 },
  })
    .sort({ feasibility_score: 1 })
    .limit(2)
    .lean();

  if (atRiskGoals.length > 0) {
    const goalNames = atRiskGoals.map((goal) => goal.name).join(', ');
    const alert = await createAlertIfNotRecent(user._id, {
      type: 'risk_level',
      severity: 'high',
      title: 'Goal at risk',
      message: `Some goals need attention: ${goalNames}. Consider adjusting deadline or monthly contribution.`,
    });

    if (alert) {
      created += 1;
    }
  }

  const anomalyWindow = new Date(Date.now() - (24 * 60 * 60 * 1000));
  const anomalyCount = await Transaction.countDocuments({
    user_id: user._id,
    is_anomaly: true,
    date: { $gte: anomalyWindow },
  });

  if (anomalyCount > 0) {
    const alert = await createAlertIfNotRecent(user._id, {
      type: 'anomaly',
      severity: 'medium',
      title: 'New unusual transactions detected',
      message: `We noticed ${anomalyCount} unusual transaction(s) in the last 24 hours. Please review them.`,
    }, 24);

    if (alert) {
      created += 1;
    }
  }

  return created;
}

const proactiveAlertWorker = new Worker(
  PROACTIVE_ALERT_QUEUE_NAME,
  async (job) => {
    logger.info({ jobId: job.id }, 'Proactive alert job started');

    const activeSince = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));
    const users = await User.find({ last_login_at: { $gte: activeSince } })
      .select('_id monthly_budget')
      .lean();

    let createdAlerts = 0;
    for (const user of users) {
      createdAlerts += await evaluateUserForProactiveAlerts(user);
    }

    logger.info({ jobId: job.id, userCount: users.length, createdAlerts }, 'Proactive alert job completed');

    return {
      userCount: users.length,
      createdAlerts,
    };
  },
  {
    connection: bullConnection,
    concurrency: 1,
  }
);

proactiveAlertWorker.on('failed', (job, error) => {
  logger.error({ jobId: job?.id, error }, 'Proactive alert job failed');
});

module.exports = {
  proactiveAlertWorker,
  evaluateUserForProactiveAlerts,
};
