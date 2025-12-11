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

let demoProducts = [
  {
    product_id: 1,
    name: 'Wireless Bluetooth Headphones',
    description: 'Premium wireless headphones with noise cancellation',
    price: 89.99,
    sale_price: null,
    quantity: 3,
    min_stock_alert: 5,
    status: 'active',
    category: 'Electronics',
    tags: 'electronics,wireless,audio',
    sku: 'WHP-001',
    image_url: null,
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  },
  {
    product_id: 2,
    name: 'Smart Fitness Watch',
    description: 'Advanced fitness tracking watch with GPS',
    price: 149.99,
    sale_price: 129.99,
    quantity: 1,
    min_stock_alert: 8,
    status: 'active',
    category: 'Wearables',
    tags: 'fitness,wearables,smart',
    sku: 'SFW-002',
    image_url: '/uploads/products/demo-watch.jpg',
    created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
  },
  {
    product_id: 3,
    name: 'Portable Power Bank',
    description: 'High-capacity power bank for all your devices',
    price: 39.99,
    sale_price: null,
    quantity: 25,
    min_stock_alert: 10,
    status: 'active',
    category: 'Accessories',
    tags: 'power,battery,mobile',
    sku: 'PPB-003',
    image_url: '/uploads/products/demo-powerbank.jpg',
    created_at: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString()
  },
  {
    product_id: 4,
    name: 'USB-C Cable',
    description: 'Durable USB-C charging cable',
    price: 12.99,
    sale_price: null,
    quantity: 45,
    min_stock_alert: 15,
    status: 'active',
    category: 'Accessories',
    tags: 'usb,cable,charging',
    sku: 'USC-004',
    image_url: null,
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    product_id: 5,
    name: 'Bluetooth Speaker',
    description: 'Portable wireless speaker with amazing sound quality',
    price: 69.99,
    sale_price: 59.99,
    quantity: 8,
    min_stock_alert: 12,
    status: 'active',
    category: 'Electronics',
    tags: 'audio,wireless,speaker',
    sku: 'BTS-005',
    image_url: null,
    created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    product_id: 6,
    name: 'Laptop Stand',
    description: 'Adjustable aluminum laptop stand for ergonomic work',
    price: 34.99,
    sale_price: null,
    quantity: 0,
    min_stock_alert: 6,
    status: 'out_of_stock',
    category: 'Accessories',
    tags: 'laptop,ergo,stand',
    sku: 'LST-006',
    image_url: null,
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    product_id: 7,
    name: 'Wireless Mouse',
    description: 'Ergonomic wireless mouse with customizable buttons',
    price: 29.99,
    sale_price: null,
    quantity: 15,
    min_stock_alert: 8,
    status: 'draft',
    category: 'Electronics',
    tags: 'mouse,wireless,pc',
    sku: 'WMS-007',
    image_url: null,
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
  }
];
let demoProductIdCounter = 8;

function getDemoProducts(limit) {
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
