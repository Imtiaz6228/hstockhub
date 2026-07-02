(function () {
  'use strict';

  var STORAGE_KEY = 'hstockhub_auto_delivery_v1';
  var currency = '¥';

  function uid(prefix) {
    return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8).toUpperCase();
  }

  function nowIso() { return new Date().toISOString(); }
  function fmtDate(value) { return value ? new Date(value).toLocaleString() : '-'; }
  function money(value) { return currency + Number(value || 0).toFixed(2); }
  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function toast(message, type) {
    var n = document.createElement('div');
    n.className = 'hy-toast hy-toast--' + (type || 'info');
    n.textContent = message;
    document.body.appendChild(n);
    setTimeout(function () { n.classList.add('show'); }, 20);
    setTimeout(function () { n.classList.remove('show'); setTimeout(function () { n.remove(); }, 220); }, 3200);
  }

  var defaultProducts = [
    { id: 'gmail', name: 'Gmail Accounts', unitPrice: 18, lowStockThreshold: 3 },
    { id: 'telegram', name: 'Telegram Accounts', unitPrice: 25, lowStockThreshold: 3 },
    { id: 'facebook-bm', name: 'Facebook BM Accounts', unitPrice: 88, lowStockThreshold: 2 },
    { id: 'custom', name: 'Custom Text Delivery', unitPrice: 10, lowStockThreshold: 5 }
  ];

  function blankState() {
    return { products: defaultProducts.slice(), inventory: [], orders: [], notifications: [] };
  }

  function loadState() {
    try {
      var parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!parsed || !Array.isArray(parsed.inventory)) return blankState();
      parsed.products = Array.isArray(parsed.products) && parsed.products.length ? parsed.products : defaultProducts.slice();
      parsed.orders = Array.isArray(parsed.orders) ? parsed.orders : [];
      parsed.notifications = Array.isArray(parsed.notifications) ? parsed.notifications : [];
      return parsed;
    } catch (e) {
      return blankState();
    }
  }

  function saveState(state) { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

  function getProduct(state, productId) {
    return (state.products || []).find(function (p) { return p.id === productId; }) || state.products[0] || defaultProducts[0];
  }

  function normalizeRaw(value) { return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase(); }

  function parseLine(line, mode) {
    var raw = String(line || '').trim();
    if (!raw) return null;
    var result = { raw: raw, format: 'custom', fields: {}, valid: true, warning: '' };
    if (mode === 'custom') {
      result.format = 'Custom Text Delivery';
      result.fields = { delivery: raw };
      return result;
    }
    var csv = raw.indexOf(',') >= 0 && raw.indexOf(':') < 0;
    var parts;
    if (mode === 'csv' || csv) {
      parts = raw.split(',').map(function (p) { return p.trim(); });
      if (parts.length >= 3) {
        result.format = 'Email:Password:Recovery';
        result.fields = { email: parts[0], password: parts[1], recovery: parts.slice(2).join(', ') };
      } else if (parts.length === 2) {
        result.format = parts[0].indexOf('@') > -1 ? 'Email:Password' : 'Username:Password';
        result.fields = parts[0].indexOf('@') > -1 ? { email: parts[0], password: parts[1] } : { username: parts[0], password: parts[1] };
      } else {
        result.format = 'Custom Text Delivery';
        result.fields = { delivery: raw };
      }
    } else if (raw.indexOf(':') > -1) {
      parts = raw.split(':').map(function (p) { return p.trim(); });
      if (parts.length >= 3) {
        result.format = 'Email:Password:Recovery';
        result.fields = { email: parts[0], password: parts[1], recovery: parts.slice(2).join(':') };
      } else if (parts.length === 2) {
        result.format = parts[0].indexOf('@') > -1 ? 'Email:Password' : 'Username:Password';
        result.fields = parts[0].indexOf('@') > -1 ? { email: parts[0], password: parts[1] } : { username: parts[0], password: parts[1] };
      }
    } else {
      result.format = 'Custom Text Delivery';
      result.fields = { delivery: raw };
    }

    if ((result.format === 'Email:Password' || result.format === 'Email:Password:Recovery') && !result.fields.email) {
      result.valid = false;
      result.warning = 'Missing email';
    }
    if ((result.format === 'Username:Password') && !result.fields.username) {
      result.valid = false;
      result.warning = 'Missing username';
    }
    if (result.format !== 'Custom Text Delivery' && !result.fields.password) {
      result.valid = false;
      result.warning = 'Missing password';
    }
    return result;
  }

  function parseStock(text, mode, productId) {
    var state = loadState();
    var existing = new Set(state.inventory.map(function (i) { return normalizeRaw(i.raw); }));
    var incoming = new Set();
    var lines = String(text || '').split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
    var rows = [];
    lines.forEach(function (line, idx) {
      if (idx === 0 && mode === 'csv' && /email|username|password|recovery/i.test(line)) return;
      var parsed = parseLine(line, mode);
      if (!parsed) return;
      var key = normalizeRaw(parsed.raw);
      parsed.productId = productId;
      parsed.line = idx + 1;
      parsed.duplicate = existing.has(key) || incoming.has(key);
      if (parsed.duplicate) {
        parsed.valid = false;
        parsed.warning = existing.has(key) ? 'Duplicate already in inventory' : 'Duplicate in upload';
      }
      incoming.add(key);
      rows.push(parsed);
    });
    return rows;
  }

  function addStock(productId, rows) {
    var state = loadState();
    var validRows = rows.filter(function (r) { return r.valid; });
    validRows.forEach(function (row) {
      state.inventory.push({
        id: uid('STK'),
        productId: productId,
        raw: row.raw,
        format: row.format,
        fields: row.fields,
        status: 'available',
        uploadedAt: nowIso(),
        soldAt: null,
        reservedAt: null,
        orderId: null
      });
    });
    saveState(state);
    return validRows.length;
  }

  function counters(state, productId) {
    var items = state.inventory.filter(function (i) { return !productId || i.productId === productId; });
    return {
      total: items.length,
      available: items.filter(function (i) { return i.status === 'available'; }).length,
      sold: items.filter(function (i) { return i.status === 'sold'; }).length,
      reserved: items.filter(function (i) { return i.status === 'reserved'; }).length
    };
  }

  function createNotification(state, title, message, type, orderId) {
    state.notifications.unshift({ id: uid('NTF'), title: title, message: message, type: type || 'info', orderId: orderId || null, createdAt: nowIso(), read: false });
  }

  function deliverAfterPayment(productId, quantity, customer) {
    var state = loadState();
    var product = getProduct(state, productId);
    var qty = Math.max(1, Number(quantity || 1));
    var available = state.inventory
      .filter(function (i) { return i.productId === productId && i.status === 'available'; })
      .sort(function (a, b) { return new Date(a.uploadedAt) - new Date(b.uploadedAt); });

    if (available.length < qty) {
      createNotification(state, 'Out of stock', product.name + ' needs ' + qty + ' unit(s), but only ' + available.length + ' are available.', 'error');
      saveState(state);
      return { ok: false, message: 'Out of stock. Available stock: ' + available.length };
    }

    var orderId = uid('HY');
    var selected = available.slice(0, qty);
    selected.forEach(function (item) {
      item.status = 'sold';
      item.soldAt = nowIso();
      item.orderId = orderId;
    });

    var order = {
      id: orderId,
      productId: product.id,
      productName: product.name,
      quantity: qty,
      unitPrice: product.unitPrice,
      total: qty * Number(product.unitPrice || 0),
      status: 'completed',
      paymentStatus: 'paid',
      customer: customer || 'Demo Customer',
      createdAt: nowIso(),
      deliveredAt: nowIso(),
      deliveredCredentials: selected.map(function (item) {
        return { stockId: item.id, raw: item.raw, format: item.format, fields: item.fields };
      })
    };
    state.orders.unshift(order);
    createNotification(state, 'Credentials delivered instantly', order.quantity + ' credential(s) for ' + order.productName + ' are now available in your dashboard.', 'success', order.id);
    var next = counters(state, product.id);
    if (next.available === 0) createNotification(state, 'Out of stock warning', product.name + ' has no available inventory left.', 'error');
    else if (next.available <= Number(product.lowStockThreshold || 3)) createNotification(state, 'Low stock warning', product.name + ' has only ' + next.available + ' unit(s) available.', 'warning');
    saveState(state);
    return { ok: true, order: order };
  }

  function seedDemoStock() {
    var rows = parseStock('email1@gmail.com:password\nemail2@gmail.com:password\nemail3@gmail.com:password', 'auto', 'gmail');
    return addStock('gmail', rows);
  }

  function resetDemo() {
    saveState(blankState());
  }

  function renderProductOptions(select, selected) {
    var state = loadState();
    select.innerHTML = state.products.map(function (p) {
      return '<option value="' + esc(p.id) + '" ' + (p.id === selected ? 'selected' : '') + '>' + esc(p.name) + '</option>';
    }).join('');
  }

  function renderSeller() {
    var root = document.querySelector('[data-auto-delivery-seller]');
    if (!root) return;
    var previewRows = [];
    root.innerHTML = sellerTemplate();
    var productSelect = root.querySelector('[data-stock-product]');
    var customerProductSelect = root.querySelector('[data-demo-product]');
    renderProductOptions(productSelect, 'gmail');
    renderProductOptions(customerProductSelect, 'gmail');

    function readUploadText() {
      var single = root.querySelector('[data-single-stock]').value.trim();
      var bulk = root.querySelector('[data-bulk-stock]').value.trim();
      return [single, bulk].filter(Boolean).join('\n');
    }

    function refresh() {
      var state = loadState();
      var productId = productSelect.value || 'gmail';
      var c = counters(state, productId);
      var sales = state.orders.reduce(function (sum, order) { return sum + Number(order.total || 0); }, 0);
      var demoFields = {
        '[data-demo-seller-products]': state.products.length,
        '[data-demo-seller-orders]': state.orders.length,
        '[data-demo-seller-paid]': state.orders.filter(function (order) { return order.paymentStatus === 'paid'; }).length + ' Paid',
        '[data-demo-seller-sales]': money(sales),
        '[data-demo-recent-count]': Math.min(state.orders.length, 5)
      };
      Object.keys(demoFields).forEach(function (selector) {
        var node = root.querySelector(selector);
        if (node) node.textContent = demoFields[selector];
      });
      root.querySelector('[data-total-stock]').textContent = c.total;
      root.querySelector('[data-available-stock]').textContent = c.available;
      root.querySelector('[data-sold-stock]').textContent = c.sold;
      root.querySelector('[data-reserved-stock]').textContent = c.reserved;
      var product = getProduct(state, productId);
      var warning = root.querySelector('[data-stock-warning]');
      warning.className = 'hy-stock-warning ' + (c.available === 0 ? 'danger' : c.available <= product.lowStockThreshold ? 'warn' : 'ok');
      warning.textContent = c.available === 0 ? 'Out of stock warning' : c.available <= product.lowStockThreshold ? 'Low stock warning: threshold ' + product.lowStockThreshold : 'Stock healthy';
      renderInventoryTable(root, state, productId);
      renderSellerOrders(root, state);
    }

    function renderPreview() {
      previewRows = parseStock(readUploadText(), root.querySelector('[data-stock-format]').value, productSelect.value);
      var body = root.querySelector('[data-preview-body]');
      var summary = root.querySelector('[data-preview-summary]');
      var valid = previewRows.filter(function (r) { return r.valid; }).length;
      var invalid = previewRows.length - valid;
      summary.textContent = previewRows.length ? valid + ' valid / ' + invalid + ' rejected' : 'No rows to preview';
      body.innerHTML = previewRows.length ? previewRows.map(function (r) {
        return '<tr><td>' + r.line + '</td><td><code>' + esc(r.raw) + '</code></td><td>' + esc(r.format) + '</td><td><span class="hy-status ' + (r.valid ? 'approved' : 'rejected') + '">' + (r.valid ? 'Valid' : esc(r.warning)) + '</span></td></tr>';
      }).join('') : '<tr><td colspan="4">Paste stock, upload TXT/CSV, or enter a single credential to preview.</td></tr>';
    }

    root.querySelector('[data-preview-stock]').addEventListener('click', renderPreview);
    root.querySelector('[data-upload-stock]').addEventListener('click', function () {
      if (!previewRows.length) renderPreview();
      var count = addStock(productSelect.value, previewRows);
      if (count) {
        root.querySelector('[data-single-stock]').value = '';
        root.querySelector('[data-bulk-stock]').value = '';
        previewRows = [];
        root.querySelector('[data-preview-body]').innerHTML = '<tr><td colspan="4">Uploaded successfully. Add more stock any time.</td></tr>';
        toast(count + ' stock item(s) uploaded.', 'success');
      } else {
        toast('No valid stock rows to upload.', 'error');
      }
      refresh();
    });
    root.querySelector('[data-file-stock]').addEventListener('change', function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        root.querySelector('[data-bulk-stock]').value = String(reader.result || '');
        root.querySelector('[data-stock-format]').value = /\.csv$/i.test(file.name) ? 'csv' : 'auto';
        renderPreview();
      };
      reader.readAsText(file);
    });
    root.querySelector('[data-seed-demo]').addEventListener('click', function () { var count = seedDemoStock(); toast(count ? 'Demo Gmail stock seeded.' : 'Demo stock already exists.', count ? 'success' : 'info'); refresh(); });
    root.querySelector('[data-reset-demo]').addEventListener('click', function () { if (confirm('Reset all demo inventory, orders, and notifications?')) { resetDemo(); toast('Demo data reset.', 'info'); renderProductOptions(productSelect, 'gmail'); renderProductOptions(customerProductSelect, 'gmail'); refresh(); } });
    productSelect.addEventListener('change', refresh);
    root.querySelector('[data-demo-pay]').addEventListener('click', function () {
      var result = deliverAfterPayment(customerProductSelect.value, root.querySelector('[data-demo-qty]').value, 'Demo Customer');
      if (result.ok) toast('Payment successful. Order ' + result.order.id + ' delivered instantly.', 'success');
      else toast(result.message, 'error');
      refresh();
    });
    root.querySelector('[data-bulk-delete]').addEventListener('click', function () {
      var ids = Array.prototype.slice.call(root.querySelectorAll('[data-stock-select]:checked')).map(function (input) { return input.value; });
      if (!ids.length) { toast('Select inventory rows first.', 'warning'); return; }
      if (!confirm('Delete ' + ids.length + ' selected stock item(s)?')) return;
      var state = loadState();
      state.inventory = state.inventory.filter(function (i) { return ids.indexOf(i.id) === -1; });
      saveState(state);
      toast(ids.length + ' stock item(s) deleted.', 'info');
      refresh();
    });
    root.querySelector('[data-bulk-edit]').addEventListener('click', function () {
      var ids = Array.prototype.slice.call(root.querySelectorAll('[data-stock-select]:checked')).map(function (input) { return input.value; });
      if (!ids.length) { toast('Select inventory rows first.', 'warning'); return; }
      var suffix = prompt('Append note/text to selected available stock rows:', ' | edited');
      if (suffix == null) return;
      var state = loadState();
      state.inventory.forEach(function (i) {
        if (ids.indexOf(i.id) > -1 && i.status === 'available') i.raw += suffix;
      });
      saveState(state);
      toast('Bulk edit applied to selected available rows.', 'success');
      refresh();
    });
    root.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-delete-stock],[data-save-stock]');
      if (!btn) return;
      var id = btn.getAttribute('data-delete-stock') || btn.getAttribute('data-save-stock');
      var state = loadState();
      var item = state.inventory.find(function (i) { return i.id === id; });
      if (!item) return;
      if (btn.hasAttribute('data-delete-stock')) {
        state.inventory = state.inventory.filter(function (i) { return i.id !== id; });
        saveState(state);
        toast('Stock deleted.', 'info');
        refresh();
      } else {
        var input = root.querySelector('[data-edit-stock="' + id + '"]');
        var parsed = parseLine(input.value, 'auto');
        if (!parsed || !parsed.valid) { toast('Invalid stock value.', 'error'); return; }
        item.raw = parsed.raw; item.format = parsed.format; item.fields = parsed.fields;
        saveState(state);
        toast('Stock updated.', 'success');
        refresh();
      }
    });
    refresh();
  }

  function renderInventoryTable(root, state, productId) {
    var body = root.querySelector('[data-inventory-body]');
    var filter = root.querySelector('[data-stock-filter]').value;
    var rows = state.inventory.filter(function (i) { return i.productId === productId && (!filter || i.status === filter); });
    body.innerHTML = rows.length ? rows.map(function (i) {
      return '<tr><td><input type="checkbox" data-stock-select value="' + esc(i.id) + '"></td><td><input type="text" value="' + esc(i.raw) + '" data-edit-stock="' + esc(i.id) + '"></td><td>' + esc(i.format) + '</td><td><span class="hy-status ' + (i.status === 'sold' ? 'approved' : i.status === 'reserved' ? 'pending' : 'approved') + '">' + esc(i.status) + '</span></td><td>' + fmtDate(i.uploadedAt) + '</td><td><button class="hy-mini" data-save-stock="' + esc(i.id) + '">Save</button> <button class="hy-mini danger" data-delete-stock="' + esc(i.id) + '">Delete</button></td></tr>';
    }).join('') : '<tr><td colspan="6">No stock for this product/filter.</td></tr>';
    var filterEl = root.querySelector('[data-stock-filter]');
    if (!filterEl.dataset.bound) { filterEl.dataset.bound = '1'; filterEl.addEventListener('change', function () { renderInventoryTable(root, loadState(), productId); }); }
  }

  function renderSellerOrders(root, state) {
    var body = root.querySelector('[data-seller-orders-body]');
    body.innerHTML = state.orders.length ? state.orders.slice(0, 8).map(function (o) {
      return '<tr><td>' + esc(o.id) + '</td><td>' + esc(o.productName) + '</td><td>' + o.quantity + '</td><td><span class="hy-status approved">Delivered</span></td><td>' + money(o.total) + '</td></tr>';
    }).join('') : '<tr><td colspan="5">Orders will appear immediately after successful payment delivery.</td></tr>';
  }

  function sellerTemplate() {
    return '<section class="hy-seller-center"><div class="hy-seller-breadcrumb">Home › <strong>Seller Center</strong></div><div class="hy-seller-tabs"><a class="active" href="#overview">Seller Center</a><a href="#inventory">Product List</a><a href="#orders">My order</a></div><div class="hy-seller-hero"><h2>Seller Center</h2><p>Welcome back! Quickly check your balance, products, orders, and sales. This static demo unlocks for an approved seller.</p><span>Real-time data</span></div><div class="hy-seller-metrics"><div class="hy-seller-metric cyan"><small>Seller Balance</small><strong>¥310.88</strong><em>Frozen: ¥564.19</em></div><div class="hy-seller-metric blue"><small>Product</small><strong data-demo-seller-products>0</strong><em>Approved listings</em></div><div class="hy-seller-metric green"><small>Total Orders</small><strong data-demo-seller-orders>0</strong><em data-demo-seller-paid>0 Paid</em></div><div class="hy-seller-metric yellow"><small>Total Sales</small><strong data-demo-seller-sales>¥0.00</strong><em>Withdrawn: ¥1,268.00</em></div></div><div class="hy-seller-recent"><h3>Recent 5 sales <span data-demo-recent-count>0</span></h3><a href="#orders">View all ›</a></div></section><section id="inventory" class="hy-card hy-panel hy-auto-panel"><div class="hy-section-title"><div><h3>Automatic Delivery Inventory</h3><p>Upload stock once. After payment, the system picks the first available credential, delivers it instantly, removes it from available inventory, and saves the order.</p></div><div class="hy-actions"><button class="hy-btn secondary" data-seed-demo>Seed demo stock</button><button class="hy-btn secondary" data-reset-demo>Reset demo</button></div></div><div class="hy-grid cols-4 hy-stock-metrics"><div class="hy-card hy-stat"><span>Total Stock</span><strong data-total-stock>0</strong></div><div class="hy-card hy-stat"><span>Available Stock</span><strong data-available-stock>0</strong></div><div class="hy-card hy-stat"><span>Sold Stock</span><strong data-sold-stock>0</strong></div><div class="hy-card hy-stat"><span>Reserved Stock</span><strong data-reserved-stock>0</strong></div></div><div data-stock-warning class="hy-stock-warning ok">Stock healthy</div><div class="hy-grid cols-2" style="margin-top:18px"><div><h4>Seller Upload Stock</h4><div class="hy-inline"><div class="hy-field"><label>Product</label><select data-stock-product></select></div><div class="hy-field"><label>Format</label><select data-stock-format><option value="auto">Auto detect</option><option value="colon">Email:Password / Username:Password</option><option value="csv">CSV Upload</option><option value="custom">Custom Text Delivery</option></select></div></div><div class="hy-field"><label>Single Upload</label><input data-single-stock placeholder="email@gmail.com:password or custom delivery text"></div><div class="hy-field"><label>Bulk Upload</label><textarea data-bulk-stock placeholder="email1@gmail.com:password&#10;email2@gmail.com:password:recovery&#10;username:password&#10;custom delivery text"></textarea></div><div class="hy-field"><label>TXT / CSV Upload</label><input type="file" data-file-stock accept=".txt,.csv,text/plain,text/csv"></div><div class="hy-actions"><button class="hy-btn secondary" data-preview-stock>Preview & Validate</button><button class="hy-btn green" data-upload-stock>Upload Valid Stock</button></div></div><div><h4>Stock Preview & Validation</h4><p class="hy-note" data-preview-summary>No rows to preview</p><div class="hy-table-wrap"><table class="hy-table"><thead><tr><th>Line</th><th>Credential</th><th>Format</th><th>Status</th></tr></thead><tbody data-preview-body><tr><td colspan="4">Paste stock, upload TXT/CSV, or enter a single credential to preview.</td></tr></tbody></table></div></div></div></section><section class="hy-card hy-panel" style="margin-top:18px"><div class="hy-section-title"><div><h3>Bulk Edit / Bulk Delete</h3><p>Review, edit, save, or delete inventory. Sold rows are retained for audit and delivered credential history.</p></div><div class="hy-actions"><button class="hy-btn secondary" data-bulk-edit>Bulk Edit Selected</button><button class="hy-btn secondary" data-bulk-delete>Bulk Delete Selected</button><select data-stock-filter><option value="">All Statuses</option><option value="available">Available</option><option value="reserved">Reserved</option><option value="sold">Sold</option></select></div></div><div class="hy-table-wrap"><table class="hy-table"><thead><tr><th>Select</th><th>Stock</th><th>Format</th><th>Status</th><th>Uploaded</th><th>Actions</th></tr></thead><tbody data-inventory-body></tbody></table></div></section><section class="hy-card hy-panel" style="margin-top:18px"><h3>Payment Success Simulator</h3><p class="hy-note">In production this is called by the payment webhook after a paid transaction. In this static prototype, use the button to trigger the same instant delivery flow.</p><div class="hy-inline"><div class="hy-field"><label>Product</label><select data-demo-product></select></div><div class="hy-field"><label>Quantity</label><input type="number" data-demo-qty min="1" value="1"></div></div><button class="hy-btn orange" data-demo-pay>Simulate Successful Payment & Auto Deliver</button></section><section id="orders" class="hy-card hy-panel" style="margin-top:18px"><h3>Seller Orders</h3><table class="hy-table"><thead><tr><th>Order</th><th>Product</th><th>Qty</th><th>Status</th><th>Total</th></tr></thead><tbody data-seller-orders-body></tbody></table></section>';
  }

  function renderCustomer() {
    var root = document.querySelector('[data-auto-delivery-customer]');
    if (!root) return;
    root.innerHTML = customerTemplate();
    var select = root.querySelector('[data-buy-product]');
    renderProductOptions(select, 'gmail');
    function refresh() {
      var state = loadState();
      var c = counters(state);
      root.querySelector('[data-customer-orders]').textContent = state.orders.length;
      root.querySelector('[data-customer-delivered]').textContent = state.orders.reduce(function (sum, o) { return sum + Number(o.quantity || 0); }, 0);
      root.querySelector('[data-customer-available]').textContent = c.available;
      root.querySelector('[data-customer-notifications]').textContent = state.notifications.filter(function (n) { return !n.read; }).length;
      renderCustomerOrders(root, state);
      renderNotifications(root, state);
      renderCatalog(root, state);
    }
    root.querySelector('[data-customer-pay]').addEventListener('click', function () {
      var result = deliverAfterPayment(select.value, root.querySelector('[data-buy-qty]').value, 'Demo Customer');
      if (result.ok) toast('Payment successful. Credentials delivered instantly.', 'success');
      else toast(result.message, 'error');
      refresh();
    });
    root.querySelector('[data-customer-seed]').addEventListener('click', function () { var count = seedDemoStock(); toast(count ? 'Demo stock seeded.' : 'Demo stock already exists.', count ? 'success' : 'info'); refresh(); });
    root.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-copy-credential]');
      if (!btn) return;
      var raw = btn.getAttribute('data-copy-credential') || '';
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(raw).then(function () { toast('Credential copied.', 'success'); });
      } else {
        var textarea = document.createElement('textarea');
        textarea.value = raw;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
        toast('Credential copied.', 'success');
      }
    });
    refresh();
  }

  function renderCatalog(root, state) {
    var target = root.querySelector('[data-catalog-body]');
    target.innerHTML = state.products.map(function (p) {
      var c = counters(state, p.id);
      var badge = c.available === 0 ? '<span class="hy-status rejected">Out of Stock</span>' : c.available <= p.lowStockThreshold ? '<span class="hy-status pending">Low Stock</span>' : '<span class="hy-status approved">In Stock</span>';
      return '<tr><td>' + esc(p.name) + '</td><td>' + money(p.unitPrice) + '</td><td>' + c.available + '</td><td>' + badge + '</td></tr>';
    }).join('');
  }

  function renderCustomerOrders(root, state) {
    var body = root.querySelector('[data-customer-orders-body]');
    body.innerHTML = state.orders.length ? state.orders.map(function (o) {
      return '<tr><td>' + esc(o.id) + '<br><small>' + fmtDate(o.createdAt) + '</small></td><td>' + esc(o.productName) + '</td><td>' + o.quantity + '</td><td><span class="hy-status approved">Paid & Delivered</span></td><td>' + money(o.total) + '</td></tr><tr><td colspan="5"><div class="hy-credential-list">' + o.deliveredCredentials.map(function (c, idx) { return '<div class="hy-credential"><strong>Delivered Credential #' + (idx + 1) + '</strong><code>' + esc(c.raw) + '</code><button class="hy-mini" data-copy-credential="' + esc(c.raw) + '">Copy</button></div>'; }).join('') + '</div></td></tr>';
    }).join('') : '<tr><td colspan="5">No orders yet. Seed stock, then simulate a successful payment.</td></tr>';
  }

  function renderNotifications(root, state) {
    var target = root.querySelector('[data-notification-list]');
    target.innerHTML = state.notifications.length ? state.notifications.slice(0, 8).map(function (n) {
      return '<div class="hy-notification ' + esc(n.type) + '"><strong>' + esc(n.title) + '</strong><span>' + esc(n.message) + '</span><small>' + fmtDate(n.createdAt) + '</small></div>';
    }).join('') : '<div class="hy-notification"><strong>No notifications</strong><span>Delivery, low stock, and out-of-stock alerts appear here.</span></div>';
  }

  function customerTemplate() {
    return '<div class="hy-grid cols-4"><div class="hy-card hy-stat"><span>Orders</span><strong data-customer-orders>0</strong></div><div class="hy-card hy-stat"><span>Delivered Credentials</span><strong data-customer-delivered>0</strong></div><div class="hy-card hy-stat"><span>Available Stock</span><strong data-customer-available>0</strong></div><div class="hy-card hy-stat"><span>Notifications</span><strong data-customer-notifications>0</strong></div></div><section class="hy-card hy-panel" style="margin-top:18px"><div class="hy-section-title"><div><h3>Buy Account Credentials</h3><p>After successful payment, credentials are allocated instantly from available stock and saved to your order.</p></div><button class="hy-btn secondary" data-customer-seed>Seed seller demo stock</button></div><div class="hy-inline"><div class="hy-field"><label>Product</label><select data-buy-product></select></div><div class="hy-field"><label>Quantity</label><input type="number" data-buy-qty min="1" value="1"></div></div><button class="hy-btn orange" data-customer-pay>Simulate Successful Payment & Instant Delivery</button></section><section class="hy-card hy-panel" style="margin-top:18px"><h3>Product Inventory</h3><table class="hy-table"><thead><tr><th>Product</th><th>Price</th><th>Available</th><th>Status</th></tr></thead><tbody data-catalog-body></tbody></table></section><section class="hy-card hy-panel" style="margin-top:18px"><h3>Customer Orders & Delivered Credentials</h3><table class="hy-table"><thead><tr><th>Order</th><th>Product</th><th>Qty</th><th>Status</th><th>Total</th></tr></thead><tbody data-customer-orders-body></tbody></table></section><section class="hy-card hy-panel" style="margin-top:18px"><h3>Notifications</h3><div data-notification-list class="hy-notification-list"></div></section>';
  }

  window.hstockhub.comAutoDelivery = {
    loadState: loadState,
    saveState: saveState,
    parseStock: parseStock,
    addStock: addStock,
    deliverAfterPayment: deliverAfterPayment,
    counters: counters,
    seedDemoStock: seedDemoStock,
    resetDemo: resetDemo
  };

  document.addEventListener('DOMContentLoaded', function () {
    renderSeller();
    renderCustomer();
  });
})();