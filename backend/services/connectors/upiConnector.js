const logger = require('../../lib/logger');

/**
 * UPI connector simulation.
 * Simulates Google Pay / PhonePe transaction export and webhook push.
 *
 * In production this would use the UPI ecosystem's PSP APIs.
 * Here we simulate OAuth connect + webhook-style transaction push for demo purposes.
 */

/** Maps UPI provider codes to readable names */
const PROVIDER_META = {
  gpay: { name: 'Google Pay', bank_name: 'Google Pay UPI', source: 'upi_gpay' },
  phonepe: { name: 'PhonePe', bank_name: 'PhonePe UPI', source: 'upi_phonepe' },
};

/** Known merchant VPA patterns → category hints */
const VPA_CATEGORY_HINTS = {
  swiggy: 'Food & Dining',
  zomato: 'Food & Dining',
  amazon: 'Shopping',
  flipkart: 'Shopping',
  netflix: 'Entertainment',
  spotify: 'Entertainment',
  uber: 'Transportation',
  ola: 'Transportation',
  rapido: 'Transportation',
  bigbasket: 'Groceries',
  zepto: 'Groceries',
  blinkit: 'Groceries',
  airtel: 'Utilities',
  jio: 'Utilities',
  apollo: 'Health',
  medplus: 'Health',
  myntra: 'Shopping',
  meesho: 'Shopping',
};

/**
 * Returns a mock OAuth connect result for the given UPI provider.
 * In production this would redirect to the provider's OAuth page.
 * @param {string} provider - 'gpay' or 'phonepe'
 * @returns {{ connected: boolean, provider: string, vpa: string, message: string }}
 */
function connectProvider(provider) {
  const meta = PROVIDER_META[provider];
  if (!meta) {
    throw new Error(`Unknown UPI provider: ${provider}`);
  }

  const mockVpa = `demo.user@${provider === 'gpay' ? 'okaxis' : 'ybl'}`;
  logger.info({ provider, vpa: mockVpa }, 'UPI provider connected (mock OAuth)');

  return {
    connected: true,
    provider,
    provider_name: meta.name,
    vpa: mockVpa,
    bank_name: meta.bank_name,
    masked_account: 'XXXX4321',
  };
}

/**
 * Infers a spending category from the payee name and VPA.
 * @param {string} payeeName
 * @param {string} payeeVpa
 * @returns {string} Category name
 */
function inferCategory(payeeName, payeeVpa) {
  const haystack = `${payeeName} ${payeeVpa}`.toLowerCase();
  for (const [keyword, category] of Object.entries(VPA_CATEGORY_HINTS)) {
    if (haystack.includes(keyword)) return category;
  }
  return 'Other';
}

/**
 * Transforms a UPI webhook payload into the internal Transaction format.
 * @param {object} upiPayload - Raw UPI transaction from webhook
 * @param {string|import('mongoose').Types.ObjectId} userId
 * @param {string} provider - 'gpay' or 'phonepe'
 * @returns {object} Transaction document ready for DB insertion
 */
function transformUpiTransaction(upiPayload, userId, provider) {
  const { payeeName, payeeVpa, amount, transactionId, timestamp } = upiPayload;
  const meta = PROVIDER_META[provider] || PROVIDER_META.gpay;

  return {
    user_id: userId,
    date: timestamp ? new Date(timestamp) : new Date(),
    amount: Number(amount),
    merchant: payeeName || payeeVpa || 'UPI Transfer',
    category: inferCategory(payeeName || '', payeeVpa || ''),
    description: `UPI — ${payeeName || payeeVpa || 'Transfer'} via ${meta.name}`,
    channel: 'UPI',
    is_anomaly: false,
    anomaly_score: 0,
    source: meta.source,
    external_id: transactionId || `UPI-${Date.now()}`,
  };
}

/**
 * Generates a realistic fake UPI transaction payload for the demo "Simulate UPI" button.
 * @param {string} provider - 'gpay' or 'phonepe'
 * @returns {object} UPI transaction payload
 */
function generateDemoUpiPayload(provider = 'gpay') {
  const demoMerchants = [
    { payeeName: 'Swiggy Food Delivery', payeeVpa: 'swiggy@icici', amount: 385 },
    { payeeName: 'Zepto Groceries', payeeVpa: 'zepto@axis', amount: 892 },
    { payeeName: 'Ola Cabs', payeeVpa: 'ola@okaxis', amount: 156 },
    { payeeName: 'Amazon India', payeeVpa: 'amazon@apl', amount: 1299 },
    { payeeName: 'Starbucks Coffee', payeeVpa: 'starbucks@hdfcbank', amount: 510 },
  ];
  const merchant = demoMerchants[Math.floor(Math.random() * demoMerchants.length)];

  return {
    ...merchant,
    transactionId: `UPI-DEMO-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    timestamp: new Date().toISOString(),
    provider,
  };
}

module.exports = {
  connectProvider,
  transformUpiTransaction,
  generateDemoUpiPayload,
  PROVIDER_META,
};
