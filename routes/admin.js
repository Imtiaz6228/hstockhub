const express = require('express');
const router = express.Router();
const { requireAdmin } = require('./auth');
const Product = require('../models/product');
const Order = require('../models/order');
const User = require('../models/user');
const Coupon = require('../models/coupon');
const AdminLog = require('../models/adminLog');
const demo = require('../demo');
const multer = require('multer');
const uploadNone = multer().none();
// const { uploadAccountsFile } = require('../models/multer'); // Temporarily disabled for testing

// Debug endpoint to check middleware
router.get('/debug', (req, res) => {
  res.json({
    session: req.session,
    userId: req.session.userId,
    isAdmin: req.session.isAdmin,
    name: req.session.name
  });
});

// Simple test endpoint without layouts
router.get('/simple', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Admin Routes Test</title></head>
    <body style="font-family: Arial, sans-serif; padding: 20px;">
      <h1 style="color: green;">✅ Admin Routes Working!</h1>
      <p><strong>URL:</strong> ${req.url}</p>
      <p><strong>Time:</strong> ${new Date().toISOString()}</p>
      <hr>
      <h2>Test Links:</h2>
      <p><a href="/admin/test-dashboard" style="display: block; margin: 10px 0; padding: 10px; background: #007bff; color: white; text-decoration: none; border-radius: 4px;">Test Dashboard (Full Admin Panel)</a></p>
      <p><a href="/admin/debug" style="display: block; margin: 10px 0; padding: 10px; background: #28a745; color: white; text-decoration: none; border-radius: 4px;">Debug Session Info</a></p>
      <p><a href="/admin" style="display: block; margin: 10px 0; padding: 10px; background: #dc3545; color: white; text-decoration: none; border-radius: 4px;">Normal Admin Dashboard</a></p>
    </body>
    </html>
  `);
});

// Direct access for testing (bypass authentication)
router.get('/test-dashboard', async (req, res) => {
  try {
    let stats, lowStockAlerts, recentProducts;

    // Use demo data
    stats = {
      todayOrders: 3,
      sevenDayOrders: 24,
      thirtyDayOrders: 89,
      dailyRevenue: 1450.75,
      monthlyRevenue: 12650.50,
      pendingOrders: 2,
      deliveredOrders: 87,
      recentOrders: [
        {
          order_id: 1001,
          customer_name: 'John Demo',
          email: 'john@example.com',
          total_amount: 299.99,
          status: 'completed',
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        },
        {
          order_id: 1002,
          customer_name: 'Sarah Smith',
          email: 'sarah@example.com',
          total_amount: 149.99,
          status: 'shipped',
          created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
        },
        {
          order_id: 1003,
          customer_name: null,
          guest_email: 'guest@test.com',
          total_amount: 79.99,
          status: 'pending',
          created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
        }
      ]
    };

    lowStockAlerts = [
      { product_id: 1, name: 'Wireless Headphones', quantity: 3, min_stock_alert: 5 },
      { product_id: 2, name: 'Smart Watch Pro', quantity: 1, min_stock_alert: 8 }
    ];

    recentProducts = [
      { product_id: 1, name: 'Wireless Bluetooth Headphones', price: 89.99, quantity: 3, status: 'active', category: 'Electronics' },
      { product_id: 2, name: 'Smart Fitness Watch', price: 149.99, quantity: 1, status: 'active', category: 'Wearables' },
      { product_id: 3, name: 'Portable Power Bank', price: 39.99, quantity: 25, status: 'active', category: 'Accessories' }
    ];

    res.render('admin/dashboard', {
      layout: 'admin/layout',
      title: 'Dashboard (Test Mode)',
      currentPage: 'dashboard',
      user: 'Test Admin',
      csrfToken: req.csrfToken ? req.csrfToken() : 'disabled-for-testing',
      stats,
      lowStockAlerts,
      recentProducts
    });
  } catch (error) {
    console.error('Test dashboard error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Admin dashboard
router.get('/', requireAdmin, async (req, res) => {
  try {
    let stats, lowStockAlerts, recentProducts;

    // Try to get real data first
    try {
      stats = await Order.getDashboardStats();
      lowStockAlerts = await Product.getLowStockAlerts();
      recentProducts = await Product.getAll(10, 0);
    } catch (dbError) {
      console.warn('Database not available, showing demo admin data');

      // Demo data for testing without database
      stats = {
        todayOrders: 3,
        sevenDayOrders: 24,
        thirtyDayOrders: 89,
        dailyRevenue: 1450.75,
        monthlyRevenue: 12650.50,
        pendingOrders: 2,
        deliveredOrders: 87,
        recentOrders: [
          {
            order_id: 1001,
            customer_name: 'John Demo',
            email: 'john@example.com',
            total_amount: 299.99,
            status: 'completed',
            created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
          },
          {
            order_id: 1002,
            customer_name: 'Sarah Smith',
            email: 'sarah@example.com',
            total_amount: 149.99,
            status: 'shipped',
            created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
          },
          {
            order_id: 1003,
            customer_name: null,
            guest_email: 'guest@test.com',
            total_amount: 79.99,
            status: 'pending',
            created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
          }
        ]
      };

      lowStockAlerts = [
        {
          product_id: 1,
          name: 'Wireless Headphones',
          quantity: 3,
          min_stock_alert: 5
        },
        {
          product_id: 2,
          name: 'Smart Watch Pro',
          quantity: 1,
          min_stock_alert: 8
        }
      ];

      recentProducts = [
        {
          product_id: 1,
          name: 'Wireless Bluetooth Headphones',
          price: 89.99,
          quantity: 3,
          status: 'active',
          category: 'Electronics',
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        },
        {
          product_id: 2,
          name: 'Smart Fitness Watch',
          price: 149.99,
          quantity: 1,
          status: 'active',
          category: 'Wearables',
          created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
        },
        {
          product_id: 3,
          name: 'Portable Power Bank',
          price: 39.99,
          quantity: 25,
          status: 'active',
          category: 'Accessories',
          created_at: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString()
        }
      ];
    }

    res.render('admin/dashboard', {
      layout: 'admin/layout',
      title: 'Dashboard',
      currentPage: 'dashboard',
      user: req.session.name || 'Admin',
      csrfToken: req.csrfToken(),
      stats,
      lowStockAlerts,
      recentProducts
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).render('500', { title: 'Internal Server Error' });
  }
});

// Products management
router.get('/products', requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 50; // Products per page
    const offset = (page - 1) * limit;
    const { search, category, status, sort } = req.query;

    let products, totalCount, totalPages;

    // Try to get real data first
    try {
      // Build where conditions
      let whereConditions = {};
      if (category) whereConditions.category = category;
      if (status) whereConditions.status = status || ['active', 'draft', 'out_of_stock'];
      if (search) whereConditions.search = search;

      // Handle sorting
      let orderBy = 'created_at DESC';
      if (sort) {
        switch (sort) {
          case 'oldest': orderBy = 'created_at ASC'; break;
          case 'price_high': orderBy = 'price DESC'; break;
          case 'price_low': orderBy = 'price ASC'; break;
          case 'stock_low': orderBy = 'quantity ASC'; break;
          default: orderBy = 'created_at DESC';
        }
      }

      // Get total count for pagination
      totalCount = await Product.getCount(whereConditions);
      totalPages = Math.ceil(totalCount / limit);

      // Get products
      products = await Product.getFiltered(whereConditions, orderBy, limit, offset);
    } catch (dbError) {
      console.warn('Database not available, showing demo products for admin testing');

      // Demo products data for testing
      products = demo.getDemoProducts(null);

      // Filter demo products based on query params
      if (search) {
        const searchLower = search.toLowerCase();
        products = products.filter(p =>
          p.name.toLowerCase().includes(searchLower) ||
          p.description.toLowerCase().includes(searchLower) ||
          p.sku.toLowerCase().includes(searchLower)
        );
      }

      if (category) {
        products = products.filter(p => p.category === category);
      }

      if (status) {
        products = products.filter(p => p.status === status);
      }

      // Sort demo products
      if (sort) {
        switch (sort) {
          case 'oldest': products.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)); break;
          case 'price_high': products.sort((a, b) => b.price - a.price); break;
          case 'price_low': products.sort((a, b) => a.price - b.price); break;
          case 'stock_low': products.sort((a, b) => a.quantity - b.quantity); break;
          default: products.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }
      }

      totalCount = products.length;
      totalPages = Math.ceil(totalCount / limit);

      // Apply pagination
      const startIndex = offset;
      const endIndex = startIndex + limit;
      products = products.slice(startIndex, endIndex);
    }

    res.render('admin/products', {
      layout: 'admin/layout',
      title: 'Manage Products',
      currentPage: 'products',
      user: req.session.name || 'Admin',
      csrfToken: req.csrfToken(),
      products,
      search: search || '',
      category: category || '',
      status: status || '',
      sort: sort || 'newest',
      currentPage: page,
      totalPages,
      totalCount
    });
  } catch (error) {
    console.error('Products error:', error);
    res.status(500).render('500', { title: 'Internal Server Error' });
  }
});

// Bulk upload products (for multiple accounts) - TEMPORARILY DISABLED for testing
/*
router.post('/products/bulk-upload', [requireAdmin, uploadAccountsFile], async (req, res) => {
  try {
    const {
      name,
      category,
      price,
      sale_price,
      quantity: accountsToUpload,
      min_stock_alert,
      description,
      tags,
      status,
      upload_method,
      accounts_text,
      accounts_text_area
    } = req.body;

    // Get accounts from either text or file
    let accounts = [];
    if (upload_method === 'text') {
      accounts = accounts_text.split('\n').map(line => line.trim()).filter(line => line);
    } else if (req.file) {
      // Handle file upload (for future implementation)
      accounts = ['File upload not yet implemented'];
    }

    // Create product with account data
    const productData = {
      name,
      category,
      price: parseFloat(price),
      sale_price: sale_price ? parseFloat(sale_price) : null,
      quantity: parseInt(accountsToUpload),
      min_stock_alert: parseInt(min_stock_alert) || 5,
      description,
      tags,
      status: status || 'draft',
      image_url: req.file ? `/uploads/products/${req.file.filename}` : null,
      account_data: JSON.stringify(accounts) // Store accounts as JSON
    };

    await Product.create(productData);
    await AdminLog.log({
      admin_id: req.session.userId,
      action: 'CREATE_PRODUCT',
      target_type: 'Product',
      target_id: null,
      details: { ...productData, accounts_count: accounts.length }
    });

    res.redirect('/admin/products?success=Product created successfully with ' + accounts.length + ' accounts');
  } catch (error) {
    console.error('Bulk product creation error:', error);
    res.redirect('/admin/products?error=Failed to create product: ' + error.message);
  }
});
*/

// Add product (single product without accounts)
router.post('/products', requireAdmin, uploadNone, async (req, res) => {
  try {
    await Product.create(req.body);
    await AdminLog.log({ admin_id: req.session.userId, action: 'CREATE', target_type: 'Product', target_id: null, details: req.body });
    res.redirect('/admin/products?success=Product created successfully');
  } catch (error) {
    console.error(error);
    // In demo mode when DB not available, create in memory
    if (error.code === 'ECONNREFUSED' || error.message.includes('connection')) {
      demo.addDemoProduct(req.body);
      res.redirect('/admin/products?success=Product created successfully (Demo Mode)');
    } else {
      res.redirect('/admin/products?error=Failed to create product: ' + error.message);
    }
  }
});

// Update product
router.post('/products/:id', requireAdmin, async (req, res) => {
  try {
    await Product.update(req.params.id, req.body);
    await AdminLog.log({ admin_id: req.session.userId, action: 'UPDATE', target_type: 'Product', target_id: req.params.id, details: req.body });
    res.redirect('/admin/products');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error updating product');
  }
});

// Delete product
router.post('/products/:id/delete', requireAdmin, async (req, res) => {
  try {
    await Product.delete(req.params.id);
    await AdminLog.log({ admin_id: req.session.userId, action: 'DELETE', target_type: 'Product', target_id: req.params.id });
    res.redirect('/admin/products');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error deleting product');
  }
});

// Orders management
router.get('/orders', requireAdmin, async (req, res) => {
  try {
    let orders = [];
    try {
      orders = await Order.getAll();
    } catch (dbError) {
      console.warn('Database not available, showing demo orders for admin.');
      orders = demo.getDemoOrders();
    }
    res.render('admin/orders', {
      layout: 'admin/layout',
      title: 'Manage Orders',
      currentPage: 'orders',
      user: req.session.name || 'Admin',
      csrfToken: req.csrfToken(),
      orders
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('500', { title: 'Internal Server Error' });
  }
});

// Update order status
router.post('/orders/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    try {
      await Order.updateStatus(req.params.id, status);
      await AdminLog.log({ admin_id: req.session.userId, action: 'UPDATE_STATUS', target_type: 'Order', target_id: req.params.id, details: { status } });
    } catch (dbError) {
      console.warn('Database not available, updating demo order status.');
      demo.updateDemoOrder(req.params.id, status);
    }
    res.redirect(`/admin/orders?action=${status}&orderId=${req.params.id}`);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error updating order status');
  }
});

// Verify and deliver order
router.post('/orders/:id/verify', requireAdmin, async (req, res) => {
  try {
    const { verification_notes } = req.body;

    try {
      // Update order status to delivered
      await Order.updateStatus(req.params.id, 'delivered');

      // Log admin action with verification notes
      await AdminLog.log({
        admin_id: req.session.userId,
        action: 'VERIFY_ORDER',
        target_type: 'Order',
        target_id: req.params.id,
        details: {
          verification_notes: verification_notes || 'Order verified and delivered - Accounts sent to customer email and Telegram',
          delivered_at: new Date().toISOString()
        }
      });
    } catch (dbError) {
      console.warn('Database not available, updating demo order status.');
      demo.updateDemoOrder(req.params.id, 'delivered');
    }

    res.redirect(`/admin/orders?action=delivered&orderId=${req.params.id}`);
  } catch (error) {
    console.error(error);
    res.redirect('/admin/orders?error=Failed to verify order');
  }
});

// Bulk order actions
router.post('/orders/bulk-action', requireAdmin, async (req, res) => {
  try {
    const { action, order_ids } = req.body;

    if (!Array.isArray(order_ids) || order_ids.length === 0) {
      return res.redirect('/admin/orders?error=No orders selected');
    }

    let updatedCount = 0;
    for (const orderId of order_ids) {
      if (action === 'deliver') {
        await Order.updateStatus(orderId, 'delivered');
        updatedCount++;
      } else if (action === 'cancel') {
        await Order.updateStatus(orderId, 'cancelled');
        updatedCount++;
      }
    }

    if (updatedCount > 0) {
      await AdminLog.log({
        admin_id: req.session.userId,
        action: 'BULK_ACTION',
        target_type: 'Orders',
        target_id: null,
        details: { action, order_ids: order_ids.join(','), updated_count: updatedCount }
      });
    }

    res.redirect(`/admin/orders?success=${updatedCount} orders ${action === 'deliver' ? 'marked as delivered' : 'cancelled'}`);
  } catch (error) {
    console.error(error);
    res.redirect('/admin/orders?error=Bulk action failed');
  }
});

// Users management
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const users = await User.getAll();
    res.render('admin/users', {
      layout: 'admin/layout',
      title: 'Manage Users',
      currentPage: 'users',
      user: req.session.name || 'Admin',
      csrfToken: req.csrfToken(),
      users
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('500', { title: 'Internal Server Error' });
  }
});

// Coupons management
router.get('/coupons', requireAdmin, async (req, res) => {
  try {
    const coupons = await Coupon.getAll();
    res.render('admin/coupons', {
      layout: 'admin/layout',
      title: 'Manage Coupons',
      currentPage: 'coupons',
      user: req.session.name || 'Admin',
      csrfToken: req.csrfToken(),
      coupons
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('500', { title: 'Internal Server Error' });
  }
});

// Add coupon
router.post('/coupons', requireAdmin, async (req, res) => {
  try {
    await Coupon.create(req.body);
    await AdminLog.log({ admin_id: req.session.userId, action: 'CREATE', target_type: 'Coupon', target_id: null, details: req.body });
    res.redirect('/admin/coupons');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error adding coupon');
  }
});

// Delete coupon
router.post('/coupons/:id/delete', requireAdmin, async (req, res) => {
  try {
    await Coupon.delete(req.params.id);
    await AdminLog.log({ admin_id: req.session.userId, action: 'DELETE', target_type: 'Coupon', target_id: req.params.id });
    res.redirect('/admin/coupons');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error deleting coupon');
  }
});

// Update coupon
router.post('/coupons/update', requireAdmin, async (req, res) => {
  try {
    const { coupon_id, ...updateData } = req.body;
    await Coupon.update(coupon_id, updateData);
    await AdminLog.log({ admin_id: req.session.userId, action: 'UPDATE', target_type: 'Coupon', target_id: coupon_id, details: updateData });
    res.redirect('/admin/coupons?success=Coupon updated successfully');
  } catch (error) {
    console.error(error);
    res.redirect('/admin/coupons?error=Failed to update coupon');
  }
});

// Edit user
router.post('/users/:id/edit', requireAdmin, async (req, res) => {
  try {
    const updateData = {
      name: req.body.name,
      email: req.body.email,
      is_admin: req.body.is_admin === 'on'
    };

    await User.update(req.params.id, updateData);
    await AdminLog.log({ admin_id: req.session.userId, action: 'UPDATE', target_type: 'User', target_id: req.params.id, details: updateData });
    res.redirect('/admin/users?success=User updated successfully');
  } catch (error) {
    console.error(error);
    res.redirect('/admin/users?error=Failed to update user');
  }
});

// Ban/unban user
router.post('/users/:id/ban', requireAdmin, async (req, res) => {
  try {
    // Note: In a real implementation, you'd have a separate 'banned' field
    // For demo, we'll just toggle the active status
    const user = await User.findById(req.params.id);
    if (user) {
      const newActiveStatus = !user.active;
      await User.update(req.params.id, { active: newActiveStatus });
      await AdminLog.log({
        admin_id: req.session.userId,
        action: newActiveStatus ? 'UNBAN_USER' : 'BAN_USER',
        target_type: 'User',
        target_id: req.params.id,
        details: { active: newActiveStatus }
      });
    }
    res.redirect('/admin/users?success=User status updated successfully');
  } catch (error) {
    console.error(error);
    res.redirect('/admin/users?error=Failed to update user status');
  }
});

// Product edit route (for individual product editing)
router.get('/products/:id/edit', requireAdmin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).render('404', { title: 'Product Not Found' });
    }

    res.render('admin/product-edit', {
      layout: 'admin/layout',
      title: `Edit Product: ${product.name}`,
      currentPage: 'products',
      user: req.session.name || 'Admin',
      csrfToken: req.csrfToken(),
      product
    });
  } catch (error) {
    console.error('Product edit error:', error);
    res.status(500).render('500', { title: 'Internal Server Error' });
  }
});

module.exports = router;
