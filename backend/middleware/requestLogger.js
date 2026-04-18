const pinoHttp = require('pino-http');
const logger = require('../lib/logger');

/**
 * HTTP request logger with structured metadata for diagnostics.
 */
const requestLogger = pinoHttp({
  logger,
  customLogLevel(req, res, error) {
    if (error || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customProps(req) {
    return {
      userId: req.user?.id || null,
    };
  },
  serializers: {
    req(request) {
      return {
        id: request.id,
        method: request.method,
        url: request.url,
        userId: request.user?.id || null,
      };
    },
    res(response) {
      return {
        statusCode: response.statusCode,
      };
    },
  },
  autoLogging: true,
});

module.exports = requestLogger;
