const { Product, Category, Order, Notification, SupportTicket } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { deliverPaidOrder } = require('../services/deliveryService');
const env = require('../config/env');

const me = asyncHandler(async (req, res) => {
  if (!req.user) return res.status(401).json({ user: null });
  res.json({ user: { id: req.user._id, email: req.user.email, role: req.user.role, name: req.user.name } });
});

const products = asyncHandler(async (req, res) => {
  const filter = { status: 'active' };
  if (req.query.q) filter.$text = { $search: String(req.query.q) };
  const rows = await Product.find(filter).limit(Math.min(Number(req.query.limit || 20), 100)).populate('category', 'name slug');
  res.json({ products: rows });
});

const categories = asyncHandler(async (req, res) => res.json({ categories: await Category.find({ active: true }).sort({ sortOrder: 1 }) }));

const buyerOrders = asyncHandler(async (req, res) => res.json({ orders: await Order.find({ buyer: req.user._id }).sort({ createdAt: -1 }).limit(100) }));
const notifications = asyncHandler(async (req, res) => res.json({ notifications: await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50) }));
const tickets = asyncHandler(async (req, res) => res.json({ tickets: await SupportTicket.find({ owner: req.user._id }).sort({ updatedAt: -1 }).limit(50) }));

const paymentWebhook = asyncHandler(async (req, res) => {
  if (req.get('x-webhook-secret') !== env.webhookSecret) return res.status(401).json({ error: 'Invalid webhook secret' });
  const result = await deliverPaidOrder({ buyer: req.body.buyerId, productId: req.body.productId, quantity: req.body.quantity, paymentReference: req.body.paymentReference });
  res.json({ ok: true, orderId: result.order._id });
});

module.exports = { me, products, categories, buyerOrders, notifications, tickets, paymentWebhook };