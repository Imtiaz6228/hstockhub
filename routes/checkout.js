const express = require('express');
const router = express.Router();
const Order = require('../models/order');
const AdminLog = require('../models/adminLog');
const demo = require('../demo');

// GET checkout page
router.get('/', (req, res) => {
  res.render('checkout', {
    title: 'Checkout - HStockHub',
    error: req.query.error,
    success: req.query.success,
    csrfToken: req.csrfToken()
  });
});

// POST process order
router.post('/process', async (req, res) => {
  try {
    const {
      product_type,
      product_platform,
      product_name,
      product_price,
      product_age,
      telegram_id,
      email,
      quantity,
      payment_method,
      txid
    } = req.body;

    if (!telegram_id || !email || !quantity || !payment_method || !txid) {
      return res.render('checkout', {
        title: 'Checkout - HStockHub',
        error: 'All fields are required. Please fill in your Telegram ID, email, quantity, payment method, and transaction ID.',
        csrfToken: req.csrfToken()
      });
    }

    const totalAmount = parseFloat(product_price) * parseInt(quantity);

    try {
      // Try to create order in database
      const order = await Order.create({
        guest_email: email,
        shipping_address: {
          telegram_id: telegram_id,
          delivery_method: 'telegram_and_email'
        },
        billing_address: {
          telegram_id: telegram_id,
          email: email,
          payment_method: payment_method,
          txid: txid
        },
        total_amount: totalAmount,
        payment_id: txid,
        status: 'pending'
      });

      // Add order items
      await Order.addItems(order.order_id, [{
        product_id: 1, // Demo product ID
        quantity: parseInt(quantity),
        price: parseFloat(product_price)
      }]);

      // Redirect to order status page
      res.redirect(`/order/${order.order_id}/status`);
    } catch (dbError) {
      console.warn('Database not available, creating demo order.');
      // Create demo order when DB is unavailable
      const demoOrder = demo.addDemoOrder({
        guest_email: email,
        shipping_address: {
          telegram_id: telegram_id,
          delivery_method: 'telegram_and_email'
        },
        billing_address: {
          telegram_id: telegram_id,
          email: email,
          payment_method: payment_method,
          txid: txid
        },
        total_amount: totalAmount,
        payment_id: txid,
        status: 'pending',
        created_at: new Date(),
        items: [{
          product_id: 1,
          product_name: product_name || 'Product',
          quantity: parseInt(quantity),
          price: parseFloat(product_price)
        }]
      });

      // Redirect to order status page with demo order
      res.redirect(`/order/${demoOrder.order_id}/status`);
    }

  } catch (error) {
    console.error('Checkout error:', error);
    res.render('checkout', {
      title: 'Checkout - HStockHub',
      error: 'An error occurred while processing your order. Please try again.',
      csrfToken: req.csrfToken()
    });
  }
});

// GET order status
router.get('/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params;
    let order;

    try {
      order = await Order.findById(orderId);
    } catch (dbError) {
      console.warn('Database not available, checking demo orders.');
      // Check demo orders when DB is unavailable
      order = demo.findDemoOrder(orderId);
    }

    if (!order) {
      return res.render('404', { title: 'Order Not Found' });
    }

    res.render('order-status', {
      title: 'Order Status - HStockHub',
      order: order,
      csrfToken: req.csrfToken()
    });

  } catch (error) {
    console.error('Order status error:', error);
    res.status(500).render('500', { title: 'Internal Server Error' });
  }
});

// POST verify order (admin only)
router.post('/:orderId/verify', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { verification_notes } = req.body;

    if (!req.session.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    try {
      // Try to update in database
      await Order.updateStatus(orderId, 'delivered');

      // Log admin action
      await AdminLog.log({
        admin_id: req.session.userId,
        action: 'VERIFY_ORDER',
        target_type: 'Order',
        target_id: orderId,
        details: { verification_notes: verification_notes || 'Order verified and delivered' }
      });
    } catch (dbError) {
      console.warn('Database not available, updating demo order.');
      // Update demo order when DB is unavailable
      demo.updateDemoOrder(orderId, 'delivered');
    }

    res.json({ success: true });

  } catch (error) {
    console.error('Order verification error:', error);
    res.status(500).json({ error: 'Failed to verify order' });
  }
});

// GET download product
router.get('/:orderId/download', async (req, res) => {
  try {
    const { orderId } = req.params;
    console.log('Download request for order:', orderId);
    let order;

    try {
      order = await Order.findById(orderId);
    } catch (dbError) {
      console.log('Using demo order');
      order = demo.findDemoOrder(orderId);
    }

    console.log('Order found:', order ? order.status : 'not found');

    if (!order || order.status !== 'delivered') {
      return res.status(404).send('Order not found or not delivered yet');
    }

    // Generate content
    let content = `Order ID: ${order.order_id}\n`;
    content += `Order Date: ${new Date(order.created_at).toISOString()}\n`;
    content += `Status: ${order.status}\n`;
    content += `\nItems:\n`;
    if (order.items) {
      order.items.forEach(item => {
        content += `- Product: ${item.product_name || 'Product'}\n`;
        content += `  Quantity: ${item.quantity}\n`;
        content += `  Price: $${item.price}\n`;
      });
    }
    content += `\nTotal: $${order.total_amount}\n`;
    content += `\nAccount Login Details:\n`;
    content += `This is where you would put the actual account credentials when delivered.\n`;
    content += `For demo purposes, please contact support for account details.\n`;

    // Set headers for download
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="order_${orderId}_product.txt"`);
    res.send(content);

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).send('Error downloading file');
  }
});

module.exports = router;
