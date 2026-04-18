const { randomUUID } = require('crypto');
const logger = require('../../lib/logger');

/**
 * Account Aggregator (AA) mock connector.
 * Simulates India's AA consent + data fetch flow as per RBI AA Framework.
 *
 * In a real integration this would call the AA Gateway (Setu/Finvu/etc).
 * Here we simulate the async consent approval with a 3-second delay.
 */

/** Tracks in-memory consent state during the mock consent flow */
const consentStore = new Map();

/**
 * Generates a realistic mock transaction in AA FIP format.
 * @param {number} index - Index for variation
 * @returns {object} AA-formatted transaction object
 */
function generateAaTransaction(index) {
  const merchants = [
    { narration: 'SWIGGY ORDER', category: 'Food & Dining', amount: Math.floor(Math.random() * 600) + 150 },
    { narration: 'AMAZON.IN', category: 'Shopping', amount: Math.floor(Math.random() * 2000) + 300 },
    { narration: 'OLA CABS', category: 'Transportation', amount: Math.floor(Math.random() * 300) + 80 },
    { narration: 'NETFLIX SUBSCRIPTION', category: 'Entertainment', amount: 649 },
    { narration: 'BIGBASKET ORDER', category: 'Groceries', amount: Math.floor(Math.random() * 1200) + 400 },
    { narration: 'AIRTEL BROADBAND', category: 'Utilities', amount: 999 },
    { narration: 'APOLLO PHARMACY', category: 'Health', amount: Math.floor(Math.random() * 400) + 100 },
    { narration: 'ZOMATO ORDER', category: 'Food & Dining', amount: Math.floor(Math.random() * 500) + 120 },
    { narration: 'MYNTRA FASHION', category: 'Shopping', amount: Math.floor(Math.random() * 1500) + 500 },
    { narration: 'UBER TRIP', category: 'Transportation', amount: Math.floor(Math.random() * 250) + 60 },
    { narration: 'SPOTIFY PREMIUM', category: 'Entertainment', amount: 119 },
    { narration: 'JIOMART GROCERY', category: 'Groceries', amount: Math.floor(Math.random() * 800) + 200 },
  ];

  const merchant = merchants[index % merchants.length];
  const daysAgo = Math.floor(Math.random() * 45) + 1;
  const txnDate = new Date(Date.now() - daysAgo * 24 * 3600 * 1000);
  const modes = ['UPI', 'NEFT', 'IMPS', 'DEBIT_CARD'];

  return {
    txnId: `AA-TXN-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
    amount: merchant.amount,
    currency: 'INR',
    narration: merchant.narration,
    valueDate: txnDate.toISOString().split('T')[0],
    mode: modes[index % modes.length],
    type: 'DEBIT',
    _hint_category: merchant.category,
  };
}

/**
 * Transforms an AA FIP-format transaction into the internal Transaction format.
 * @param {object} aaTxn - AA-format transaction object
 * @param {string|import('mongoose').Types.ObjectId} userId - Mongo user ID
 * @param {string|import('mongoose').Types.ObjectId} dataSourceId - Mongo data source ID
 * @returns {object} Transaction document ready for DB insertion
 */
function transformAaTransaction(aaTxn, userId, dataSourceId) {
  const modeToChannel = {
    UPI: 'UPI',
    NEFT: 'netbanking',
    IMPS: 'netbanking',
    DEBIT_CARD: 'card',
  };

  return {
    user_id: userId,
    date: new Date(aaTxn.valueDate),
    amount: aaTxn.amount,
    merchant: aaTxn.narration,
    category: aaTxn._hint_category || 'Other',
    description: `AA Import — ${aaTxn.narration}`,
    channel: modeToChannel[aaTxn.mode] || 'other',
    is_anomaly: false,
    anomaly_score: 0,
    source: 'account_aggregator',
    external_id: aaTxn.txnId,
  };
}

/**
 * Step 1: Initiate AA consent — returns a mock consent_id and simulated redirect URL.
 * @param {string} userId - The authenticated user ID (for tracking)
 * @returns {{ consent_id: string, consent_url: string, expires_at: string }}
 */
function initiateConsent(userId) {
  const consentId = `CONSENT-${randomUUID().toUpperCase().replace(/-/g, '').slice(0, 16)}`;
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10-minute window

  consentStore.set(consentId, {
    userId,
    status: 'pending',
    createdAt: Date.now(),
    approvedAt: null,
  });

  // Auto-approve after 3 seconds to simulate user approving in the AA app
  setTimeout(() => {
    const entry = consentStore.get(consentId);
    if (entry && entry.status === 'pending') {
      entry.status = 'approved';
      entry.approvedAt = Date.now();
      logger.info({ consentId }, 'AA consent auto-approved (mock)');
    }
  }, 3000);

  logger.info({ consentId, userId }, 'AA consent initiated');

  return {
    consent_id: consentId,
    consent_url: `https://mock-aa-gateway.finexa.ai/consent/${consentId}`,
    expires_at: expiresAt.toISOString(),
  };
}

/**
 * Step 2: Poll consent status.
 * Returns 'pending' for the first 3 seconds, then 'approved'.
 * @param {string} consentId - The consent ID from initiateConsent
 * @returns {{ status: string, consent_id: string }}
 */
function getConsentStatus(consentId) {
  const entry = consentStore.get(consentId);

  if (!entry) {
    return { status: 'not_found', consent_id: consentId };
  }

  return {
    status: entry.status,
    consent_id: consentId,
    approved_at: entry.approvedAt ? new Date(entry.approvedAt).toISOString() : null,
  };
}

/**
 * Step 3: Fetch mock transaction data in AA FIP format.
 * Only succeeds if the consent is approved.
 * @param {string} consentId - Must be approved
 * @param {number} count - How many transactions to generate (default 15)
 * @returns {{ transactions: object[], bank_name: string, account_number: string }}
 */
function fetchAaData(consentId, count = 15) {
  const entry = consentStore.get(consentId);

  if (!entry) {
    throw new Error('Consent not found');
  }

  if (entry.status !== 'approved') {
    throw new Error('Consent not yet approved — please wait and retry');
  }

  const banks = ['HDFC Bank', 'ICICI Bank', 'SBI', 'Axis Bank', 'Kotak Bank'];
  const bankName = banks[Math.floor(Math.random() * banks.length)];
  const lastFour = Math.floor(1000 + Math.random() * 9000);

  const transactions = Array.from({ length: count }, (_, i) => generateAaTransaction(i));

  logger.info({ consentId, count, bankName }, 'AA data fetched (mock)');

  return {
    transactions,
    bank_name: bankName,
    account_number: `XXXX${lastFour}`,
    fetched_at: new Date().toISOString(),
  };
}

module.exports = {
  initiateConsent,
  getConsentStatus,
  fetchAaData,
  transformAaTransaction,
};
