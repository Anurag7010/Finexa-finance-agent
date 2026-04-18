const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { redisClient } = require('../lib/redis');

/**
 * Shared JSON handler so all rate-limit responses are structured.
 */
function jsonRateLimitHandler(_req, res, _next, options) {
  return res.status(options.statusCode).json({
    error: String(options.message || 'Too many requests, please try again later.'),
  });
}

/**
 * Creates a Redis-backed store used by express-rate-limit.
 */
function createRedisStore() {
  return new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  });
}

/**
 * Auth route limiter: 10 requests per 15 minutes per IP.
 */
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: true,
  handler: jsonRateLimitHandler,
  message: 'Too many authentication attempts, please try again in 15 minutes.',
  store: createRedisStore(),
});

/**
 * Chat limiter: 30 requests per minute per authenticated user.
 */
const chatRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: true,
  handler: jsonRateLimitHandler,
  message: 'Chat rate limit exceeded, please wait a minute and try again.',
  keyGenerator: (req) => req.user?.id || ipKeyGenerator(req.ip),
  store: createRedisStore(),
});

/**
 * Insight refresh limiter: 5 requests per minute per authenticated user.
 */
const insightsRefreshRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: true,
  handler: jsonRateLimitHandler,
  message: 'Insight refresh rate limit exceeded, please wait a minute and try again.',
  keyGenerator: (req) => req.user?.id || ipKeyGenerator(req.ip),
  store: createRedisStore(),
});

/**
 * General API limiter: 200 requests per minute per IP.
 */
const generalApiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: true,
  handler: jsonRateLimitHandler,
  message: 'API rate limit exceeded, please try again shortly.',
  store: createRedisStore(),
});

module.exports = {
  authRateLimiter,
  chatRateLimiter,
  insightsRefreshRateLimiter,
  generalApiRateLimiter,
};
