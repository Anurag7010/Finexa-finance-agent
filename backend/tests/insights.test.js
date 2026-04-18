const request = require('supertest');
const express = require('express');

require('./setup');

const User = require('../models/User');
const Insight = require('../models/Insight');
const { makeToken } = require('./setup');

jest.mock('../middleware/rateLimiter', () => ({
  authRateLimiter: (req, res, next) => next(),
  generalApiRateLimiter: (req, res, next) => next(),
  chatRateLimiter: (req, res, next) => next(),
  insightsRefreshRateLimiter: (req, res, next) => next(),
}));

jest.mock('../queues/insightQueue', () => ({
  enqueueInsightRefreshJob: jest.fn().mockResolvedValue({
    id: 'job-1',
    waitUntilFinished: jest.fn().mockRejectedValue(new Error('timeout')),
  }),
  insightQueueEvents: {},
}));

jest.mock('../workers/insightJobProcessor', () => ({
  refreshUserInsight: jest.fn().mockResolvedValue({
    insight: {
      health_score: 70,
      risk_level: 'medium',
      risk_factors: [],
      monthly_spend: 30000,
      monthly_budget: 50000,
      overspend_amount: 0,
      savings_rate: 0.2,
      top_category: 'Food',
      category_summary: {},
      category_breaches: [],
      recommendations: [],
      forecast: [],
    },
    alertsGenerated: 0,
  }),
}));

jest.mock('../lib/redis', () => ({
  redisClient: {
    get: jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
  },
}));

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/insights', require('../routes/insights'));
  return app;
}

describe('Insights routes', () => {
  let user;
  let token;

  beforeEach(async () => {
    user = await User.create({
      name: 'Insight User',
      email: 'insights@example.com',
      password: 'password123',
      income: 90000,
      account_balance: 140000,
      monthly_budget: 45000,
    });

    token = makeToken(user._id.toString());
  });

  it('returns 404 when no insights exist', async () => {
    const app = buildApp();
    const res = await request(app)
      .get('/api/insights')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('returns latest insight snapshot', async () => {
    await Insight.create({
      user_id: user._id,
      health_score: 81,
      risk_level: 'low',
      risk_factors: [],
      monthly_spend: 30000,
      monthly_budget: 45000,
      overspend_amount: 0,
      savings_rate: 0.33,
      top_category: 'Rent',
      category_summary: { Rent: 20000 },
      category_breaches: [],
      recommendations: [],
      forecast: [{
        date: new Date(),
        projected_balance: 15000,
        projected_spend: 30000,
      }],
      generated_at: new Date(),
    });

    const app = buildApp();
    const res = await request(app)
      .get('/api/insights')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.insight.health_score).toBe(81);
    expect(res.body.insight.risk_level).toBe('low');
  });

  it('refresh endpoint returns accepted payload with fallback insight', async () => {
    await Insight.create({
      user_id: user._id,
      health_score: 67,
      risk_level: 'medium',
      risk_factors: ['Pace high'],
      monthly_spend: 35000,
      monthly_budget: 45000,
      overspend_amount: 1200,
      savings_rate: 0.15,
      top_category: 'Shopping',
      category_summary: { Shopping: 10000 },
      category_breaches: [],
      recommendations: [],
      forecast: [],
      generated_at: new Date(),
    });

    const app = buildApp();
    const res = await request(app)
      .post('/api/insights/refresh')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(202);
    expect(res.body.insight).toBeDefined();
    expect(res.body.queued).toBe(true);
  });
});
