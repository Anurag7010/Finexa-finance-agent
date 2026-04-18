const mongoose = require('mongoose');

const forecastPointSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    projected_balance: { type: Number, required: true },
    projected_spend: { type: Number, required: true },
  },
  { _id: false }
);

const recommendationSchema = new mongoose.Schema(
  {
    category: { type: String, required: true },
    message: { type: String, required: true },
    potential_saving: { type: Number, required: true, default: 0 },
  },
  { _id: false }
);

const categoryBreachSchema = new mongoose.Schema(
  {
    category: { type: String, required: true },
    spent: { type: Number, required: true },
    budget: { type: Number, required: true },
    percentage: { type: Number, required: true },
  },
  { _id: false }
);

const insightSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    health_score: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    risk_level: {
      type: String,
      enum: ['low', 'medium', 'high'],
      required: true,
    },
    risk_factors: {
      type: [String],
      default: [],
    },
    recommendations: {
      type: [recommendationSchema],
      default: [],
    },
    forecast: {
      type: [forecastPointSchema],
      default: [],
    },
    category_summary: {
      type: Map,
      of: Number,
      default: {},
    },
    category_breaches: {
      type: [categoryBreachSchema],
      default: [],
    },
    monthly_spend: {
      type: Number,
      default: 0,
    },
    monthly_budget: {
      type: Number,
      default: 0,
    },
    overspend_amount: {
      type: Number,
      default: 0,
    },
    savings_rate: {
      type: Number,
      default: 0,
    },
    top_category: {
      type: String,
      default: 'Other',
    },
    insight_type: {
      type: String,
      enum: ['analysis', 'monthly_plan'],
      default: 'analysis',
      index: true,
    },
    monthly_plan: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    generated_at: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

insightSchema.index({ user_id: 1, generated_at: -1 });
insightSchema.index({ user_id: 1, insight_type: 1, generated_at: -1 });

module.exports = mongoose.model('Insight', insightSchema);
