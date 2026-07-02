const { Product, Order, DigitalStock, Notification, SupportTicket, User, Category, Transaction, Withdrawal, AuditLog, Wallet } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { decrypt } = require('../utils/crypto');
const { layout, escapeHtml } = require('../utils/view');

function stat(label, value) {
  return `<div class="card"><span class="muted">${escapeHtml(label)}</span><h2>${escapeHtml(value)}</h2></div>`;
}

const buyerDashboard = asyncHandler(async (req, res) => {
  const [orders, notifications, tickets, wallet] = await Promise.all([
    Order.find({ buyer: req.user._id }).sort({ createdAt: -1 }).limit(10),
    Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(10),
    SupportTicket.find({ owner: req.user._id }).sort({ updatedAt: -1 }).limit(10),
    Wallet.findOne({ user: req.user._id })
  ]);
  const orderRows = orders.map((o) => `<tr><td><a href="/buyer/orders/${o._id}">${escapeHtml(o.orderNumber)}</a></td><td>${escapeHtml(o.status)}</td><td>${o.total.toFixed(2)}</td><td>${o.createdAt.toISOString().slice(0, 10)}</td></tr>`).join('') || '<tr><td colspan="4">No orders yet.</td></tr>';
  res.send(layout({ title: 'Buyer dashboard', req, body: `<h1>Buyer Dashboard</h1><div class="grid">${stat('Orders', orders.length)}${stat('Wallet', wallet ? wallet.balance.toFixed(2) : '0.00')}${stat('Tickets', tickets.length)}${stat('Notifications', notifications.length)}</div><div class="card"><h2>Order history</h2><table><tr><th>Order</th><th>Status</th><th>Total</th><th>Date</th></tr>${orderRows}</table></div><div class="card"><h2>Security settings</h2><form method="post" action="/auth/change-password"><input type="hidden" name="_csrf" value="${req.csrfToken()}"><label>Current password</label><input name="currentPassword" type="password"><label>New password</label><input name="newPassword" type="password" minlength="8"><button>Change password</button></form></div>` }));
});

const buyerOrderDetail = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, buyer: req.user._id }).populate('items.deliveredStock');
  if (!order) return res.status(404).send(layout({ title: 'Not found', req, body: '<div class="card"><h1>Order not found</h1></div>' }));
  const itemRows = order.items.map((item) => `<tr><td>${escapeHtml(item.name)}</td><td>${item.quantity}</td><td>${item.total.toFixed(2)}</td><td><a href="/buyer/orders/${order._id}/download/${item._id}">Download digital goods</a></td></tr>`).join('');
  res.send(layout({ title: `Order ${order.orderNumber}`, req, body: `<h1>Order ${escapeHtml(order.orderNumber)}</h1><div class="card"><table><tr><th>Product</th><th>Qty</th><th>Total</th><th>Delivery</th></tr>${itemRows}</table></div>` }));
});

const buyerDownload = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.orderId, buyer: req.user._id }).populate({ path: 'items.deliveredStock', select: '+rawEncrypted format status' });
  if (!order) throw new AppError('Order not found', 404);
  const item = order.items.id(req.params.itemId);
  if (!item) throw new AppError('Order item not found', 404);
  const lines = item.deliveredStock.map((stock) => `${stock.format}: ${decrypt(stock.rawEncrypted)}`);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${order.orderNumber}-${item._id}.txt"`);
  res.send(lines.join('\n'));
});

const sellerDashboard = asyncHandler(async (req, res) => {
  const [products, orders, stock, withdrawals] = await Promise.all([
    Product.find({ seller: req.user._id }).sort({ createdAt: -1 }).limit(20),
    Order.find({ 'items.seller': req.user._id }).sort({ createdAt: -1 }).limit(20),
    DigitalStock.countDocuments({ seller: req.user._id, status: 'available' }),
    Withdrawal.find({ seller: req.user._id }).sort({ createdAt: -1 }).limit(10)
  ]);
  const productOptions = products.map((p) => `<option value="${p._id}">${escapeHtml(p.name)}</option>`).join('');
  const productRows = products.map((p) => `<tr><td>${escapeHtml(p.name)}</td><td>${escapeHtml(p.status)}</td><td>${p.price.toFixed(2)}</td><td>${p.stockCount}</td></tr>`).join('') || '<tr><td colspan="4">No products yet.</td></tr>';
  res.send(layout({ title: 'Seller dashboard', req, body: `<h1>Seller Dashboard</h1><div class="grid">${stat('Products', products.length)}${stat('Orders', orders.length)}${stat('Available stock', stock)}${stat('Withdrawals', withdrawals.length)}</div><div class="card"><h2>Product management</h2><table><tr><th>Name</th><th>Status</th><th>Price</th><th>Stock</th></tr>${productRows}</table></div><div class="card"><h2>Digital stock upload</h2><form method="post" action="/seller/stock"><input type="hidden" name="_csrf" value="${req.csrfToken()}"><label>Product</label><select name="productId">${productOptions}</select><label>Stock lines</label><textarea name="stockText" placeholder="email:password&#10;custom delivery text"></textarea><button>Upload stock</button></form></div>` }));
});

const adminDashboard = asyncHandler(async (req, res) => {
  const [users, sellersPending, productsPending, orders, categories, transactions, audits] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: 'seller', status: 'pending' }),
    Product.countDocuments({ status: 'pending' }),
    Order.countDocuments(),
    Category.countDocuments(),
    Transaction.countDocuments(),
    AuditLog.find().sort({ createdAt: -1 }).limit(10)
  ]);
  const auditRows = audits.map((a) => `<tr><td>${escapeHtml(a.action)}</td><td>${escapeHtml(a.ip || '')}</td><td>${a.createdAt.toISOString()}</td></tr>`).join('');
  res.send(layout({ title: 'Admin dashboard', req, body: `<h1>Administrator Panel</h1><div class="grid">${stat('Users', users)}${stat('Pending sellers', sellersPending)}${stat('Products pending moderation', productsPending)}${stat('Orders', orders)}${stat('Categories', categories)}${stat('Transactions', transactions)}</div><div class="card"><h2>Management modules</h2><p>User management · Seller approval/rejection · Product moderation · Categories · Orders · Payments · Refunds · Withdrawals · Disputes · Support · Coupons · CMS · SEO · Reports · Security logs · Settings · Backups · File manager · Notifications</p></div><div class="card"><h2>Audit logs</h2><table><tr><th>Action</th><th>IP</th><th>Date</th></tr>${auditRows}</table></div>` }));
});

module.exports = { buyerDashboard, buyerOrderDetail, buyerDownload, sellerDashboard, adminDashboard };