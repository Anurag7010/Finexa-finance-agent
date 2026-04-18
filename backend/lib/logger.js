const pino = require('pino');
const config = require('../config/env');

/**
 * Shared structured logger for API and workers.
 */
const logger = pino({
  level: config.logLevel,
  base: {
    service: config.serviceName,
    version: config.appVersion,
    environment: config.nodeEnv,
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'authorization',
      'token',
      'password',
      '*.password',
      'OPENAI_API_KEY',
      'openai_api_key',
    ],
    censor: '[REDACTED]',
  },
});

module.exports = logger;
