const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: String,
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 0 },
  deliveredStock: [{ type: mongoose.Schema.Types.ObjectId, ref: 'DigitalStock' }],
  deliveryStatus: { type: String, enum: ['pending', 'delivered', 'failed'], default: 'pending' }
}, { _id: true, timestamps: true });

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true, unique: true, index: true },
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  items: [orderItemSchema],
  subtotal: { type: Number, default: 0 },
  discountTotal: { type: Number, default: 0 },
  total: { type: Number, default: 0, index: true },
  currency: { type: String, default: 'CNY' },
  status: { type: String, enum: ['pending', 'paid', 'completed', 'cancelled', 'refunded', 'disputed'], default: 'pending', index: true },
  paymentStatus: { type: String, enum: ['unpaid', 'paid', 'failed', 'refunded', 'partially_refunded'], default: 'unpaid', index: true },
  deliveryStatus: { type: String, enum: ['pending', 'partial', 'delivered', 'failed'], default: 'pending' },
  paymentReference: { type: String, sparse: true, index: true },
  coupon: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' },
  paidAt: Date,
  completedAt: Date,
  invoiceNumber: { type: String, sparse: true, index: true }
}, { timestamps: true });

orderSchema.index({ buyer: 1, createdAt: -1 });
orderSchema.index({ 'items.seller': 1, createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);