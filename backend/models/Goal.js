const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    target_amount: {
      type: Number,
      required: true,
      min: 1,
    },
    current_amount: {
      type: Number,
      default: 0,
      min: 0,
    },
    deadline: {
      type: Date,
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: ['emergency', 'vacation', 'device', 'custom'],
      default: 'custom',
    },
    monthly_contribution_needed: {
      type: Number,
      default: 0,
      min: 0,
    },
    feasibility_score: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    status: {
      type: String,
      enum: ['active', 'achieved', 'at_risk', 'paused'],
      default: 'active',
      index: true,
    },
    ai_plan: {
      type: String,
      default: '',
      trim: true,
    },
    deleted_at: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

goalSchema.index({ user_id: 1, status: 1, deleted_at: 1 });

module.exports = mongoose.model('Goal', goalSchema);