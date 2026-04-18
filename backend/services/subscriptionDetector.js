const KNOWN_SUBSCRIPTION_MERCHANTS = [
  'netflix',
  'spotify',
  'amazon prime',
  'hotstar',
  'zee5',
  'youtube premium',
  'linkedin premium',
  'notion',
  'figma',
  'github',
  'swiggy one',
  'zomato gold',
];

/**
 * Normalizes merchant labels for recurring-spend grouping.
 */
function normalizeMerchant(merchant) {
  return String(merchant || '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Computes a median value from numeric points.
 */
function median(values) {
  if (!values.length) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }

  return sorted[mid];
}

/**
 * Converts recurring frequency to projected annual spend.
 */
function annualCost(amount, frequency) {
  if (frequency === 'weekly') {
    return amount * 52;
  }

  if (frequency === 'annual') {
    return amount;
  }

  return amount * 12;
}

/**
 * Scores interval consistency and maps it to a likely frequency.
 */
function intervalSignal(intervalDays) {
  const med = median(intervalDays);

  if (med >= 28 && med <= 31) {
    return { frequency: 'monthly', intervalScore: 1, intervalDays: med };
  }

  if (med >= 6 && med <= 8) {
    return { frequency: 'weekly', intervalScore: 1, intervalDays: med };
  }

  if (med >= 360 && med <= 370) {
    return { frequency: 'annual', intervalScore: 1, intervalDays: med };
  }

  return { frequency: null, intervalScore: 0, intervalDays: med };
}

/**
 * Detects likely recurring subscriptions from transaction history.
 */
function detectSubscriptions(transactions) {
  const byMerchant = new Map();

  for (const tx of transactions || []) {
    const key = normalizeMerchant(tx.merchant);
    if (!key) {
      continue;
    }

    const arr = byMerchant.get(key) || [];
    arr.push(tx);
    byMerchant.set(key, arr);
  }

  const detections = [];

  for (const [merchantKey, items] of byMerchant.entries()) {
    if (items.length < 2) {
      continue;
    }

    const sorted = [...items].sort((a, b) => new Date(a.date) - new Date(b.date));
    const amounts = sorted.map((tx) => Number(tx.amount || 0)).filter((v) => v > 0);

    if (amounts.length < 2) {
      continue;
    }

    const intervals = [];
    for (let i = 1; i < sorted.length; i += 1) {
      const prev = new Date(sorted[i - 1].date).getTime();
      const curr = new Date(sorted[i].date).getTime();
      const diff = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
      if (diff > 0) {
        intervals.push(diff);
      }
    }

    if (!intervals.length) {
      continue;
    }

    const { frequency, intervalScore, intervalDays } = intervalSignal(intervals);
    if (!frequency) {
      continue;
    }

    const avgAmount = amounts.reduce((acc, value) => acc + value, 0) / amounts.length;
    const deviation = amounts.reduce((acc, value) => acc + Math.abs(value - avgAmount), 0) / amounts.length;
    const amountScore = avgAmount > 0
      ? Math.max(0, 1 - (deviation / avgAmount))
      : 0;

    const knownMerchantScore = KNOWN_SUBSCRIPTION_MERCHANTS.some((name) => merchantKey.includes(name)) ? 1 : 0;

    const confidence = (amountScore * 0.4) + (intervalScore * 0.4) + (knownMerchantScore * 0.2);

    if (confidence <= 0.7) {
      continue;
    }

    const latest = sorted[sorted.length - 1];
    const nextPredictedDate = new Date(new Date(latest.date).getTime() + (intervalDays * 24 * 60 * 60 * 1000));

    detections.push({
      merchant: latest.merchant,
      merchantKey,
      amount: Math.round(avgAmount * 100) / 100,
      frequency,
      category: latest.category || 'Other',
      confidenceScore: Math.round(confidence * 100) / 100,
      detectedAt: new Date(),
      lastChargeDate: new Date(latest.date),
      nextPredictedDate,
      annualCost: Math.round(annualCost(avgAmount, frequency) * 100) / 100,
    });
  }

  return detections.sort((a, b) => b.confidenceScore - a.confidenceScore);
}

module.exports = {
  detectSubscriptions,
  normalizeMerchant,
  KNOWN_SUBSCRIPTION_MERCHANTS,
};
