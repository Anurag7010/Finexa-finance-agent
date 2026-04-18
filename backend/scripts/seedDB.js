const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const config = require('../config/env');
const logger = require('../lib/logger');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

function resolveSeedPath() {
  const candidates = [
    process.env.SEED_DATA_PATH,
    path.join(__dirname, '../../ai-service/seed_data.json'),
    path.join(__dirname, '../../seed_data.json'),
    '/app/seed_data.json',
    '/ai-service/seed_data.json',
  ].filter(Boolean);

  const resolved = candidates.find((candidate) => fs.existsSync(candidate));
  if (!resolved) {
    throw new Error(
      `Unable to locate seed_data.json. Checked: ${candidates.join(', ')}`
    );
  }

  return resolved;
}

async function runSeed() {
  const seedPath = resolveSeedPath();
  const raw = fs.readFileSync(seedPath, 'utf-8');
  const data = JSON.parse(raw);

  logger.info({ seedPath }, 'Using seed data file');

  await mongoose.connect(config.mongodbUri);

  const userMap = new Map();

  try {
    const demoEmails = data.users.map((user) => user.email.toLowerCase());
    const existingUsers = await User.find({ email: { $in: demoEmails } }).select('_id');
    const existingUserIds = existingUsers.map((user) => user._id);

    if (existingUserIds.length) {
      await Transaction.deleteMany({ user_id: { $in: existingUserIds } });
    }

    await User.deleteMany({ email: { $in: demoEmails } });

    for (const userData of data.users) {
      const createdUser = await User.create({
        name: userData.name,
        email: userData.email,
        password: userData.password,
        monthly_budget: userData.monthly_budget,
        income: userData.income,
        category_budgets: userData.category_budgets,
      });

      userMap.set(userData.id, createdUser);
      logger.info({ email: createdUser.email }, 'Created user during seed');
    }

    for (const userData of data.users) {
      const user = userMap.get(userData.id);
      if (!user) {
        continue;
      }

      const userTransactions = data.transactions
        .filter((tx) => tx.user_id === userData.id)
        .map((tx) => ({
          user_id: user._id,
          date: new Date(tx.date),
          amount: tx.amount,
          merchant: tx.merchant,
          category: tx.category,
          description: tx.description,
          channel: tx.channel,
          is_anomaly: Boolean(tx.is_anomaly),
          anomaly_score: tx.is_anomaly
            ? Math.random() * 0.4 + 0.6
            : Math.random() * 0.3,
        }));

      if (userTransactions.length > 0) {
        await Transaction.insertMany(userTransactions);
        logger.info(
          { count: userTransactions.length, email: user.email },
          'Inserted transactions during seed'
        );
      }
    }

    logger.info('Seed completed successfully');
    logger.info('Demo login: demo@smartspend.ai / demo1234');
  } finally {
    await mongoose.connection.close();
  }
}

runSeed().catch((error) => {
  logger.error({ error }, 'Seed failed');
  mongoose.connection.close().finally(() => process.exit(1));
});
