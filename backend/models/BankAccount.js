const mongoose = require('mongoose');

/**
 * BankAccount model stores normalized account metadata linked to a DataSource.
 */
const bankAccountSchema = new mongoose.Schema(
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
    account_name: {
      type: String,
      default: '',
      trim: true,
    },
    bank_name: {
      type: String,
      default: null,
      trim: true,
    },
    masked_account_number: {
      type: String,
      default: null,
      trim: true,
    },
    account_type: {
      type: String,
      enum: ['savings', 'current', 'credit', 'wallet', 'other'],
      default: 'other',
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'error'],
      default: 'active',
    },
    consent_valid_until: {
      type: Date,
      default: null,
    },
    last_synced_at: {
      type: Date,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

bankAccountSchema.index({ user_id: 1, data_source_id: 1 }, { unique: true });

module.exports = mongoose.model('BankAccount', bankAccountSchema);
