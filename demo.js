let demoOrders = [{
  order_id: 10000,
  guest_email: 'demo@buyer.com',
  billing_address: {
    telegram_id: 'demo_user',
    email: 'demo@buyer.com',
    payment_method: 'usdt',
    txid: 'demo_tx_12345'
  },
  shipping_address: {
    telegram_id: 'demo_user',
    delivery_method: 'telegram_and_email'
  },
  total_amount: 49.99,
  payment_id: 'demo_tx_12345',
  status: 'pending',
  created_at: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
  items: [{
    product_id: 1,
    product_name: 'Instagram Verified Account',
    quantity: 1,
    price: 49.99
  }]
}];
let demoOrderIdCounter = 10001;

// Load demo products from file if exists
const fs = require('fs');
let demoProducts = [];
let demoProductIdCounter = 1; // fallback

function loadDemoProducts() {
  try {
    if (fs.existsSync('./demo-products.json')) {
      const data = fs.readFileSync('./demo-products.json', 'utf8');
      const parsed = JSON.parse(data);
      demoProducts = parsed.products || [];
      demoProductIdCounter = parsed.counter || 1;
    } else {
      // Start with empty demo products
      demoProducts = [];
      demoProductIdCounter = 1;
      saveDemoProducts();
    }
  } catch (error) {
    console.error('Error loading demo products:', error);
    demoProducts = [];
  }
}

function saveDemoProducts() {
  try {
    fs.writeFileSync('./demo-products.json', JSON.stringify({
      products: demoProducts,
      counter: demoProductIdCounter
    }, null, 2));
  } catch (error) {
    console.error('Error saving demo products:', error);
  }
}

loadDemoProducts();

function getDemoProducts(limit) {
  // Reload from file each time to reflect changes across PM2 processes
  loadDemoProducts();
  return demoProducts.slice(0, limit || demoProducts.length);
}

function addDemoProduct(product) {
  const newProduct = {
    ...product,
    product_id: demoProductIdCounter++,
    price: parseFloat(product.price),
    sale_price: null,
    quantity: parseInt(product.accounts_to_upload) || parseInt(product.quantity) || 1,
    min_stock_alert: parseInt(product.min_stock_alert) || 5,
    status: product.status || 'active',
    category: product.category || 'Other',
    tags: product.tags || '',
    sku: 'DEMO-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
    image_url: null,
    created_at: new Date().toISOString()
  };
  demoProducts.unshift(newProduct); // Add to top
  saveDemoProducts(); // Persist to file
  return newProduct;
}

function getDemoOrders() {
  return demoOrders;
}

function addDemoOrder(order) {
  const demoOrder = {
    ...order,
    order_id: demoOrderIdCounter++
  };

  if (demoOrder.items) {
    demoOrder.items = demoOrder.items.map(item => ({
      product_id: item.product_id || 1,
      product_name: item.product_name || item.name || 'Product',
      quantity: item.quantity || 1,
      price: item.price || 0
    }));

    // Calculate total if not provided
    if (!demoOrder.total_amount) {
      demoOrder.total_amount = demoOrder.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }
  }

  demoOrders.push(demoOrder);
  return demoOrder;
}

function updateDemoOrder(orderId, status) {
  const order = demoOrders.find(o => o.order_id == orderId);
  if (order) {
    order.status = status;
  }
}

function findDemoOrder(orderId) {
  return demoOrders.find(o => o.order_id == orderId);
}

module.exports = {
  getDemoOrders,
  addDemoOrder,
  updateDemoOrder,
  findDemoOrder,
  getDemoProducts,
  addDemoProduct
};
