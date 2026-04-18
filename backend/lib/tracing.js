const config = require('../config/env');
const logger = require('./logger');

let sdk = null;

/**
 * Initializes OpenTelemetry when explicitly enabled.
 */
function initTracing() {
  if (!config.otelEnabled) {
    logger.info('OpenTelemetry tracing is disabled');
    return null;
  }

  try {
    // Required dynamically so the app still starts if optional deps are unavailable.
    // eslint-disable-next-line global-require
    const { NodeSDK } = require('@opentelemetry/sdk-node');
    // eslint-disable-next-line global-require
    const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');

    sdk = new NodeSDK({
      instrumentations: [getNodeAutoInstrumentations()],
    });

    sdk.start();
    logger.info('OpenTelemetry tracing initialized');
    return sdk;
  } catch (error) {
    logger.warn({ error }, 'Failed to initialize OpenTelemetry tracing');
    return null;
  }
}

/**
 * Gracefully shuts down OpenTelemetry before process exit.
 */
async function shutdownTracing() {
  if (!sdk) {
    return;
  }

  try {
    await sdk.shutdown();
    logger.info('OpenTelemetry tracing shutdown completed');
  } catch (error) {
    logger.warn({ error }, 'OpenTelemetry tracing shutdown failed');
  }
}

module.exports = {
  initTracing,
  shutdownTracing,
};
