const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    merchant: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    frequency: {
      type: String,
      enum: ['weekly', 'monthly', 'annual'],
      required: true,
      index: true,
    },
    category: {
      type: String,
      default: 'Other',
      trim: true,
    },
    confidence_score: {
      type: Number,
      default: 0,
      min: 0,
      max: 1,
    },
    detected_at: {
      type: Date,
      default: Date.now,
      index: true,
    },
    last_charge_date: {
      type: Date,
      required: true,
    },
    next_predicted_date: {
      type: Date,
      required: true,
      index: true,
    },
    annual_cost: {
      type: Number,
      default: 0,
      min: 0,
    },
    is_confirmed: {
      type: Boolean,
      default: false,
      index: true,
    },
    is_dismissed: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

subscriptionSchema.index({ user_id: 1, merchant: 1, frequency: 1 }, { unique: true });
subscriptionSchema.index({ user_id: 1, is_dismissed: 1, next_predicted_date: 1 });

module.exports = mongoose.model('Subscription', subscriptionSchema);