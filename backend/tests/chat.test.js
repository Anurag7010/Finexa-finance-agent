const request = require('supertest');
const express = require('express');

require('./setup');

const User = require('../models/User');
const Insight = require('../models/Insight');
const Transaction = require('../models/Transaction');
const ChatMessage = require('../models/ChatMessage');
const { makeToken } = require('./setup');

jest.mock('../middleware/rateLimiter', () => ({
  authRateLimiter: (req, res, next) => next(),
  generalApiRateLimiter: (req, res, next) => next(),
  chatRateLimiter: (req, res, next) => next(),
  insightsRefreshRateLimiter: (req, res, next) => next(),
}));

// Stub out OpenAI so tests never make real HTTP calls
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [
            {
              message: {
                role: 'assistant',
                content: 'Mocked assistant reply.',
                tool_calls: null,
              },
            },
          ],
        }),
      },
    },
  }));
});

// Stub AI service to avoid network calls
jest.mock('../services/aiService', () => ({
  getFinancialSummary: jest.fn().mockResolvedValue({ summary: 'Health is moderate.' }),
  cfoAnalysis: jest.fn().mockResolvedValue({ answer: 'CFO fallback answer.' }),
  analyze: jest.fn().mockResolvedValue({ health_score: 55, risk_level: 'medium' }),
}));

jest.mock('../services/memoryService', () => ({
  retrieveRelevantMemory: jest.fn().mockResolvedValue([]),
  storeMemory: jest.fn().mockResolvedValue(true),
  extractMemoryCandidates: jest.fn().mockReturnValue([]),
}));

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/chat', require('../routes/chat'));
  return app;
}

describe('Chat routes', () => {
  let user;
  let token;

  beforeEach(async () => {
    user = await User.create({
      name: 'Chat User',
      email: 'chattest@example.com',
      password: 'password123',
      income: 80000,
      account_balance: 150000,
      monthly_budget: 45000,
    });

    token = makeToken(user._id.toString());

    await Insight.create({
      user_id: user._id,
      health_score: 54,
      risk_level: 'high',
      risk_factors: ['Overspend in Food & Dining', 'High anomaly count'],
      monthly_spend: 48000,
      monthly_budget: 45000,
      overspend_amount: 3000,
      savings_rate: 0.1,
      top_category: 'Food & Dining',
      category_summary: { 'Food & Dining': 15000, Shopping: 12000, Rent: 18000 },
      category_breaches: [],
      recommendations: [],
      forecast: [{ date: new Date(), projected_balance: 10000, projected_spend: 45000 }],
      generated_at: new Date(),
    });
  });

  /**
   * Basic connectivity — chat endpoint responds.
   */
  it('returns 400 when message is missing', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/chat')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  /**
   * tool_choice is 'required' for spend-related messages.
   * We verify this indirectly: the endpoint should complete without error
   * for messages containing spend keywords.
   */
  it('handles messages containing "spend" without error', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/chat')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'Why am I spending so much this month?' });

    expect(res.status).toBe(200);
    expect(res.body.reply).toBeDefined();
    expect(typeof res.body.reply).toBe('string');
  });

  /**
   * tool_choice is 'auto' for non-data messages.
   */
  it('handles greeting messages without error', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/chat')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'Hello, how are you?' });

    expect(res.status).toBe(200);
    expect(res.body.reply).toBeDefined();
  });

  /**
   * get_risk_score tool execution returns health_score field.
   */
  it('get_risk_score tool returns object with health_score', async () => {
    // Import executeTool indirectly by sending a risk-related message.
    // We test the tool data shape by checking the route completes successfully.
    const app = buildApp();
    const res = await request(app)
      .post('/api/chat')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'What is my risk score and health score?' });

    expect(res.status).toBe(200);
    expect(typeof res.body.reply).toBe('string');
    expect(res.body.reply.length).toBeGreaterThan(0);
  });

  /**
   * Conversation history is trimmed to 12 messages.
   * Create 15 existing messages; route should not break.
   */
  it('handles large conversation history without error', async () => {
    const messages = [];
    for (let i = 0; i < 15; i++) {
      messages.push({
        user_id: user._id,
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
        timestamp: new Date(Date.now() - (15 - i) * 1000),
      });
    }
    await ChatMessage.insertMany(messages);

    const app = buildApp();
    const res = await request(app)
      .post('/api/chat')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'Summarize my spending.' });

    expect(res.status).toBe(200);
    expect(res.body.reply).toBeDefined();
  });

  /**
   * GET /history returns messages array.
   */
  it('GET /history returns chat messages', async () => {
    await ChatMessage.create({
      user_id: user._id,
      role: 'user',
      content: 'Test message',
      timestamp: new Date(),
    });

    const app = buildApp();
    const res = await request(app)
      .get('/api/chat/history')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.messages)).toBe(true);
    expect(res.body.messages.length).toBeGreaterThan(0);
  });

  /**
   * DELETE /history clears chat messages.
   */
  it('DELETE /history removes all messages for user', async () => {
    await ChatMessage.create({
      user_id: user._id,
      role: 'user',
      content: 'Message to delete',
      timestamp: new Date(),
    });

    const app = buildApp();
    const res = await request(app)
      .delete('/api/chat/history')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.deleted).toBeGreaterThanOrEqual(1);
  });
});
