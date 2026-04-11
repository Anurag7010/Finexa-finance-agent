const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    merchant: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    channel: {
      type: String,
      enum: ['UPI', 'card', 'netbanking', 'cash', 'other'],
      default: 'other',
      required: true,
    },
    is_anomaly: {
      type: Boolean,
      default: false,
    },
    anomaly_score: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

transactionSchema.index({ user_id: 1, date: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
