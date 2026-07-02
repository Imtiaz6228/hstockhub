const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', index: true },
  type: { type: String, enum: ['payment', 'refund', 'wallet_credit', 'wallet_debit', 'withdrawal', 'commission'], required: true, index: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'CNY' },
  status: { type: String, enum: ['pending', 'completed', 'failed', 'cancelled'], default: 'pending', index: true },
  reference: { type: String, sparse: true, index: true },
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

transactionSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);