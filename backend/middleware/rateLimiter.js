const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { redisClient } = require('../lib/redis');

/**
 * Returns true when the Redis client is not in a ready state.
 * Used as the skip function for all rate limiters so that Redis failure
 * degrades gracefully (no rate limiting) rather than blocking all requests.
 * @returns {boolean}
 */
function isRedisUnhealthy() {
  try {
    return !redisClient || redisClient.status !== 'ready';
  } catch (_err) {
    return true;
  }
}

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
function createRedisStore(prefix) {
  return new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
    prefix,
  });
}

/**
 * Auth route limiter: 10 requests per 15 minutes per IP.
 * Skips rate limiting when Redis is unavailable so login always works.
 */
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: true,
  handler: jsonRateLimitHandler,
  message: 'Too many authentication attempts, please try again in 15 minutes.',
  store: createRedisStore('rl:auth:'),
  skip: () => isRedisUnhealthy(),
});

/**
 * Chat limiter: 30 requests per minute per authenticated user.
 * Skips rate limiting when Redis is unavailable.
 */
const chatRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: true,
  handler: jsonRateLimitHandler,
  message: 'Chat rate limit exceeded, please wait a minute and try again.',
  keyGenerator: (req) => req.user?.id || ipKeyGenerator(req.ip),
  store: createRedisStore('rl:chat:'),
  skip: () => isRedisUnhealthy(),
});

/**
 * Insight refresh limiter: 5 requests per minute per authenticated user.
 * Skips rate limiting when Redis is unavailable.
 */
const insightsRefreshRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: true,
  handler: jsonRateLimitHandler,
  message: 'Insight refresh rate limit exceeded, please wait a minute and try again.',
  keyGenerator: (req) => req.user?.id || ipKeyGenerator(req.ip),
  store: createRedisStore('rl:insights:'),
  skip: () => isRedisUnhealthy(),
});

/**
 * General API limiter: 200 requests per minute per IP.
 * Skips rate limiting when Redis is unavailable.
 */
const generalApiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: true,
  handler: jsonRateLimitHandler,
  message: 'API rate limit exceeded, please try again shortly.',
  store: createRedisStore('rl:api:'),
  skip: () => isRedisUnhealthy(),
});

module.exports = {
  authRateLimiter,
  chatRateLimiter,
  insightsRefreshRateLimiter,
  generalApiRateLimiter,
};

