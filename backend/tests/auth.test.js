const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

require('./setup');

const User = require('../models/User');
const { makeToken } = require('./setup');

// Mock rate limiter to avoid 429 errors in testing
jest.mock('../middleware/rateLimiter', () => ({
  authRateLimiter: (req, res, next) => next(),
  generalApiRateLimiter: (req, res, next) => next(),
  chatRateLimiter: (req, res, next) => next(),
  insightsRefreshRateLimiter: (req, res, next) => next(),
}));

const authRoutes = require('../routes/auth');

// Build a minimal express app for testing auth routes
function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  return app;
}

describe('POST /api/auth/register', () => {
  it('registers a new user and returns a token', async () => {
    const app = buildApp();
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      income: 80000,
      monthly_budget: 40000,
    });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('test@example.com');
    expect(res.body.user.name).toBe('Test User');
  });

  it('rejects duplicate email with 400', async () => {
    const app = buildApp();

    await request(app).post('/api/auth/register').send({
      name: 'First',
      email: 'dup@example.com',
      password: 'pass123',
      income: 50000,
      monthly_budget: 20000,
    });

    const res = await request(app).post('/api/auth/register').send({
      name: 'Second',
      email: 'dup@example.com',
      password: 'pass123',
      income: 50000,
      monthly_budget: 20000,
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already exists/i);
  });

  it('rejects missing fields with 400', async () => {
    const app = buildApp();
    const res = await request(app).post('/api/auth/register').send({
      email: 'missing@example.com',
    });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await User.create({
      name: 'Login User',
      email: 'login@example.com',
      password: 'correctpass',
      income: 70000,
      monthly_budget: 35000,
    });
  });

  it('returns token on valid credentials', async () => {
    const app = buildApp();
    const res = await request(app).post('/api/auth/login').send({
      email: 'login@example.com',
      password: 'correctpass',
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('serializes legacy object category_budgets without crashing', async () => {
    const app = buildApp();

    await User.updateOne(
      { email: 'login@example.com' },
      {
        $set: {
          category_budgets: { groceries: 500, transport: 200 },
        },
      }
    );

    const res = await request(app).post('/api/auth/login').send({
      email: 'login@example.com',
      password: 'correctpass',
    });

    expect(res.status).toBe(200);
    expect(res.body.user.category_budgets).toEqual({
      groceries: 500,
      transport: 200,
    });
  });

  it('returns 401 on wrong password', async () => {
    const app = buildApp();
    const res = await request(app).post('/api/auth/login').send({
      email: 'login@example.com',
      password: 'wrongpass',
    });
    expect(res.status).toBe(401);
  });

  it('returns 401 on nonexistent email', async () => {
    const app = buildApp();
    const res = await request(app).post('/api/auth/login').send({
      email: 'nobody@example.com',
      password: 'anypass',
    });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  let userId;
  let token;

  beforeEach(async () => {
    const user = await User.create({
      name: 'Me User',
      email: 'me@example.com',
      password: 'pass123',
      income: 60000,
      monthly_budget: 30000,
    });
    userId = user._id.toString();
    token = makeToken(userId);
  });

  it('returns user data with valid token', async () => {
    const app = buildApp();
    const authMiddleware = require('../middleware/auth');
    app.get('/api/auth/me', authMiddleware, async (req, res) => {
      const user = await User.findById(req.user.id).select('-password');
      res.json({ user: { id: user._id, name: user.name, email: user.email } });
    });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe('Me User');
  });

  it('returns 401 without token', async () => {
    const app = buildApp();
    const authMiddleware = require('../middleware/auth');
    app.get('/api/auth/me', authMiddleware, (req, res) => res.json({ user: req.user }));

    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});
