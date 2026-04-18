const express = require('express');
const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const authMiddleware = require('../middleware/auth');
const { categorize } = require('../services/aiService');
const { redisClient } = require('../lib/redis');
const logger = require('../lib/logger');

const router = express.Router();

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const limit = Math.max(parseInt(req.query.limit, 10) || 300, 1);
    const skip = Math.max(parseInt(req.query.skip, 10) || 0, 0);
    const { category, startDate, endDate } = req.query;

    const query = {
      user_id: req.user.id,
    };

    if (category) {
      query.category = category;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        query.date.$lte = new Date(endDate);
      }
    }

    const [transactions, total] = await Promise.all([
      Transaction.find(query)
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit),
      Transaction.countDocuments(query),
    ]);

    return res.json({ transactions, total });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

router.get('/summary', async (req, res) => {
  try {
    const cacheKey = `txn_summary:${req.user.id}`;
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        logger.info({ userId: req.user.id }, 'Transaction summary served from cache');
        return res.json(JSON.parse(cached));
      }
    } catch (cacheErr) {
      logger.warn({ err: cacheErr.message }, 'Redis cache read failed for summary');
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const userObjectId = mongoose.Types.ObjectId.createFromHexString(req.user.id);

    const summary = await Transaction.aggregate([
      {
        $match: {
          user_id: userObjectId,
          date: { $gte: startOfMonth },
        },
      },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
          avg: { $avg: '$amount' },
        },
      },
      { $sort: { total: -1 } },
    ]);

    const totalSpend = summary.reduce((acc, item) => acc + item.total, 0);
    const monthLabel = `${startOfMonth.getFullYear()}-${String(startOfMonth.getMonth() + 1).padStart(2, '0')}`;

    const result = {
      summary: summary.map((item) => ({
        category: item._id,
        total: item.total,
        count: item.count,
        avg: item.avg,
      })),
      totalSpend,
      month: monthLabel,
    };

    // Cache for 2 minutes
    try {
      await redisClient.setex(cacheKey, 120, JSON.stringify(result));
    } catch (cacheErr) {
      logger.warn({ err: cacheErr.message }, 'Redis cache write failed for summary');
    }

    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch transaction summary' });
  }
});

router.get('/anomalies', async (req, res) => {
  try {
    const anomalies = await Transaction.find({
      user_id: req.user.id,
      is_anomaly: true,
    })
      .sort({ date: -1 })
      .limit(20);

    return res.json({ anomalies });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch anomalies' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { amount, merchant, description, channel, date } = req.body;

    if (amount == null || !merchant || !description || !channel) {
      return res.status(400).json({ error: 'Missing required transaction fields' });
    }

    let category = 'Other';
    try {
      const categorization = await categorize(description, merchant, amount);
      if (categorization?.category) {
        category = categorization.category;
      }
    } catch (error) {
      category = 'Other';
    }

    const transaction = await Transaction.create({
      user_id: req.user.id,
      amount,
      merchant,
      description,
      channel,
      category,
      date: date ? new Date(date) : new Date(),
    });

    // Invalidate summary cache so next GET sees the new transaction
    try {
      await redisClient.del(`txn_summary:${req.user.id}`);
    } catch (cacheErr) {
      logger.warn({ err: cacheErr.message }, 'Failed to invalidate summary cache');
    }

    return res.status(201).json({ transaction });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create transaction' });
  }
});

module.exports = router;
