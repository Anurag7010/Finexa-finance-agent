const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const { authRateLimiter } = require('../middleware/rateLimiter');
const config = require('../config/env');

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email },
    config.jwtSecret,
    { expiresIn: '7d' }
  );
}

function normalizeCategoryBudgets(categoryBudgets) {
  if (!categoryBudgets) {
    return {};
  }

  if (categoryBudgets instanceof Map) {
    return Object.fromEntries(categoryBudgets);
  }

  if (Array.isArray(categoryBudgets)) {
    return Object.fromEntries(categoryBudgets);
  }

  if (typeof categoryBudgets === 'object') {
    return categoryBudgets;
  }

  return {};
}

function serializeUser(userDoc) {
  return {
    id: userDoc._id,
    name: userDoc.name,
    email: userDoc.email,
    income: userDoc.income,
    monthly_budget: userDoc.monthly_budget,
    category_budgets: normalizeCategoryBudgets(userDoc.category_budgets),
    currency: userDoc.currency,
    last_login_at: userDoc.last_login_at,
    createdAt: userDoc.createdAt,
    updatedAt: userDoc.updatedAt,
  };
}

router.post('/register', authRateLimiter, async (req, res) => {
  try {
    const { name, email, password, income, monthly_budget } = req.body;

    if (!name || !email || !password || income == null || monthly_budget == null) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
      income,
      monthly_budget,
      last_login_at: new Date(),
    });

    const token = signToken(user);
    return res.status(201).json({ token, user: serializeUser(user) });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to register user' });
  }
});

router.post('/login', authRateLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const validPassword = await user.comparePassword(password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    user.last_login_at = new Date();
    await user.save();

    const token = signToken(user);
    return res.json({ token, user: serializeUser(user) });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to login' });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user: serializeUser(user) });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
});

router.patch('/me', authMiddleware, async (req, res) => {
  try {
    const { income, monthly_budget } = req.body;

    const updates = {};

    if (income != null) {
      const numericIncome = Number(income);
      if (Number.isNaN(numericIncome) || numericIncome < 0) {
        return res.status(400).json({ error: 'income must be a non-negative number' });
      }
      updates.income = numericIncome;
    }

    if (monthly_budget != null) {
      const numericBudget = Number(monthly_budget);
      if (Number.isNaN(numericBudget) || numericBudget < 0) {
        return res.status(400).json({ error: 'monthly_budget must be a non-negative number' });
      }
      updates.monthly_budget = numericBudget;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'At least one field must be provided' });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user: serializeUser(user) });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;
