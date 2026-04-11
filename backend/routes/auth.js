const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function serializeUser(userDoc) {
  return {
    id: userDoc._id,
    name: userDoc.name,
    email: userDoc.email,
    income: userDoc.income,
    monthly_budget: userDoc.monthly_budget,
    category_budgets: Object.fromEntries(userDoc.category_budgets || new Map()),
    currency: userDoc.currency,
    createdAt: userDoc.createdAt,
    updatedAt: userDoc.updatedAt,
  };
}

router.post('/register', async (req, res) => {
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
    });

    const token = signToken(user);
    return res.status(201).json({ token, user: serializeUser(user) });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to register user' });
  }
});

router.post('/login', async (req, res) => {
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

module.exports = router;
