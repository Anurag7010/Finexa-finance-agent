const axios = require('axios');
const axiosRetry = require('axios-retry').default;
const config = require('../config/env');
const logger = require('../lib/logger');

const aiClient = axios.create({
  baseURL: config.aiServiceUrl,
  timeout: 30000,
});

axiosRetry(aiClient, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  shouldResetTimeout: true,
  retryCondition(error) {
    if (axiosRetry.isNetworkOrIdempotentRequestError(error)) {
      return true;
    }

    if (error.code === 'ECONNABORTED') {
      return true;
    }

    const status = error.response?.status;
    return typeof status === 'number' && status >= 500;
  },
});

/**
 * Performs an instrumented POST request to the AI service.
 */
async function postAi(path, payload) {
  const start = Date.now();

  try {
    const response = await aiClient.post(path, payload);

    logger.info(
      {
        path,
        durationMs: Date.now() - start,
        success: true,
      },
      'AI service call completed'
    );

    return response.data;
  } catch (error) {
    logger.error(
      {
        path,
        durationMs: Date.now() - start,
        statusCode: error.response?.status,
        message: error.message,
      },
      'AI service call failed'
    );

    throw error;
  }
}

async function analyze(userId, transactions, user) {
  const categoryBudgets = user?.category_budgets
    ? Object.fromEntries(user.category_budgets)
    : {};

  const payload = {
    user_id: String(userId),
    transactions,
    monthly_budget: user.monthly_budget,
    income: user.income,
    category_budgets: categoryBudgets,
  };

  return postAi('/analyze', payload);
}

async function categorize(description, merchant, amount) {
  return postAi('/categorize', {
    description,
    merchant,
    amount,
  });
}

async function forecast(userId, transactions, income, monthlyBudget) {
  return postAi('/forecast', {
    user_id: String(userId),
    transactions,
    income,
    monthly_budget: monthlyBudget,
  });
}

async function detectAnomalies(transactions) {
  return postAi('/anomalies', { transactions });
}

async function generateNudge(triggerType, context = {}) {
  return postAi('/nudge-message', {
    trigger_type: triggerType,
    context,
  });
}

async function getFinancialSummary(payload) {
  return postAi('/financial-summary', payload);
}

/**
 * Returns true when the AI service health endpoint is reachable.
 */
async function checkAiHealth() {
  try {
    const response = await aiClient.get('/health', { timeout: 3000 });
    return response.status >= 200 && response.status < 300;
  } catch (error) {
    logger.warn({ error: error.message }, 'AI service health check failed');
    return false;
  }
}

module.exports = {
  analyze,
  categorize,
  forecast,
  detectAnomalies,
  generateNudge,
  getFinancialSummary,
  checkAiHealth,
};
