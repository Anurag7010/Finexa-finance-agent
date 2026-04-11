const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['overspend_pace', 'category_breach', 'anomaly', 'weekly_spike', 'nudge', 'risk_level'],
      required: true,
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high'],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      default: null,
    },
    amount: {
      type: Number,
      default: null,
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    triggered_at: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

alertSchema.index({ user_id: 1, triggered_at: -1 });

module.exports = mongoose.model('Alert', alertSchema);
