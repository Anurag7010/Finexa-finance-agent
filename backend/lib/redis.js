const Redis = require('ioredis');
const config = require('../config/env');
const logger = require('./logger');

/**
 * Creates a Redis client with consistent defaults for this service.
 */
function createRedisClient(label, extraOptions = {}) {
  const client = new Redis(config.redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    ...extraOptions,
  });

  client.on('error', (error) => {
    logger.error({ error, label }, 'Redis client error');
  });

  return client;
}

const redisClient = createRedisClient('cache');
const redisPublisher = createRedisClient('publisher');
const redisSubscriber = createRedisClient('subscriber');
const bullConnection = createRedisClient('bullmq', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

/**
 * Returns true when Redis is reachable and responding to ping.
 */
async function isRedisHealthy() {
  try {
    const response = await redisClient.ping();
    return response === 'PONG';
  } catch (error) {
    logger.warn({ error }, 'Redis health check failed');
    return false;
  }
}

module.exports = {
  redisClient,
  redisPublisher,
  redisSubscriber,
  bullConnection,
  isRedisHealthy,
};
