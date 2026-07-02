const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  total: { type: Number, default: 0 },
  available: { type: Number, default: 0, index: true },
  sold: { type: Number, default: 0 },
  reserved: { type: Number, default: 0 },
  lowStockThreshold: { type: Number, default: 3 }
}, { timestamps: true });

inventorySchema.index({ seller: 1, product: 1 }, { unique: true });

module.exports = mongoose.model('Inventory', inventorySchema);