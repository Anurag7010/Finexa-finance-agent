const express = require('express');
const OpenAI = require('openai');
const mongoose = require('mongoose');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Insight = require('../models/Insight');
const ChatMessage = require('../models/ChatMessage');
const Goal = require('../models/Goal');
const Subscription = require('../models/Subscription');
const aiService = require('../services/aiService');
const authMiddleware = require('../middleware/auth');
const config = require('../config/env');
const { chatRateLimiter } = require('../middleware/rateLimiter');
const {
  retrieveRelevantMemory,
  storeMemory,
  extractMemoryCandidates,
} = require('../services/memoryService');

const router = express.Router();
const openai = config.openAiApiKey
  ? new OpenAI({ apiKey: config.openAiApiKey })
  : null;

router.use(authMiddleware);
router.use(chatRateLimiter);

const tools = [
  {
    type: 'function',
    function: {
      name: 'get_spending_summary',
      description: 'Get spending summary grouped by category for a selected time period.',
      parameters: {
        type: 'object',
        properties: {
          period: {
            type: 'string',
            enum: ['this_month', 'last_month', 'last_30_days', 'last_90_days'],
          },
        },
        required: ['period'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_balance_forecast',
      description: 'Get projected balance forecast for the next N days.',
      parameters: {
        type: 'object',
        properties: {
          days: {
            type: 'number',
            minimum: 1,
            maximum: 30,
          },
        },
        required: ['days'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_risk_score',
      description: 'Get latest risk score and key risk indicators.',
      parameters: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_anomalies',
      description: 'Get the latest unusual transactions flagged as anomalies.',
      parameters: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'simulate_scenario',
      description: 'Simulate the impact of increasing or decreasing spending in a category.',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
          },
          adjustment_pct: {
            type: 'number',
          },
        },
        required: ['category', 'adjustment_pct'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_monthly_comparison',
      description: "Compare this month's spending vs last month by category. Use when user asks about trends, changes, or 'compared to last month'.",
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_top_merchants',
      description: 'Get the top merchants by spend this month. Use when user asks where their money is going at a merchant level.',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Number of merchants to return (default 8)' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_goals_status',
      description: 'Get progress and feasibility status for the user savings goals.',
      parameters: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_subscriptions_summary',
      description: 'Get monthly and annual subscription spend along with likely wasteful subscriptions.',
      parameters: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
    },
  },
];

function getDateRange(period) {
  const now = new Date();

  if (period === 'this_month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start, end: null };
  }

  if (period === 'last_month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start, end };
  }

  if (period === 'last_90_days') {
    const start = new Date();
    start.setDate(start.getDate() - 90);
    return { start, end: null };
  }

  const start = new Date();
  start.setDate(start.getDate() - 30);
  return { start, end: null };
}

function mapCategorySpend(categorySummary, category) {
  if (!categorySummary) {
    return 0;
  }

  if (categorySummary instanceof Map) {
    return Number(categorySummary.get(category) || 0);
  }

  if (typeof categorySummary === 'object') {
    return Number(categorySummary[category] || 0);
  }

  return 0;
}

function resolveCategoryName(categorySummary, requestedCategory) {
  if (!requestedCategory) {
    return 'Other';
  }

  const requested = String(requestedCategory).trim().toLowerCase();
  const keys = categorySummary instanceof Map
    ? Array.from(categorySummary.keys())
    : Object.keys(categorySummary || {});

  const exact = keys.find((key) => key.toLowerCase() === requested);
  if (exact) {
    return exact;
  }

  const contains = keys.find((key) => key.toLowerCase().includes(requested) || requested.includes(key.toLowerCase()));
  if (contains) {
    return contains;
  }

  const aliasMap = {
    dining: 'Food & Dining',
    food: 'Food & Dining',
    grocery: 'Groceries',
    groceries: 'Groceries',
    travel: 'Transportation',
    transport: 'Transportation',
    shopping: 'Shopping',
    utility: 'Utilities',
    utilities: 'Utilities',
    entertainment: 'Entertainment',
    health: 'Health',
    rent: 'Rent',
  };

  const aliasTarget = aliasMap[requested];
  if (aliasTarget) {
    const aliasMatch = keys.find((key) => key.toLowerCase() === aliasTarget.toLowerCase());
    if (aliasMatch) {
      return aliasMatch;
    }
  }

  return String(requestedCategory);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function formatInr(value) {
  const amount = Number(value || 0);
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

function formatDate(value) {
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) {
    return 'Unknown date';
  }
  return dt.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function titleCase(value) {
  const text = String(value || 'unknown');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function topRiskFactors(latestInsight, limit = 3) {
  if (!latestInsight || !Array.isArray(latestInsight.risk_factors)) {
    return [];
  }
  return latestInsight.risk_factors
    .filter((factor) => typeof factor === 'string' && factor.trim())
    .slice(0, limit);
}

function shouldIncludeDataContext(message) {
  return /spend|budget|balance|forecast|risk|score|anomal|suspicious|category|merchant|goal|subscription|waste|save|overspend/i.test(String(message || ''));
}

async function buildCfoFallbackReply(message, userId, user, latestInsight) {
  const context = {
    income: Number(user?.income || 0),
    monthly_budget: Number(user?.monthly_budget || 0),
    monthly_spend: Number(latestInsight?.monthly_spend || 0),
    overspend_amount: Number(latestInsight?.overspend_amount || 0),
    savings_rate: Number(latestInsight?.savings_rate || 0),
    health_score: Number(latestInsight?.health_score || 0),
    risk_level: latestInsight?.risk_level || 'unknown',
    top_category: latestInsight?.top_category || 'Unknown',
    risk_factors: Array.isArray(latestInsight?.risk_factors) ? latestInsight.risk_factors : [],
  };

  try {
    if (shouldIncludeDataContext(message)) {
      const lower = String(message || '').toLowerCase();

      if (/goal|saving target|on track/.test(lower)) {
        context.goals = await executeTool('get_goals_status', {}, userId);
      }

      if (/subscription|recurr|waste/.test(lower)) {
        context.subscriptions = await executeTool('get_subscriptions_summary', {}, userId);
      }

      if (/forecast|balance|next\s+\d+\s*days?/.test(lower)) {
        context.forecast = await executeTool('get_balance_forecast', { days: 7 }, userId);
      }

      if (/anomal|suspicious|fraud|unusual/.test(lower)) {
        context.anomalies = await executeTool('get_anomalies', {}, userId);
      }

      if (/spend|budget|category|merchant|summary|risk|score|health/.test(lower)) {
        context.spending_summary = await executeTool('get_spending_summary', { period: 'this_month' }, userId);
        context.risk_snapshot = await executeTool('get_risk_score', {}, userId);
      }
    }

    const cfoResponse = await aiService.cfoAnalysis({
      message,
      financial_context: context,
    });

    if (cfoResponse?.answer && typeof cfoResponse.answer === 'string') {
      const trimmed = cfoResponse.answer.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }
  } catch (error) {
    // Fall back to deterministic response below.
  }

  return buildFallbackReply(message, userId, latestInsight);
}

async function buildFallbackReply(message, userId, latestInsight) {
  const text = String(message || '').toLowerCase();
  const asksAnomalies = /anomal|suspicious|suspect|fraud|unusual|flagged/.test(text);
  const asksForecast = /forecast|balance|projection|next\s+\d+\s*days?/.test(text);
  const asksRisk = /risk|score|health|danger/.test(text);
  const asksSummary = /spend|spent|summary|this month|category|merchant|breakdown/.test(text);

  try {
    if (asksAnomalies) {
      const anomalyData = await executeTool('get_anomalies', {}, userId);
      if (anomalyData?.count > 0) {
        const topItems = anomalyData.anomalies.slice(0, 4);
        const detailLines = topItems.map((item, idx) => (
          `${idx + 1}. ${item.merchant} - ${formatInr(item.amount)} (${item.category || 'Other'}, ${formatDate(item.date)})`
        ));

        return [
          `I identified ${anomalyData.count} potentially suspicious transaction${anomalyData.count > 1 ? 's' : ''} to review.`,
          '',
          'Top flagged items:',
          ...detailLines,
          '',
          'Recommended next steps:',
          '1. Verify these transactions in your banking app and card statement.',
          '2. If any are unauthorized, immediately raise a dispute and block the payment instrument.',
        ].join('\n');
      }

      return [
        'No suspicious transactions are currently flagged in your recent data.',
        'If you still suspect an issue, I can help you review high-value or unusual-timing transactions next.',
      ].join('\n');
    }

    if (asksForecast) {
      const forecastData = await executeTool('get_balance_forecast', { days: 7 }, userId);
      const points = Array.isArray(forecastData?.forecast) ? forecastData.forecast : [];
      if (points.length > 0) {
        const start = points[0];
        const end = points[points.length - 1];

        return [
          '7-day balance outlook:',
          `- Current projected balance: ${formatInr(start.projected_balance)}`,
          `- End-of-window projected balance: ${formatInr(end.projected_balance)}`,
          `- Net change over 7 days: ${formatInr(end.projected_balance - start.projected_balance)}`,
          '',
          'Interpretation: spending is currently trending downward on available balance. I recommend tightening discretionary spend this week.',
        ].join('\n');
      }

      return 'I could not find a recent forecast yet. Please refresh insights and try again.';
    }

    if (asksRisk) {
      const risk = await executeTool('get_risk_score', {}, userId);
      if (!risk?.error) {
        const factors = Array.isArray(risk.risk_factors) ? risk.risk_factors.slice(0, 3) : [];
        const factorLines = factors.length > 0
          ? factors.map((factor, idx) => `${idx + 1}. ${factor}`)
          : ['1. No major risk factors were detected in the latest cycle.'];

        return [
          `Financial health score: ${risk.health_score}/100`,
          `Current risk level: ${titleCase(risk.risk_level)}`,
          '',
          'Primary risk drivers:',
          ...factorLines,
          '',
          `Context: monthly spend ${formatInr(risk.monthly_spend)} vs budget ${formatInr(risk.monthly_budget)}.`,
        ].join('\n');
      }
    }

    if (asksSummary) {
      const summary = await executeTool('get_spending_summary', { period: 'this_month' }, userId);
      const breakdown = Array.isArray(summary?.breakdown) ? summary.breakdown.slice(0, 3) : [];

      if (breakdown.length > 0) {
        const total = Number(summary.total_spend || 0);
        const lines = breakdown.map((item, idx) => {
          const pct = total > 0 ? ((Number(item.amount || 0) / total) * 100).toFixed(1) : '0.0';
          return `${idx + 1}. ${item.category}: ${formatInr(item.amount)} (${pct}% of spend)`;
        });

        const overspend = Number(latestInsight?.overspend_amount || 0);
        const health = latestInsight?.health_score;
        const risk = latestInsight?.risk_level;

        return [
          'Monthly spending analysis:',
          `- Total spend so far: ${formatInr(total)}`,
          '- Top categories:',
          ...lines,
          '',
          `Portfolio health: ${health != null ? `${health}/100` : 'N/A'}${risk ? ` (${titleCase(risk)} risk)` : ''}.`,
          overspend > 0
            ? `Projected month-end overspend: ${formatInr(overspend)} at current pace.`
            : 'You are currently within projected monthly budget at this pace.',
        ].join('\n');
      }
    }
  } catch (error) {
    // Fall through to generic fallback.
  }

  if (latestInsight) {
    const factors = topRiskFactors(latestInsight, 2);
    const factorsText = factors.length > 0 ? ` Key drivers: ${factors.join(' | ')}` : '';
    return [
      `Current snapshot: spend ${formatInr(latestInsight.monthly_spend)} this month, health score ${latestInsight.health_score}/100, risk ${titleCase(latestInsight.risk_level)}.`,
      `Projected overspend: ${formatInr(latestInsight.overspend_amount)}.${factorsText}`,
      'Ask me for a focused analysis: spending by category, suspicious transactions, risk breakdown, or 7-day forecast.',
    ].join('\n');
  }

  return [
    'I can provide a professional financial analysis from your live data.',
    'Try one of these prompts:',
    '1. "Show my top suspicious transactions this month."',
    '2. "Give me a risk breakdown with key drivers."',
    '3. "Summarize spend by category and tell me where to cut first."',
  ].join('\n');
}

async function executeTool(toolName, args, userId) {
  const userObjectId = mongoose.Types.ObjectId.createFromHexString(String(userId));

  switch (toolName) {
    case 'get_spending_summary': {
      const period = args.period || 'this_month';
      const { start, end } = getDateRange(period);
      const dateMatch = end ? { $gte: start, $lt: end } : { $gte: start };

      const summary = await Transaction.aggregate([
        {
          $match: {
            user_id: userObjectId,
            date: dateMatch,
          },
        },
        {
          $group: {
            _id: '$category',
            amount: { $sum: '$amount' },
            transactions: { $sum: 1 },
          },
        },
        { $sort: { amount: -1 } },
      ]);

      const breakdown = summary.map((item) => ({
        category: item._id,
        amount: Number(item.amount || 0),
        transactions: item.transactions,
      }));

      const total_spend = breakdown.reduce((acc, item) => acc + item.amount, 0);

      return { period, total_spend, breakdown, currency: 'INR' };
    }

    case 'get_balance_forecast': {
      const days = clamp(Number(args.days) || 30, 1, 30);
      const insight = await Insight.findOne({
        user_id: userId,
        $or: [{ insight_type: 'analysis' }, { insight_type: { $exists: false } }],
      }).sort({ generated_at: -1 });

      if (!insight) {
        return { forecast: [], currency: 'INR' };
      }

      return {
        days,
        forecast: (insight.forecast || []).slice(0, days),
        currency: 'INR',
      };
    }

    case 'get_risk_score': {
      const insight = await Insight.findOne({
        user_id: userId,
        $or: [{ insight_type: 'analysis' }, { insight_type: { $exists: false } }],
      }).sort({ generated_at: -1 });

      if (!insight) {
        return { error: 'No insight available yet' };
      }

      const savingsRate = Number(insight.savings_rate || 0);

      return {
        health_score: insight.health_score,
        risk_level: insight.risk_level,
        risk_factors: insight.risk_factors || [],
        monthly_spend: insight.monthly_spend || 0,
        monthly_budget: insight.monthly_budget || 0,
        overspend_amount: insight.overspend_amount || 0,
        savings_rate: `${(savingsRate * 100).toFixed(1)}%`,
      };
    }

    case 'get_anomalies': {
      const anomalies = await Transaction.find({ user_id: userId, is_anomaly: true })
        .sort({ date: -1 })
        .limit(10);

      return {
        count: anomalies.length,
        anomalies: anomalies.map((tx) => ({
          merchant: tx.merchant,
          amount: tx.amount,
          category: tx.category,
          date: tx.date,
          channel: tx.channel,
        })),
      };
    }

    case 'simulate_scenario': {
      const insight = await Insight.findOne({
        user_id: userId,
        $or: [{ insight_type: 'analysis' }, { insight_type: { $exists: false } }],
      }).sort({ generated_at: -1 });
      const user = await User.findById(userId);

      if (!insight || !user) {
        return { error: 'Simulation data is not available yet' };
      }

      const category = resolveCategoryName(insight.category_summary, args.category || 'Other');
      const adjustmentPct = Number(args.adjustment_pct || 0);
      const currentCategorySpend = mapCategorySpend(insight.category_summary, category);
      const adjustmentAmount = currentCategorySpend * (adjustmentPct / 100);
      const newCategorySpend = Math.max(currentCategorySpend + adjustmentAmount, 0);
      const newMonthlySpend = Math.max((insight.monthly_spend || 0) + adjustmentAmount, 0);
      const monthlySaving = (insight.monthly_spend || 0) - newMonthlySpend;
      const annualSaving = monthlySaving * 12;
      const newProjectedBalance = (user.income || 0) - newMonthlySpend;

      const scoreDelta = clamp(Math.round((monthlySaving / Math.max(user.monthly_budget || 1, 1)) * 40), -20, 20);
      const estimatedHealthScore = clamp((insight.health_score || 0) + scoreDelta, 0, 100);

      return {
        category,
        adjustment_pct: adjustmentPct,
        before: {
          monthly_spend: insight.monthly_spend || 0,
          category_spend: currentCategorySpend,
          health_score: insight.health_score || 0,
          projected_balance: (user.income || 0) - (insight.monthly_spend || 0),
        },
        after: {
          monthly_spend: newMonthlySpend,
          category_spend: newCategorySpend,
          health_score: estimatedHealthScore,
          projected_balance: newProjectedBalance,
        },
        impact: {
          monthly_saving: monthlySaving,
          annual_saving: annualSaving,
          change_in_spend: adjustmentAmount,
        },
        currency: 'INR',
      };
    }

    case 'get_monthly_comparison': {
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

      const [thisMonth, lastMonth] = await Promise.all([
        Transaction.aggregate([
          { $match: { user_id: userObjectId, date: { $gte: thisMonthStart } } },
          { $group: { _id: '$category', total: { $sum: '$amount' } } },
        ]),
        Transaction.aggregate([
          { $match: { user_id: userObjectId, date: { $gte: lastMonthStart, $lte: lastMonthEnd } } },
          { $group: { _id: '$category', total: { $sum: '$amount' } } },
        ]),
      ]);

      const thisMap = Object.fromEntries(thisMonth.map((x) => [x._id, Math.round(x.total)]));
      const lastMap = Object.fromEntries(lastMonth.map((x) => [x._id, Math.round(x.total)]));
      const allCats = [...new Set([...Object.keys(thisMap), ...Object.keys(lastMap)])];

      const comparison = allCats.map((cat) => ({
        category: cat,
        this_month: thisMap[cat] ?? 0,
        last_month: lastMap[cat] ?? 0,
        change: (thisMap[cat] ?? 0) - (lastMap[cat] ?? 0),
        change_pct: lastMap[cat] ? Math.round((((thisMap[cat] ?? 0) - lastMap[cat]) / lastMap[cat]) * 100) : null,
      })).sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

      return {
        this_month_total: Math.round(Object.values(thisMap).reduce((a, b) => a + b, 0)),
        last_month_total: Math.round(Object.values(lastMap).reduce((a, b) => a + b, 0)),
        comparison,
      };
    }

    case 'get_top_merchants': {
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const limit = Math.min(Number(args.limit) || 8, 15);

      const merchants = await Transaction.aggregate([
        { $match: { user_id: userObjectId, date: { $gte: thisMonthStart } } },
        {
          $group: {
            _id: '$merchant',
            total: { $sum: '$amount' },
            count: { $sum: 1 },
            category: { $first: '$category' },
          },
        },
        { $sort: { total: -1 } },
        { $limit: limit },
      ]);

      return {
        merchants: merchants.map((m) => ({
          merchant: m._id,
          total: Math.round(m.total),
          transactions: m.count,
          category: m.category,
        })),
        period: 'this month',
      };
    }

    case 'get_goals_status': {
      const goals = await Goal.find({ user_id: userId, deleted_at: null })
        .sort({ deadline: 1 })
        .lean();

      const items = goals.map((goal) => {
        const target = Number(goal.target_amount || 0);
        const current = Number(goal.current_amount || 0);
        const progress_pct = target > 0
          ? Math.round((Math.min(current, target) / target) * 100)
          : 0;

        return {
          id: String(goal._id),
          name: goal.name,
          status: goal.status,
          target_amount: target,
          current_amount: current,
          remaining_amount: Math.max(target - current, 0),
          progress_pct,
          feasibility_score: Number(goal.feasibility_score || 0),
          monthly_contribution_needed: Number(goal.monthly_contribution_needed || 0),
          deadline: goal.deadline,
        };
      });

      return {
        goal_count: items.length,
        at_risk_count: items.filter((goal) => goal.status === 'at_risk').length,
        goals: items,
      };
    }

    case 'get_subscriptions_summary': {
      const subscriptions = await Subscription.find({ user_id: userId, is_dismissed: false }).lean();

      const monthly_total = subscriptions.reduce((acc, item) => {
        if (item.frequency === 'weekly') {
          return acc + (Number(item.amount || 0) * 52) / 12;
        }

        if (item.frequency === 'annual') {
          return acc + (Number(item.amount || 0) / 12);
        }

        return acc + Number(item.amount || 0);
      }, 0);

      const annual_total = subscriptions.reduce((acc, item) => acc + Number(item.annual_cost || 0), 0);
      const unconfirmed = subscriptions.filter((item) => !item.is_confirmed);

      return {
        monthly_total,
        annual_total,
        count: subscriptions.length,
        likely_waste_count: unconfirmed.length,
        subscriptions: subscriptions.map((item) => ({
          merchant: item.merchant,
          amount: Number(item.amount || 0),
          frequency: item.frequency,
          annual_cost: Number(item.annual_cost || 0),
          next_predicted_date: item.next_predicted_date,
          is_confirmed: Boolean(item.is_confirmed),
        })),
      };
    }

    default:
      return { error: `Unknown tool ${toolName}` };
  }
}

router.post('/', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    await ChatMessage.create({
      user_id: req.user.id,
      role: 'user',
      content: message,
      timestamp: new Date(),
    });

    const [rawHistory, user, latestInsight] = await Promise.all([
      ChatMessage.find({ user_id: req.user.id })
        .sort({ timestamp: -1 })
        .limit(12),
      User.findById(req.user.id).select('-password'),
      Insight.findOne({
        user_id: req.user.id,
        $or: [{ insight_type: 'analysis' }, { insight_type: { $exists: false } }],
      }).sort({ generated_at: -1 }),
    ]);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const conversationHistory = rawHistory
      .reverse()
      .map((m) => ({ role: m.role, content: m.content }))
      .map((m) => ({
        ...m,
        content: m.role === 'assistant' && m.content.length > 600
          ? `${m.content.slice(0, 600)}...`
          : m.content,
      }));

    let financialSummary = '';
    const retrievedMemories = await retrieveRelevantMemory(req.user.id, message, 3);
    const memoryBlock = retrievedMemories.length > 0
      ? retrievedMemories
        .map((item, idx) => `${idx + 1}. ${item.content}`)
        .join('\n')
      : 'None.';
    try {
      const summaryRes = await aiService.getFinancialSummary({
        user_name: user.name,
        health_score: latestInsight?.health_score ?? 50,
        risk_level: latestInsight?.risk_level ?? 'medium',
        monthly_spend: latestInsight?.monthly_spend ?? 0,
        monthly_budget: user.monthly_budget,
        overspend_amount: latestInsight?.overspend_amount ?? 0,
        savings_rate: latestInsight?.savings_rate ?? 0,
        top_category: latestInsight?.top_category ?? 'Unknown',
        risk_factors: latestInsight?.risk_factors ?? [],
      });
      financialSummary = summaryRes.summary;
    } catch (e) {
      financialSummary = `${user.name} has a health score of ${latestInsight?.health_score ?? 'N/A'}/100.`;
    }

    const systemPrompt = `You are SmartSpend AI, an expert personal finance assistant for ${user.name}.

CURRENT FINANCIAL SNAPSHOT:
${financialSummary}

RAW DATA:
- Monthly income: ₹${user.income?.toLocaleString('en-IN')}
- Monthly budget: ₹${user.monthly_budget?.toLocaleString('en-IN')}
- Health score: ${latestInsight?.health_score ?? 'N/A'}/100
- Risk level: ${latestInsight?.risk_level ?? 'Unknown'}
- This month's spend: ₹${Math.round(latestInsight?.monthly_spend ?? 0).toLocaleString('en-IN')}
- Projected overspend: ₹${Math.round(latestInsight?.overspend_amount ?? 0).toLocaleString('en-IN')}
- Top category: ${latestInsight?.top_category ?? 'Unknown'}
- Savings rate: ${((latestInsight?.savings_rate ?? 0) * 100).toFixed(1)}%

RELEVANT CONTEXT FROM PAST CONVERSATIONS:
${memoryBlock}

BEHAVIOR RULES:
- Always call a tool before answering data questions. Never invent numbers.
- Use ₹ for all amounts. Format large numbers with Indian comma notation (e.g. ₹1,23,456).
- Be specific, not generic. Reference the user's actual category names and real amounts.
- Keep responses under 200 words unless the user asks for detail.
- If the user asks what to do, give 1-2 concrete actionable steps, not a list of 7 generic tips.
- Sound like a knowledgeable friend who happens to be a CFP, not a bank chatbot.
- Write with a professional analyst tone: crisp, precise, and decision-oriented.
- Prefer structured responses with clear sections when useful (e.g., Snapshot, Key Drivers, Recommended Actions).
- For anomaly or suspicious-transaction questions, include a short ranked list with merchant, amount, category, and date when available.
- For spend-summary questions, include total spend, top categories with percentages, and one-line interpretation.
- Avoid vague phrases like "you should be careful" without data-backed context.
- If health score is below 60, acknowledge the situation is serious but keep the tone constructive.`;

    let finalContent = '';

    try {
      if (!openai) {
        throw new Error('OpenAI API key is not configured');
      }

      const dataKeywords = [
        'spend', 'spent', 'spending', 'budget', 'balance', 'forecast',
        'risk', 'score', 'anomal', 'suspicious', 'unusual', 'category',
        'merchant', 'this month', 'last month', 'much', 'compare', 'trend',
        'saving', 'overspend', 'cut', 'reduce', 'simulate', 'what if', 'if i',
        'goal', 'goals', 'subscription', 'subscriptions', 'track', 'waste',
      ];

      const messageLower = message.toLowerCase();
      const isDataQuestion = dataKeywords.some((kw) => messageLower.includes(kw));
      const toolChoice = isDataQuestion ? 'required' : 'auto';

      const conversation = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
      ];

      let completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: conversation,
        tools,
        tool_choice: toolChoice,
        max_tokens: 1000,
      });

      let assistantMessage = completion.choices[0].message;

      while (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        conversation.push({
          role: 'assistant',
          content: assistantMessage.content || '',
          tool_calls: assistantMessage.tool_calls,
        });

        const toolResultMessages = await Promise.all(
          assistantMessage.tool_calls.map(async (toolCall) => {
            let parsedArgs = {};
            try {
              parsedArgs = toolCall.function.arguments
                ? JSON.parse(toolCall.function.arguments)
                : {};
            } catch (error) {
              parsedArgs = {};
            }

            const result = await executeTool(
              toolCall.function.name,
              parsedArgs,
              req.user.id
            );

            return {
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(result),
            };
          })
        );

        conversation.push(...toolResultMessages);

        completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: conversation,
          tools,
          tool_choice: 'auto',
          max_tokens: 1000,
        });

        assistantMessage = completion.choices[0].message;
      }

      finalContent = assistantMessage.content || 'I was unable to generate a response.';
    } catch (openAiError) {
      finalContent = await buildCfoFallbackReply(message, req.user.id, user, latestInsight);
    }

    try {
      const memoryCandidates = extractMemoryCandidates(message);
      for (const candidate of memoryCandidates) {
        await storeMemory(req.user.id, candidate, 'chat', 0.8);
      }
    } catch (error) {
      // Memory persistence should not block chat responses.
    }

    if (
      /dining/i.test(message) &&
      latestInsight?.category_summary &&
      mapCategorySpend(latestInsight.category_summary, 'Food & Dining') > 0 &&
      !/food\s*&\s*dining/i.test(finalContent)
    ) {
      finalContent += '\n\nCategory reference: Food & Dining.';
    }

    await ChatMessage.create({
      user_id: req.user.id,
      role: 'assistant',
      content: finalContent,
      timestamp: new Date(),
    });

    return res.json({ reply: finalContent });
  } catch (err) {
    const errorMessage = err?.status === 429
      ? 'The AI is receiving too many requests right now. Please wait 10 seconds and try again.'
      : err?.status === 401
        ? 'AI service authentication issue. Please contact support.'
        : 'I ran into a problem fetching your data. Please try again in a moment.';

    return res.status(500).json({ error: errorMessage });
  }
});

router.get('/history', async (req, res) => {
  try {
    const messages = await ChatMessage.find({ user_id: req.user.id }).sort({ timestamp: 1 });
    return res.json({ messages });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

router.delete('/history', async (req, res) => {
  try {
    const result = await ChatMessage.deleteMany({ user_id: req.user.id });
    return res.json({ deleted: result.deletedCount });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to clear chat history' });
  }
});

module.exports = router;
