const express = require('express');
const OpenAI = require('openai');
const mongoose = require('mongoose');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Insight = require('../models/Insight');
const ChatMessage = require('../models/ChatMessage');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.use(authMiddleware);

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

async function executeTool(toolName, args, userId) {
  switch (toolName) {
    case 'get_spending_summary': {
      const period = args.period || 'this_month';
      const { start, end } = getDateRange(period);
      const userObjectId = mongoose.Types.ObjectId.createFromHexString(String(userId));
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
      const insight = await Insight.findOne({ user_id: userId }).sort({ generated_at: -1 });

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
      const insight = await Insight.findOne({ user_id: userId }).sort({ generated_at: -1 });

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
      const insight = await Insight.findOne({ user_id: userId }).sort({ generated_at: -1 });
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

    const [history, user, latestInsight] = await Promise.all([
      ChatMessage.find({ user_id: req.user.id })
        .sort({ timestamp: -1 })
        .limit(10),
      User.findById(req.user.id).select('-password'),
      Insight.findOne({ user_id: req.user.id }).sort({ generated_at: -1 }),
    ]);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const historyChronological = history.reverse();
    const healthScore = latestInsight?.health_score ?? 'N/A';
    const riskLevel = latestInsight?.risk_level ?? 'N/A';
    const monthlySpend = latestInsight?.monthly_spend ?? 0;
    const topCategory = latestInsight?.top_category ?? 'N/A';

    const systemPrompt = [
      'You are SmartSpend AI, a proactive personal finance assistant.',
      'Be specific, data-driven, and practical.',
      'Always call at least one tool before your first response to ground answers in real user data.',
      'Use exact figures from tool results (INR amounts, categories, counts, or percentages) when answering.',
      'Use exact category labels from data/tool output (for example: Food & Dining), not paraphrased variants.',
      'Do not return generic advice without supporting numbers.',
      `User name: ${user.name}`,
      `Income: ${user.income}`,
      `Monthly budget: ${user.monthly_budget}`,
      `Health score: ${healthScore}`,
      `Risk level: ${riskLevel}`,
      `This month spend: ${monthlySpend}`,
      `Top category: ${topCategory}`,
      'When needed, call tools to retrieve exact values before answering.',
    ].join('\n');

    const conversation = [
      { role: 'system', content: systemPrompt },
      ...historyChronological.map((entry) => ({
        role: entry.role,
        content: entry.content,
      })),
    ];

    let completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: conversation,
      tools,
      tool_choice: 'required',
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

    let finalContent = assistantMessage.content || 'I was unable to generate a response.';

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
  } catch (error) {
    return res.status(500).json({ error: 'Failed to process chat message' });
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
