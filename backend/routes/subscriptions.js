const express = require('express');
const Subscription = require('../models/Subscription');
const Transaction = require('../models/Transaction');
const authMiddleware = require('../middleware/auth');
const logger = require('../lib/logger');
const {
  detectSubscriptions,
  normalizeMerchant,
} = require('../services/subscriptionDetector');

const router = express.Router();

router.use(authMiddleware);

/**
 * Runs recurring subscription detection and persists matches.
 */
async function detectAndPersistSubscriptions(userId) {
  const since = new Date();
  since.setDate(since.getDate() - 180);

  const transactions = await Transaction.find({
    user_id: userId,
    date: { $gte: since },
  })
    .select('merchant amount date category')
    .sort({ date: 1 })
    .lean();

  const detections = detectSubscriptions(transactions);

  for (const item of detections) {
    const updated = await Subscription.findOneAndUpdate(
      {
        user_id: userId,
        merchant: item.merchant,
        frequency: item.frequency,
      },
      {
        $set: {
          amount: item.amount,
          category: item.category,
          confidence_score: item.confidenceScore,
          detected_at: item.detectedAt,
          last_charge_date: item.lastChargeDate,
          next_predicted_date: item.nextPredictedDate,
          annual_cost: item.annualCost,
        },
        $setOnInsert: {
          is_confirmed: false,
          is_dismissed: false,
        },
      },
      {
        upsert: true,
        new: true,
      }
    );

    const candidateTxIds = transactions
      .filter((tx) => normalizeMerchant(tx.merchant) === item.merchantKey)
      .map((tx) => tx._id);

    if (candidateTxIds.length > 0) {
      await Transaction.updateMany(
        {
          user_id: userId,
          _id: { $in: candidateTxIds },
        },
        {
          $set: {
            is_recurring: true,
            subscription_id: updated._id,
          },
        }
      );
    }
  }

  return detections.length;
}

router.get('/', async (req, res) => {
  try {
    const detectedCount = await detectAndPersistSubscriptions(req.user.id);

    const subscriptions = await Subscription.find({
      user_id: req.user.id,
      is_dismissed: false,
    })
      .sort({ annual_cost: -1, next_predicted_date: 1 })
      .lean();

    const monthlyTotal = subscriptions.reduce((acc, item) => {
      if (item.frequency === 'weekly') {
        return acc + (item.amount * 52) / 12;
      }

      if (item.frequency === 'annual') {
        return acc + (item.amount / 12);
      }

      return acc + item.amount;
    }, 0);

    const annualTotal = subscriptions.reduce((acc, item) => acc + Number(item.annual_cost || 0), 0);

    return res.json({
      subscriptions,
      detected: detectedCount,
      totals: {
        monthly: Math.round(monthlyTotal * 100) / 100,
        annual: Math.round(annualTotal * 100) / 100,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch subscriptions');
    return res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

router.get('/total', async (req, res) => {
  try {
    const subscriptions = await Subscription.find({ user_id: req.user.id, is_dismissed: false }).lean();

    const monthly = subscriptions.reduce((acc, item) => {
      if (item.frequency === 'weekly') {
        return acc + (item.amount * 52) / 12;
      }

      if (item.frequency === 'annual') {
        return acc + (item.amount / 12);
      }

      return acc + item.amount;
    }, 0);

    const annual = subscriptions.reduce((acc, item) => acc + Number(item.annual_cost || 0), 0);

    return res.json({
      monthly: Math.round(monthly * 100) / 100,
      annual: Math.round(annual * 100) / 100,
      count: subscriptions.length,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch subscription totals');
    return res.status(500).json({ error: 'Failed to fetch subscription totals' });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      merchant,
      amount,
      frequency = 'monthly',
      category = 'Other',
      next_predicted_date,
      last_charge_date,
    } = req.body;

    const normalizedMerchant = String(merchant || '').trim();
    const numericAmount = Number(amount || 0);

    if (!normalizedMerchant) {
      return res.status(400).json({ error: 'merchant is required' });
    }

    if (!(numericAmount > 0)) {
      return res.status(400).json({ error: 'amount must be greater than 0' });
    }

    if (!['weekly', 'monthly', 'annual'].includes(String(frequency))) {
      return res.status(400).json({ error: 'frequency must be weekly, monthly or annual' });
    }

    const parsedLastCharge = last_charge_date ? new Date(last_charge_date) : new Date();
    const parsedNextCharge = next_predicted_date
      ? new Date(next_predicted_date)
      : (() => {
        const next = new Date(parsedLastCharge);
        if (frequency === 'weekly') {
          next.setDate(next.getDate() + 7);
        } else if (frequency === 'annual') {
          next.setFullYear(next.getFullYear() + 1);
        } else {
          next.setMonth(next.getMonth() + 1);
        }
        return next;
      })();

    if (Number.isNaN(parsedLastCharge.getTime()) || Number.isNaN(parsedNextCharge.getTime())) {
      return res.status(400).json({ error: 'Invalid charge dates provided' });
    }

    const annualCost = frequency === 'weekly'
      ? numericAmount * 52
      : frequency === 'annual'
        ? numericAmount
        : numericAmount * 12;

    const subscription = await Subscription.findOneAndUpdate(
      {
        user_id: req.user.id,
        merchant: normalizedMerchant,
        frequency,
      },
      {
        $set: {
          amount: numericAmount,
          category,
          confidence_score: 1,
          detected_at: new Date(),
          last_charge_date: parsedLastCharge,
          next_predicted_date: parsedNextCharge,
          annual_cost: Math.round(annualCost * 100) / 100,
          is_confirmed: true,
          is_dismissed: false,
        },
      },
      {
        upsert: true,
        new: true,
      }
    );

    return res.status(201).json({ subscription });
  } catch (error) {
    logger.error({ error }, 'Failed to create subscription');
    return res.status(500).json({ error: 'Failed to create subscription' });
  }
});

router.post('/:id/confirm', async (req, res) => {
  try {
    const subscription = await Subscription.findOneAndUpdate(
      {
        _id: req.params.id,
        user_id: req.user.id,
      },
      {
        $set: {
          is_confirmed: true,
          is_dismissed: false,
        },
      },
      { new: true }
    );

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    return res.json({ subscription });
  } catch (error) {
    logger.error({ error }, 'Failed to confirm subscription');
    return res.status(500).json({ error: 'Failed to confirm subscription' });
  }
});

router.post('/:id/dismiss', async (req, res) => {
  try {
    const subscription = await Subscription.findOneAndUpdate(
      {
        _id: req.params.id,
        user_id: req.user.id,
      },
      {
        $set: {
          is_dismissed: true,
          is_confirmed: false,
        },
      },
      { new: true }
    );

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    return res.json({ subscription });
  } catch (error) {
    logger.error({ error }, 'Failed to dismiss subscription');
    return res.status(500).json({ error: 'Failed to dismiss subscription' });
  }
});

module.exports = router;
