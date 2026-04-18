const mongoose = require('mongoose');

/**
 * DataSource model — represents a connected bank account or data connector.
 * Each user always has at least one 'seed' type source that is non-deletable.
 */
const dataSourceSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    /** Connector type identifier */
    type: {
      type: String,
      enum: ['seed', 'account_aggregator', 'upi_gpay', 'upi_phonepe', 'manual'],
      required: true,
    },
    /** Current connection status */
    status: {
      type: String,
      enum: ['connected', 'syncing', 'error', 'disconnected'],
      default: 'connected',
    },
    /** Human-readable label shown in UI */
    account_name: {
      type: String,
      default: '',
    },
    /** Masked account number e.g. XXXX1234 */
    masked_account_number: {
      type: String,
      default: null,
    },
    /** Bank or provider name e.g. "HDFC Bank", "Google Pay" */
    bank_name: {
      type: String,
      default: null,
    },
    /** When did the last successful sync complete */
    last_sync_at: {
      type: Date,
      default: null,
    },
    /** Total transactions imported from this source */
    transactions_count: {
      type: Number,
      default: 0,
    },
    /** For AA connectors — when the consent token expires */
    consent_valid_until: {
      type: Date,
      default: null,
    },
    /** Flexible JSON for connector-specific metadata (consent_id, vpa, etc.) */
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

dataSourceSchema.index({ user_id: 1, type: 1 });

module.exports = mongoose.model('DataSource', dataSourceSchema);
