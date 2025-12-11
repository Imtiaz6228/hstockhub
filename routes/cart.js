const express = require('express');
const router = express.Router();
const Product = require('../models/product');

// Add to cart
router.post('/add', async (req, res) => {
  try {
    const { product_id, quantity } = req.body;
    const qty = parseInt(quantity) || 1;

    const product = await Product.findById(product_id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Initialize cart if not exists
    if (!req.session.cart) {
      req.session.cart = {};
    }

    // Add or update quantity
    if (req.session.cart[product_id]) {
      req.session.cart[product_id] += qty;
    } else {
      req.session.cart[product_id] = qty;
    }

    // Check stock
    if (req.session.cart[product_id] > product.quantity) {
      req.session.cart[product_id] = product.quantity;
    }

    res.redirect('/cart');
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add to cart' });
  }
});

// View cart
router.get('/', async (req, res) => {
  try {
    const cart = req.session.cart || {};
    const productIds = Object.keys(cart);

    if (productIds.length === 0) {
      return res.render('cart', {
        title: 'Shopping Cart - Zombakk',
        cartItems: [],
        total: 0,
        user: req.session ? { name: req.session.name, isAdmin: req.session.isAdmin } : null,
        csrfToken: req.csrfToken()
      });
    }

    const products = await Product.getByIds(productIds);
    const cartItems = products.map(product => ({
      ...product,
      quantity: cart[product.product_id],
      subtotal: product.price * cart[product.product_id]
    }));

    const total = cartItems.reduce((sum, item) => sum + item.subtotal, 0);

    res.render('cart', {
      title: 'Shopping Cart - Zombakk',
      cartItems,
      total: total.toFixed(2),
      user: req.session ? { name: req.session.name, isAdmin: req.session.isAdmin } : null,
      csrfToken: req.csrfToken()
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('500', { title: 'Internal Server Error' });
  }
});

// Update cart item quantity
router.post('/update/:productId', (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;
    const qty = parseInt(quantity);

    if (qty <= 0) {
      delete req.session.cart[productId];
    } else {
      req.session.cart[productId] = qty;
    }

    res.redirect('/cart');
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update cart' });
  }
});

// Remove from cart
router.post('/remove/:productId', (req, res) => {
  try {
    const { productId } = req.params;
    if (req.session.cart && req.session.cart[productId]) {
      delete req.session.cart[productId];
    }
    res.redirect('/cart');
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to remove from cart' });
  }
});

// Clear cart
router.post('/clear', (req, res) => {
  req.session.cart = {};
  res.redirect('/cart');
});

module.exports = router;
