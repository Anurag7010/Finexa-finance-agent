const express = require('express');
const Goal = require('../models/Goal');
const User = require('../models/User');
const Insight = require('../models/Insight');
const Transaction = require('../models/Transaction');
const authMiddleware = require('../middleware/auth');
const aiService = require('../services/aiService');
const logger = require('../lib/logger');
const {
  computeGoalFeasibility,
  deriveGoalStatus,
  buildGoalProjection,
} = require('../services/goalEngine');

const router = express.Router();
const ALLOWED_GOAL_CATEGORIES = new Set(['emergency', 'vacation', 'device', 'custom']);

router.use(authMiddleware);

/**
 * Returns month-to-date spend for the user.
 */
async function getCurrentMonthlySpend(userId) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const rows = await Transaction.aggregate([
    {
      $match: {
        user_id: userId,
        date: { $gte: startOfMonth },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' },
      },
    },
  ]);

  return Number(rows[0]?.total || 0);
}

/**
 * Converts a goal document to API response format.
 */
function serializeGoal(goalDoc) {
  const goal = goalDoc.toObject ? goalDoc.toObject() : goalDoc;
  const target = Number(goal.target_amount || 0);
  const current = Number(goal.current_amount || 0);
  const progressPct = target > 0 ? Math.round((Math.min(current, target) / target) * 100) : 0;

  return {
    ...goal,
    progress_pct: progressPct,
    remaining_amount: Math.max(target - current, 0),
  };
}

/**
 * Builds a deterministic goal plan summary when AI output is unavailable.
 */
function buildLocalGoalPlan({ name, targetAmount, currentAmount, deadline, monthlyContribution }) {
  const safeName = String(name || 'your goal');
  const safeMonthly = Number(monthlyContribution || 0);
  const remainingAmount = Math.max(Number(targetAmount || 0) - Number(currentAmount || 0), 0);
  const dueDate = new Date(deadline);
  const now = new Date();
  const monthDelta = (dueDate.getFullYear() - now.getFullYear()) * 12 + (dueDate.getMonth() - now.getMonth());
  const monthsRemaining = Math.max(monthDelta + 1, 1);
  const formattedMonthly = safeMonthly.toLocaleString('en-IN', { maximumFractionDigits: 0 });

  return `To hit ${safeName}, set aside about ₹${formattedMonthly} per month for the next ${monthsRemaining} month(s). Prioritize one spending category to trim by 10-15% and automate this transfer right after salary credit.`;
}

/**
 * Computes feasibility metadata from user and goal inputs.
 */
async function computeGoalContext(user, goalInput, latestInsight) {
  const currentMonthlySpend = await getCurrentMonthlySpend(user._id);

  return computeGoalFeasibility({
    income: user.income,
    currentMonthlySpend,
    targetAmount: goalInput.target_amount,
    currentAmount: goalInput.current_amount,
    deadline: goalInput.deadline,
    riskLevel: latestInsight?.risk_level,
    hasPositiveSavingsHistory: Number(latestInsight?.savings_rate || 0) >= 0.15,
  });
}

/**
 * Recomputes and persists goal health fields when they become stale.
 */
async function refreshGoalHealth(goal, user, latestInsight) {
  const feasibility = await computeGoalContext(user, goal, latestInsight);
  const nextStatus = deriveGoalStatus({
    currentAmount: goal.current_amount,
    targetAmount: goal.target_amount,
    feasibilityScore: feasibility.feasibilityScore,
    requestedStatus: goal.status,
  });

  const hasChanges =
    Number(goal.monthly_contribution_needed || 0) !== Number(feasibility.monthlyContributionNeeded || 0) ||
    Number(goal.feasibility_score || 0) !== Number(feasibility.feasibilityScore || 0) ||
    String(goal.status) !== String(nextStatus);

  if (hasChanges) {
    goal.monthly_contribution_needed = feasibility.monthlyContributionNeeded;
    goal.feasibility_score = feasibility.feasibilityScore;
    goal.status = nextStatus;
    goal.ai_plan = buildLocalGoalPlan({
      name: goal.name,
      targetAmount: goal.target_amount,
      currentAmount: goal.current_amount,
      deadline: goal.deadline,
      monthlyContribution: feasibility.monthlyContributionNeeded,
    });
    await goal.save();
  }

  return goal;
}

