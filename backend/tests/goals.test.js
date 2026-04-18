const request = require('supertest');
const express = require('express');

require('./setup');

const User = require('../models/User');
const Goal = require('../models/Goal');
const Insight = require('../models/Insight');
const { makeToken } = require('./setup');

jest.mock('../services/aiService', () => ({
  goalPlan: jest.fn().mockResolvedValue({
    plan: 'Set aside funds monthly and reduce discretionary spend.',
  }),
}));

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/goals', require('../routes/goals'));
  return app;
}

describe('Goals routes', () => {
  let user;
  let token;

  beforeEach(async () => {
    user = await User.create({
      name: 'Goals User',
      email: 'goals@example.com',
      password: 'password123',
      income: 100000,
      account_balance: 180000,
      monthly_budget: 50000,
    });

    token = makeToken(user._id.toString());

    await Insight.create({
      user_id: user._id,
      health_score: 72,
      risk_level: 'medium',
      risk_factors: ['Discretionary spend rising'],
      monthly_spend: 42000,
      monthly_budget: 50000,
      overspend_amount: 2500,
      savings_rate: 0.18,
      top_category: 'Shopping',
      category_summary: { Shopping: 10000 },
      category_breaches: [],
      recommendations: [],
      forecast: [],
      generated_at: new Date(),
    });
  });

  it('creates a goal with computed fields', async () => {
    const app = buildApp();

    const res = await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Emergency Fund',
        target_amount: 120000,
        current_amount: 10000,
        deadline: new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString(),
        category: 'emergency',
      });

    expect(res.status).toBe(201);
    expect(res.body.goal).toBeDefined();
    expect(res.body.goal.name).toBe('Emergency Fund');
    expect(res.body.goal.monthly_contribution_needed).toBeGreaterThan(0);
    expect(res.body.goal.feasibility_score).toBeGreaterThanOrEqual(0);
    expect(res.body.goal.progress_pct).toBeGreaterThanOrEqual(0);
  });

  it('returns 400 for invalid goal category', async () => {
    const app = buildApp();

    const res = await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Bad Goal',
        target_amount: 50000,
        deadline: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString(),
        category: 'invalid',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/category must be one of/i);
  });

  it('updates contribution and keeps ai plan populated', async () => {
    const goal = await Goal.create({
      user_id: user._id,
      name: 'Vacation Fund',
      target_amount: 80000,
      current_amount: 10000,
      deadline: new Date(Date.now() + 240 * 24 * 3600 * 1000),
      category: 'vacation',
      monthly_contribution_needed: 7000,
      feasibility_score: 60,
      status: 'active',
      ai_plan: 'Old plan',
    });

    const app = buildApp();
    const res = await request(app)
      .post(`/api/goals/${goal._id}/contribute`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 3000 });

    expect(res.status).toBe(200);
    expect(res.body.goal.current_amount).toBe(13000);
    expect(res.body.goal.monthly_contribution_needed).toBeGreaterThan(0);
    expect(String(res.body.goal.ai_plan || '')).toMatch(/₹|month|save|set aside/i);
  });
});
