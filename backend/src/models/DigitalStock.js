const mongoose = require('mongoose');

const digitalStockSchema = new mongoose.Schema({
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  rawEncrypted: { type: String, required: true, select: false },
  fingerprint: { type: String, required: true, index: true },
  format: { type: String, default: 'Custom Text Delivery' },
  fieldsEncrypted: { type: String, select: false },
  status: { type: String, enum: ['available', 'reserved', 'sold', 'disabled'], default: 'available', index: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null, index: true },
  reservedAt: Date,
  soldAt: Date,
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

digitalStockSchema.index({ product: 1, status: 1, createdAt: 1 });
digitalStockSchema.index({ seller: 1, product: 1, fingerprint: 1 }, { unique: true });

module.exports = mongoose.model('DigitalStock', digitalStockSchema);