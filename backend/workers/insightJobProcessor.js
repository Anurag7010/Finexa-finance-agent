const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Insight = require('../models/Insight');
const Alert = require('../models/Alert');
const { analyze } = require('../services/aiService');
const { pushAlertToUser, pushInsightUpdate } = require('../services/socketService');
const { buildAlerts } = require('../services/alertBuilder');

/**
 * Runs an end-to-end insight refresh cycle for a specific user.
 */
async function refreshUserInsight(userId, triggeredBy) {
  const user = await User.findById(userId).select('income monthly_budget category_budgets');

  if (!user) {
    throw new Error(`User ${userId} not found`);
  }

  const since = new Date();
  since.setDate(since.getDate() - 90);

  const transactions = await Transaction.find({
    user_id: userId,
    date: { $gte: since },
  }).sort({ date: 1 });

  const analysis = await analyze(userId, transactions, user);

  const insight = await Insight.create({
    user_id: userId,
    ...analysis,
    generated_at: new Date(),
  });

  const alertsToCreate = buildAlerts(userId, analysis, user);
  let savedAlerts = [];

  if (alertsToCreate.length > 0) {
    savedAlerts = await Alert.insertMany(alertsToCreate);
    await Promise.all(savedAlerts.map((alert) => pushAlertToUser(userId, alert)));
  }

  await pushInsightUpdate(userId, insight);

  return {
    insight: insight.toObject(),
    alertsGenerated: savedAlerts.length,
    triggeredBy,
  };
}

module.exports = {
  refreshUserInsight,
};
