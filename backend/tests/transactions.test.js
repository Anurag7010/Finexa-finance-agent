const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');

require('./setup');

const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { makeToken } = require('./setup');

// Mock Redis to prevent connection issues in tests
jest.mock('../lib/redis', () => ({
  redisClient: {
    get: jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
  },
  redisPublisher: { publish: jest.fn().mockResolvedValue(0) },
  isRedisHealthy: jest.fn().mockResolvedValue(true),
}));

// Mock AI service to prevent real HTTP calls
jest.mock('../services/aiService', () => ({
  categorize: jest.fn().mockResolvedValue({ category: 'Food & Dining' }),
  checkAiHealth: jest.fn().mockResolvedValue(true),
}));

function buildApp() {
  const app = express();
  app.use(express.json());
  const authMiddleware = require('../middleware/auth');
  app.use('/api/transactions', authMiddleware, require('../routes/transactions'));
  return app;
}

let userId;
let token;

beforeEach(async () => {
  const user = await User.create({
    name: 'Txn User',
    email: 'txn@example.com',
    password: 'pass123',
    income: 80000,
    monthly_budget: 40000,
  });
  userId = user._id.toString();
  token = makeToken(userId);

  // Seed some transactions
  await Transaction.insertMany([
    {
      user_id: user._id,
      date: new Date(),
      amount: 500,
      merchant: 'Swiggy',
      category: 'Food & Dining',
      description: 'Food order',
      channel: 'UPI',
    },
    {
      user_id: user._id,
      date: new Date(),
      amount: 20000,
      merchant: 'Housing Society',
      category: 'Rent',
      description: 'Monthly rent',
      channel: 'netbanking',
      is_anomaly: false,
    },
    {
      user_id: user._id,
      date: new Date(),
      amount: 11400,
      merchant: 'UNKNOWN MERCHANT',
      category: 'Shopping',
      description: 'Suspicious charge',
      channel: 'card',
      is_anomaly: true,
    },
  ]);
});

describe('GET /api/transactions', () => {
  it('returns transactions for authenticated user', async () => {
    const app = buildApp();
    const res = await request(app)
      .get('/api/transactions')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.transactions)).toBe(true);
    expect(res.body.transactions.length).toBe(3);
    expect(res.body.total).toBe(3);
  });

  it('returns 401 without token', async () => {
    const app = buildApp();
    const res = await request(app).get('/api/transactions');
    expect(res.status).toBe(401);
  });

  it('filters by category', async () => {
    const app = buildApp();
    const res = await request(app)
      .get('/api/transactions?category=Rent')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.transactions.every((t) => t.category === 'Rent')).toBe(true);
  });
});

describe('GET /api/transactions/summary', () => {
  it('returns category summary for current month', async () => {
    const app = buildApp();
    const res = await request(app)
      .get('/api/transactions/summary')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.summary)).toBe(true);
    expect(typeof res.body.totalSpend).toBe('number');
  });
});

describe('GET /api/transactions/anomalies', () => {
  it('returns anomalous transactions only', async () => {
    const app = buildApp();
    const res = await request(app)
      .get('/api/transactions/anomalies')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.anomalies)).toBe(true);
    expect(res.body.anomalies.length).toBe(1);
    expect(res.body.anomalies[0].is_anomaly).toBe(true);
  });
});

describe('POST /api/transactions', () => {
  it('creates a transaction with auto-categorization', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        amount: 350,
        merchant: 'Zomato',
        description: 'Food delivery',
        channel: 'UPI',
      });

    expect(res.status).toBe(201);
    expect(res.body.transaction.merchant).toBe('Zomato');
    expect(res.body.transaction.category).toBe('Food & Dining');
  });

  it('rejects missing required fields', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 100 });

    expect(res.status).toBe(400);
  });
});
