const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');
const Transaction = require('../models/Transaction');

async function runSeed() {
  const seedPath = path.join(__dirname, '../../ai-service/seed_data.json');
  const raw = fs.readFileSync(seedPath, 'utf-8');
  const data = JSON.parse(raw);

  await mongoose.connect(process.env.MONGODB_URI);

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
      console.log(`Created user: ${createdUser.email}`);
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
        console.log(`Inserted ${userTransactions.length} transactions for ${user.email}`);
      }
    }

    console.log('Seed completed successfully.');
    console.log('Demo login: demo@smartspend.ai / demo1234');
  } finally {
    await mongoose.connection.close();
  }
}

runSeed().catch((error) => {
  console.error('Seed failed', error);
  mongoose.connection.close().finally(() => process.exit(1));
});
