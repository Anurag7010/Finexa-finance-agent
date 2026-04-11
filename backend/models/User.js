const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const DEFAULT_CATEGORY_BUDGETS = {
  'Food & Dining': 8000,
  Transportation: 3000,
  Shopping: 7000,
  Entertainment: 3000,
  Utilities: 4000,
  Health: 3000,
  Groceries: 6000,
  Rent: 20000,
};

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    income: {
      type: Number,
      required: true,
      min: 0,
    },
    monthly_budget: {
      type: Number,
      required: true,
      min: 0,
    },
    category_budgets: {
      type: Map,
      of: Number,
      default: () => ({ ...DEFAULT_CATEGORY_BUDGETS }),
    },
    currency: {
      type: String,
      default: 'INR',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) {
    return;
  }

  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
