const axios = require('axios');

const aiClient = axios.create({
  baseURL: process.env.AI_SERVICE_URL,
  timeout: 30000,
});

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

  const response = await aiClient.post('/analyze', payload);
  return response.data;
}

async function categorize(description, merchant, amount) {
  const response = await aiClient.post('/categorize', {
    description,
    merchant,
    amount,
  });
  return response.data;
}

async function forecast(userId, transactions, income, monthlyBudget) {
  const response = await aiClient.post('/forecast', {
    user_id: String(userId),
    transactions,
    income,
    monthly_budget: monthlyBudget,
  });
  return response.data;
}

async function detectAnomalies(transactions) {
  const response = await aiClient.post('/anomalies', { transactions });
  return response.data;
}

async function generateNudge(triggerType, context = {}) {
  const response = await aiClient.post('/nudge-message', {
    trigger_type: triggerType,
    context,
  });
  return response.data;
}

async function getFinancialSummary(payload) {
  const response = await aiClient.post('/financial-summary', payload);
  return response.data;
}

module.exports = {
  analyze,
  categorize,
  forecast,
  detectAnomalies,
  generateNudge,
  getFinancialSummary,
};
