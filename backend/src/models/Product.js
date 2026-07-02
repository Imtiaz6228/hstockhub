const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 180, text: true },
  slug: { type: String, required: true, lowercase: true, trim: true, index: true },
  description: { type: String, maxlength: 5000 },
  images: [String],
  price: { type: Number, required: true, min: 0, index: true },
  currency: { type: String, default: 'CNY' },
  status: { type: String, enum: ['draft', 'pending', 'active', 'rejected', 'suspended'], default: 'pending', index: true },
  deliveryType: { type: String, enum: ['digital_stock', 'manual', 'download'], default: 'digital_stock' },
  stockCount: { type: Number, default: 0, min: 0 },
  lowStockThreshold: { type: Number, default: 3 },
  tags: [{ type: String, trim: true, lowercase: true }],
  moderatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  moderatedAt: Date,
  rejectionReason: String,
  salesCount: { type: Number, default: 0 },
  ratingAverage: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 }
}, { timestamps: true });

productSchema.index({ seller: 1, slug: 1 }, { unique: true });
productSchema.index({ status: 1, category: 1, price: 1 });
productSchema.index({ name: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Product', productSchema);