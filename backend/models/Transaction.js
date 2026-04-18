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
    is_recurring: {
      type: Boolean,
      default: false,
      index: true,
    },
    subscription_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription',
      default: null,
      index: true,
    },
    /** Which connector imported this transaction (null for existing seed records) */
    source: {
      type: String,
      enum: ['seed', 'account_aggregator', 'upi_gpay', 'upi_phonepe', 'manual', null],
      default: null,
    },
    /** External ID from the source system — used for deduplication */
    external_id: {
      type: String,
      default: null,
      sparse: true,
    },
  },
  {
    timestamps: true,
  }
);

transactionSchema.index({ user_id: 1, date: -1 });
transactionSchema.index({ user_id: 1, category: 1, date: -1 });
transactionSchema.index({ user_id: 1, external_id: 1 }, { sparse: true });

module.exports = mongoose.model('Transaction', transactionSchema);
