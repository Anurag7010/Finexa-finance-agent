const express = require('express');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Insight = require('../models/Insight');
const Alert = require('../models/Alert');
const authMiddleware = require('../middleware/auth');
const { analyze } = require('../services/aiService');
const { pushAlertToUser, pushInsightUpdate } = require('../services/socketService');

const router = express.Router();

router.use(authMiddleware);

function buildAlerts(userId, analysis, user) {
  const alerts = [];
  const now = new Date();
  const dayOfMonth = now.getDate();
  const expectedPace = ((dayOfMonth / 30) * user.monthly_budget) * 1.15;

  if ((analysis.monthly_spend || 0) > expectedPace) {
    alerts.push({
      user_id: userId,
      type: 'overspend_pace',
      severity: 'high',
      title: 'Overspending pace detected',
      message: `Your current spend is ahead of safe pacing for this month.`,
      amount: analysis.monthly_spend,
      triggered_at: now,
    });
  }

  if (analysis.risk_level === 'high') {
    alerts.push({
      user_id: userId,
      type: 'risk_level',
      severity: 'high',
      title: 'High financial risk',
      message: `Your current financial risk level is high. Consider corrective actions now.`,
      triggered_at: now,
    });
  }

  const breaches = Array.isArray(analysis.category_breaches)
    ? analysis.category_breaches
    : [];

  for (const breach of breaches) {
    alerts.push({
      user_id: userId,
      type: 'category_breach',
      severity: 'medium',
      title: `${breach.category} budget near limit`,
      message: `You have used ${Number(breach.percentage || 0).toFixed(1)}% of your ${breach.category} budget.`,
      category: breach.category,
      amount: breach.spent,
      triggered_at: now,
    });
  }

  return alerts;
}

router.get('/', async (req, res) => {
  try {
    const insight = await Insight.findOne({ user_id: req.user.id }).sort({ generated_at: -1 });

    if (!insight) {
      return res.status(404).json({ error: 'No insights found' });
    }

    return res.json({ insight });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch insights' });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const since = new Date();
    since.setDate(since.getDate() - 90);

    const transactions = await Transaction.find({
      user_id: req.user.id,
      date: { $gte: since },
    }).sort({ date: 1 });

    const analysis = await analyze(req.user.id, transactions, user);

    const insight = await Insight.create({
      user_id: req.user.id,
      ...analysis,
      generated_at: new Date(),
    });

    const alertsToCreate = buildAlerts(req.user.id, analysis, user);
    let savedAlerts = [];

    if (alertsToCreate.length > 0) {
      savedAlerts = await Alert.insertMany(alertsToCreate);
      for (const alert of savedAlerts) {
        pushAlertToUser(req.user.id, alert);
      }
    }

    pushInsightUpdate(req.user.id, insight);

    return res.json({ insight, alerts_generated: savedAlerts.length });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to refresh insights' });
  }
});

router.get('/forecast', async (req, res) => {
  try {
    const insight = await Insight.findOne({ user_id: req.user.id }).sort({ generated_at: -1 });

    if (!insight) {
      return res.status(404).json({ error: 'No insights found' });
    }

    return res.json({ forecast: insight.forecast || [] });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch forecast' });
  }
});

module.exports = router;
