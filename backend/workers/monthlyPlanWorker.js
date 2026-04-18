const { Worker } = require('bullmq');
const User = require('../models/User');
const Goal = require('../models/Goal');
const Insight = require('../models/Insight');
const Alert = require('../models/Alert');
const Transaction = require('../models/Transaction');
const Subscription = require('../models/Subscription');
const { MONTHLY_PLAN_QUEUE_NAME } = require('../queues/monthlyPlanQueue');
const { bullConnection } = require('../lib/redis');
const aiService = require('../services/aiService');
const logger = require('../lib/logger');
const { pushAlertToUser } = require('../services/socketService');

/**
 * Builds a compact financial context for monthly plan generation.
 */
async function buildMonthlyPlanningContext(userId) {
  const since = new Date();
  since.setMonth(since.getMonth() - 3);

  const txSummary = await Transaction.aggregate([
    {
      $match: {
        user_id: userId,
        date: { $gte: since },
      },
    },
    {
      $group: {
        _id: '$category',
        total: { $sum: '$amount' },
      },
    },
    {
      $sort: {
        total: -1,
      },
    },
  ]);

  const goals = await Goal.find({ user_id: userId, deleted_at: null })
    .select('name target_amount current_amount deadline feasibility_score status')
    .sort({ feasibility_score: 1 })
    .lean();

  const subscriptions = await Subscription.find({ user_id: userId, is_dismissed: false })
    .select('merchant amount frequency annual_cost next_predicted_date')
    .sort({ annual_cost: -1 })
    .lean();

  return {
    top_categories: txSummary.slice(0, 8).map((row) => ({
      category: row._id || 'Other',
      total: Number(row.total || 0),
    })),
    goals,
    subscriptions,
  };
}

/**
 * Creates or refreshes a monthly plan insight and notification alert.
 */
async function generateMonthlyPlanForUser(user) {
  const context = await buildMonthlyPlanningContext(user._id);

  let cfoAnswer = '';
  try {
    const cfo = await aiService.cfoAnalysis({
      message: 'Generate a monthly budget plan with top actions for this user.',
      financial_context: {
        income: user.income,
        monthly_budget: user.monthly_budget,
        category_budgets: user.category_budgets,
        ...context,
      },
    });
    cfoAnswer = String(cfo?.answer || '').trim();
  } catch (error) {
    cfoAnswer = '';
  }

  const planText = cfoAnswer || 'Focus this month on protecting essentials, capping discretionary categories, and automating goal contributions.';

  const insight = await Insight.create({
    user_id: user._id,
    health_score: 0,
    risk_level: 'medium',
    risk_factors: ['Monthly plan generated from the previous 3 months of spending behavior.'],
    recommendations: [],
    forecast: [],
    category_summary: {},
    category_breaches: [],
    monthly_spend: 0,
    monthly_budget: Number(user.monthly_budget || 0),
    overspend_amount: 0,
    savings_rate: 0,
    top_category: 'Other',
    insight_type: 'monthly_plan',
    monthly_plan: {
      generated_at: new Date(),
      text: planText,
      context,
    },
    generated_at: new Date(),
  });

  const alert = await Alert.create({
    user_id: user._id,
    type: 'nudge',
    severity: 'high',
    title: 'Your monthly financial plan is ready',
    message: planText,
    triggered_at: new Date(),
  });

  await pushAlertToUser(user._id, alert);

  return insight;
}

const monthlyPlanWorker = new Worker(
  MONTHLY_PLAN_QUEUE_NAME,
  async (job) => {
    logger.info({ jobId: job.id }, 'Monthly plan job started');

    const activeSince = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));
    const users = await User.find({ last_login_at: { $gte: activeSince } })
      .select('_id income monthly_budget category_budgets')
      .lean();

    let generated = 0;
    for (const user of users) {
      await generateMonthlyPlanForUser(user);
      generated += 1;
    }

    logger.info({ jobId: job.id, generated, userCount: users.length }, 'Monthly plan job completed');

    return {
      generated,
      userCount: users.length,
    };
  },
  {
    connection: bullConnection,
    concurrency: 1,
  }
);

monthlyPlanWorker.on('failed', (job, error) => {
  logger.error({ jobId: job?.id, error }, 'Monthly plan job failed');
});

module.exports = {
  monthlyPlanWorker,
  generateMonthlyPlanForUser,
};
