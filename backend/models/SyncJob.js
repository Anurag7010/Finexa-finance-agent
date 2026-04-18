const mongoose = require('mongoose');

/**
 * SyncJob model — tracks the progress and result of each data sync operation.
 * One SyncJob is created per sync trigger and polled by the frontend every 2s.
 */
const syncJobSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    data_source_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DataSource',
      required: true,
      index: true,
    },
    /** Current status of the sync operation */
    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed'],
      default: 'pending',
    },
    /** Number of transactions successfully imported */
    transactions_imported: {
      type: Number,
      default: 0,
    },
    /** Number of transactions skipped due to deduplication */
    transactions_skipped: {
      type: Number,
      default: 0,
    },
    /** Human-readable current step for UI display */
    current_step: {
      type: String,
      default: 'Initializing...',
    },
    /** Error message if status is 'failed' */
    error_message: {
      type: String,
      default: null,
    },
    /** When the job started processing */
    started_at: {
      type: Date,
      default: null,
    },
    /** When the job completed or failed */
    completed_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

syncJobSchema.index({ user_id: 1, createdAt: -1 });

module.exports = mongoose.model('SyncJob', syncJobSchema);
