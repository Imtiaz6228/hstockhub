const crypto = require('crypto');

const LOW_STOCK_DEFAULT = 3;

function id(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
}

function now() {
  return new Date().toISOString();
}

function normalizeStock(raw) {
  return String(raw || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function parseStockLine(line, format = 'auto') {
  const raw = String(line || '').trim();
  if (!raw) return null;

  if (format === 'custom') {
    return {
      raw,
      format: 'Custom Text Delivery',
      fields: { delivery: raw },
      valid: true,
      error: null
    };
  }

  const useCsv = format === 'csv' || (raw.includes(',') && !raw.includes(':'));
  const parts = (useCsv ? raw.split(',') : raw.split(':')).map((part) => part.trim());
  let detected = 'Custom Text Delivery';
  let fields = { delivery: raw };

  if (parts.length >= 3 && parts[0] && parts[1] && parts[2]) {
    detected = parts[0].includes('@') ? 'Email:Password:Recovery' : 'Username:Password:Recovery';
    fields = parts[0].includes('@')
      ? { email: parts[0], password: parts[1], recovery: parts.slice(2).join(useCsv ? ',' : ':') }
      : { username: parts[0], password: parts[1], recovery: parts.slice(2).join(useCsv ? ',' : ':') };
  } else if (parts.length === 2 && parts[0] && parts[1]) {
    detected = parts[0].includes('@') ? 'Email:Password' : 'Username:Password';
    fields = parts[0].includes('@')
      ? { email: parts[0], password: parts[1] }
      : { username: parts[0], password: parts[1] };
  }

  const requiresPassword = detected !== 'Custom Text Delivery';
  if (requiresPassword && !fields.password) {
    return { raw, format: detected, fields, valid: false, error: 'Missing password' };
  }

  return { raw, format: detected, fields, valid: true, error: null };
}

function parseBulkStock(text, format = 'auto') {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines
    .filter((line, index) => !(index === 0 && format === 'csv' && /email|username|password|recovery/i.test(line)))
    .map((line, index) => ({ ...parseStockLine(line, format), line: index + 1 }))
    .filter(Boolean);
}

function inventoryCounters(db, productId, sellerId = null) {
  const rows = db.inventory.filter((item) => {
    return (!productId || item.productId === productId) && (!sellerId || item.sellerId === sellerId);
  });

  return {
    total: rows.length,
    available: rows.filter((item) => item.status === 'available').length,
    sold: rows.filter((item) => item.status === 'sold').length,
    reserved: rows.filter((item) => item.status === 'reserved').length
  };
}

function addNotification(db, userId, title, message, type = 'info', meta = {}) {
  db.notifications.unshift({
    id: id('ntf'),
    userId,
    title,
    message,
    type,
    meta,
    read: false,
    createdAt: now()
  });
}

function uploadStock(db, { sellerId, productId, text, format = 'auto' }) {
  const product = db.products.find((item) => item.id === productId);
  if (!product) throw new Error('Product not found');

  const parsed = parseBulkStock(text, format);
  const existing = new Set(db.inventory.map((item) => normalizeStock(item.raw)));
  const incoming = new Set();
  const results = [];
  let added = 0;
  let duplicates = 0;
  let invalid = 0;

  for (const row of parsed) {
    const key = normalizeStock(row.raw);
    const duplicate = existing.has(key) || incoming.has(key);
    if (!row.valid || duplicate) {
      if (duplicate) duplicates += 1;
      else invalid += 1;
      results.push({ ...row, valid: false, duplicate, error: duplicate ? 'Duplicate stock' : row.error });
      continue;
    }

    incoming.add(key);
    db.inventory.push({
      id: id('stk'),
      sellerId,
      productId,
      raw: row.raw,
      format: row.format,
      fields: row.fields,
      status: 'available',
      uploadedAt: now(),
      reservedAt: null,
      soldAt: null,
      orderId: null
    });
    added += 1;
    results.push({ ...row, valid: true, duplicate: false, error: null });
  }

  addNotification(db, sellerId, 'Stock upload processed', `${added} added, ${duplicates} duplicate, ${invalid} invalid.`, 'inventory', { productId });
  return { added, duplicates, invalid, results };
}

function deliverPaidOrder(db, { buyerId, productId, quantity, paymentReference = null }) {
  const buyer = db.users.find((user) => user.id === buyerId && user.role === 'buyer');
  if (!buyer) throw new Error('Buyer not found');

  const product = db.products.find((item) => item.id === productId);
  if (!product) throw new Error('Product not found');

  const qty = Math.max(1, Number(quantity || 1));
  const available = db.inventory
    .filter((item) => item.productId === productId && item.status === 'available')
    .sort((a, b) => new Date(a.uploadedAt) - new Date(b.uploadedAt));

  if (available.length < qty) {
    addNotification(db, buyerId, 'Out of stock', `${product.name} has only ${available.length} available.`, 'error', { productId });
    throw new Error(`Out of stock. Available stock: ${available.length}`);
  }

  const orderId = id('ord');
  const selected = available.slice(0, qty);
  const deliveredCredentials = selected.map((item) => ({
    stockId: item.id,
    sellerId: item.sellerId,
    raw: item.raw,
    format: item.format,
    fields: item.fields
  }));

  for (const item of selected) {
    item.status = 'sold';
    item.soldAt = now();
    item.orderId = orderId;
  }

  const order = {
    id: orderId,
    buyerId,
    productId,
    productName: product.name,
    quantity: qty,
    unitPrice: product.unitPrice,
    total: Number(product.unitPrice) * qty,
    status: 'completed',
    paymentStatus: 'paid',
    deliveryStatus: 'delivered',
    paymentReference,
    deliveredCredentials,
    createdAt: now(),
    paidAt: now(),
    deliveredAt: now()
  };

  db.orders.unshift(order);
  addNotification(db, buyerId, 'Credentials delivered instantly', `Order ${order.id} delivered ${qty} credential(s).`, 'success', { orderId });

  const sellerIds = [...new Set(selected.map((item) => item.sellerId))];
  for (const sellerId of sellerIds) {
    addNotification(db, sellerId, 'Automatic delivery completed', `Order ${order.id} delivered ${qty} credential(s).`, 'success', { orderId, productId });
  }

  const counters = inventoryCounters(db, productId);
  const threshold = Number(product.lowStockThreshold || LOW_STOCK_DEFAULT);
  if (counters.available === 0) {
    for (const admin of db.users.filter((user) => user.role === 'admin')) {
      addNotification(db, admin.id, 'Out of stock warning', `${product.name} is out of stock.`, 'error', { productId });
    }
  } else if (counters.available <= threshold) {
    for (const admin of db.users.filter((user) => user.role === 'admin')) {
      addNotification(db, admin.id, 'Low stock warning', `${product.name} has ${counters.available} available.`, 'warning', { productId });
    }
  }

  return order;
}

module.exports = {
  id,
  now,
  parseStockLine,
  parseBulkStock,
  normalizeStock,
  inventoryCounters,
  uploadStock,
  deliverPaidOrder,
  addNotification
};