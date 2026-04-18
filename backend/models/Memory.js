const mongoose = require('mongoose');

const memorySchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    embedding: {
      type: [Number],
      default: [],
    },
    source: {
      type: String,
      enum: ['chat', 'insight', 'goal'],
      default: 'chat',
      index: true,
    },
    relevance_score: {
      type: Number,
      default: 0,
      min: 0,
      max: 1,
    },
  },
  {
    timestamps: true,
  }
);

memorySchema.index({ user_id: 1, createdAt: -1 });

module.exports = mongoose.model('Memory', memorySchema);