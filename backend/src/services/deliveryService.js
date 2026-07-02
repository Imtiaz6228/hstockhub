const mongoose = require('mongoose');
const { Product, DigitalStock, Inventory, Order, Notification, Transaction } = require('../models');
const { encrypt, decrypt, hashToken } = require('../utils/crypto');
const AppError = require('../utils/AppError');

function parseStockText(text) {
  return String(text || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((raw) => ({ raw, format: raw.includes(':') ? 'Delimited Credential' : 'Custom Text Delivery' }));
}

async function uploadDigitalStock({ seller, productId, text }) {
  const product = await Product.findOne({ _id: productId, seller });
  if (!product) throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
  const rows = parseStockText(text);
  let added = 0;
  for (const row of rows) {
    try {
      await DigitalStock.create({ seller, product: product._id, rawEncrypted: encrypt(row.raw), fingerprint: hashToken(row.raw), format: row.format, uploadedBy: seller });
      added += 1;
    } catch (error) {
      if (error.code !== 11000) throw error;
    }
  }
  await Inventory.findOneAndUpdate(
    { seller, product: product._id },
    { $inc: { total: added, available: added }, $setOnInsert: { lowStockThreshold: product.lowStockThreshold } },
    { upsert: true, new: true }
  );
  await Product.findByIdAndUpdate(product._id, { $inc: { stockCount: added } });
  return { added };
}

async function deliverPaidOrder({ buyer, productId, quantity = 1, paymentReference }) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const product = await Product.findOne({ _id: productId, status: 'active' }).session(session);
    if (!product) throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    const qty = Math.max(1, Number(quantity || 1));
    const stock = await DigitalStock.find({ product: product._id, status: 'available' }).sort({ createdAt: 1 }).limit(qty).select('+rawEncrypted').session(session);
    if (stock.length < qty) throw new AppError(`Out of stock. Available stock: ${stock.length}`, 409, 'OUT_OF_STOCK');

    const order = await Order.create([{
      orderNumber: `ORD-${Date.now()}-${Math.random().toString(16).slice(2, 8).toUpperCase()}`,
      buyer,
      items: [{ product: product._id, seller: product.seller, name: product.name, quantity: qty, unitPrice: product.price, total: product.price * qty, deliveredStock: stock.map((s) => s._id), deliveryStatus: 'delivered' }],
      subtotal: product.price * qty,
      total: product.price * qty,
      currency: product.currency,
      status: 'completed',
      paymentStatus: 'paid',
      deliveryStatus: 'delivered',
      paymentReference,
      paidAt: new Date(),
      completedAt: new Date()
    }], { session });

    await DigitalStock.updateMany({ _id: { $in: stock.map((s) => s._id) } }, { $set: { status: 'sold', order: order[0]._id, soldAt: new Date() } }, { session });
    await Inventory.findOneAndUpdate({ seller: product.seller, product: product._id }, { $inc: { available: -qty, sold: qty } }, { session });
    await Product.findByIdAndUpdate(product._id, { $inc: { stockCount: -qty, salesCount: qty } }, { session });
    await Transaction.create([{ user: buyer, order: order[0]._id, type: 'payment', amount: product.price * qty, currency: product.currency, status: 'completed', reference: paymentReference }], { session });
    await Notification.create([{ user: buyer, title: 'Digital goods delivered', message: `Order ${order[0].orderNumber} has been delivered.`, type: 'success', metadata: { order: order[0]._id } }], { session });

    await session.commitTransaction();
    return { order: order[0], delivered: stock.map((item) => ({ id: item._id, raw: decrypt(item.rawEncrypted), format: item.format })) };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

module.exports = { uploadDigitalStock, deliverPaidOrder, parseStockText };