router.get('/', async (req, res) => {
  try {
    const goals = await Goal.find({ user_id: req.user.id, deleted_at: null })
      .sort({ deadline: 1, createdAt: -1 });

    if (goals.length === 0) {
      return res.json({ goals: [] });
    }

    const user = await User.findById(req.user.id).select('income monthly_budget');
    const latestInsight = await Insight.findOne({
      user_id: req.user.id,
      $or: [{ insight_type: 'analysis' }, { insight_type: { $exists: false } }],
    }).sort({ generated_at: -1 });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await Promise.all(goals.map((goal) => refreshGoalHealth(goal, user, latestInsight)));

    return res.json({ goals: goals.map(serializeGoal) });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch goals');
    return res.status(500).json({ error: 'Failed to fetch goals' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, target_amount, current_amount = 0, deadline, category = 'custom' } = req.body;

    if (!name || !target_amount || !deadline) {
      return res.status(400).json({ error: 'name, target_amount and deadline are required' });
    }

    if (!ALLOWED_GOAL_CATEGORIES.has(category)) {
      return res.status(400).json({
        error: `category must be one of: ${Array.from(ALLOWED_GOAL_CATEGORIES).join(', ')}`,
      });
    }

    const user = await User.findById(req.user.id).select('income monthly_budget');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const latestInsight = await Insight.findOne({
      user_id: req.user.id,
      $or: [{ insight_type: 'analysis' }, { insight_type: { $exists: false } }],
    }).sort({ generated_at: -1 });

    const feasibility = await computeGoalContext(
      user,
      { target_amount, current_amount, deadline },
      latestInsight
    );

    const status = deriveGoalStatus({
      currentAmount: current_amount,
      targetAmount: target_amount,
      feasibilityScore: feasibility.feasibilityScore,
      requestedStatus: 'active',
    });

    let aiPlan = '';
    try {
      const aiPlanResponse = await aiService.goalPlan({
        goal: {
          name,
          target_amount,
          current_amount,
          deadline,
          category,
        },
        user: {
          income: user.income,
          monthly_budget: user.monthly_budget,
          monthly_spend: latestInsight?.monthly_spend || 0,
          risk_level: latestInsight?.risk_level || 'medium',
        },
      });
      aiPlan = String(aiPlanResponse?.plan || '').trim();
    } catch (error) {
      aiPlan = buildLocalGoalPlan({
        name,
        targetAmount: target_amount,
        currentAmount: current_amount,
        deadline,
        monthlyContribution: feasibility.monthlyContributionNeeded,
      });
    }

    const goal = await Goal.create({
      user_id: req.user.id,
      name,
      target_amount,
      current_amount,
      deadline,
      category,
      monthly_contribution_needed: feasibility.monthlyContributionNeeded,
      feasibility_score: feasibility.feasibilityScore,
      status,
      ai_plan: aiPlan,
    });

    return res.status(201).json({ goal: serializeGoal(goal) });
  } catch (error) {
    logger.error({ error }, 'Failed to create goal');
    return res.status(500).json({ error: 'Failed to create goal' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const allowedFields = ['name', 'target_amount', 'current_amount', 'deadline', 'category', 'status'];

    if (req.body.category != null && !ALLOWED_GOAL_CATEGORIES.has(req.body.category)) {
      return res.status(400).json({
        error: `category must be one of: ${Array.from(ALLOWED_GOAL_CATEGORIES).join(', ')}`,
      });
    }

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] != null) {
        updates[field] = req.body[field];
      }
    }

    const goal = await Goal.findOne({ _id: id, user_id: req.user.id, deleted_at: null });
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    Object.assign(goal, updates);

    const user = await User.findById(req.user.id).select('income monthly_budget');
    const latestInsight = await Insight.findOne({
      user_id: req.user.id,
      $or: [{ insight_type: 'analysis' }, { insight_type: { $exists: false } }],
    }).sort({ generated_at: -1 });

    const feasibility = await computeGoalContext(user, goal, latestInsight);

    goal.monthly_contribution_needed = feasibility.monthlyContributionNeeded;
    goal.feasibility_score = feasibility.feasibilityScore;
    goal.status = deriveGoalStatus({
      currentAmount: goal.current_amount,
      targetAmount: goal.target_amount,
      feasibilityScore: feasibility.feasibilityScore,
      requestedStatus: goal.status,
    });
    goal.ai_plan = buildLocalGoalPlan({
      name: goal.name,
      targetAmount: goal.target_amount,
      currentAmount: goal.current_amount,
      deadline: goal.deadline,
      monthlyContribution: feasibility.monthlyContributionNeeded,
    });

    await goal.save();

    return res.json({ goal: serializeGoal(goal) });
  } catch (error) {
    logger.error({ error }, 'Failed to update goal');
    return res.status(500).json({ error: 'Failed to update goal' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const goal = await Goal.findOne({ _id: req.params.id, user_id: req.user.id, deleted_at: null });
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    goal.deleted_at = new Date();
    goal.status = 'paused';
    await goal.save();

    return res.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Failed to delete goal');
    return res.status(500).json({ error: 'Failed to delete goal' });
  }
});

router.get('/:id/projection', async (req, res) => {
  try {
    const goal = await Goal.findOne({ _id: req.params.id, user_id: req.user.id, deleted_at: null });
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    const projection = buildGoalProjection({
      goal,
      monthlyContribution: goal.monthly_contribution_needed,
    });

    return res.json({
      goal: serializeGoal(goal),
      projection,
      ai_plan: goal.ai_plan || null,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to build goal projection');
    return res.status(500).json({ error: 'Failed to build goal projection' });
  }
});

router.post('/:id/contribute', async (req, res) => {
  try {
    const amount = Number(req.body.amount || 0);
    if (!(amount > 0)) {
      return res.status(400).json({ error: 'Contribution amount must be greater than 0' });
    }

    const goal = await Goal.findOne({ _id: req.params.id, user_id: req.user.id, deleted_at: null });
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    goal.current_amount = Number(goal.current_amount || 0) + amount;

    const user = await User.findById(req.user.id).select('income monthly_budget');
    const latestInsight = await Insight.findOne({
      user_id: req.user.id,
      $or: [{ insight_type: 'analysis' }, { insight_type: { $exists: false } }],
    }).sort({ generated_at: -1 });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const feasibility = await computeGoalContext(user, goal, latestInsight);

    goal.monthly_contribution_needed = feasibility.monthlyContributionNeeded;
    goal.feasibility_score = feasibility.feasibilityScore;
    goal.status = deriveGoalStatus({
      currentAmount: goal.current_amount,
      targetAmount: goal.target_amount,
      feasibilityScore: feasibility.feasibilityScore,
      requestedStatus: goal.status,
    });
    goal.ai_plan = buildLocalGoalPlan({
      name: goal.name,
      targetAmount: goal.target_amount,
      currentAmount: goal.current_amount,
      deadline: goal.deadline,
      monthlyContribution: feasibility.monthlyContributionNeeded,
    });

    await goal.save();

    return res.json({ goal: serializeGoal(goal) });
  } catch (error) {
    logger.error({ error }, 'Failed to log contribution');
    return res.status(500).json({ error: 'Failed to log contribution' });
  }
});

module.exports = router;
