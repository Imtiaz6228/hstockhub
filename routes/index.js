const express = require('express');
const router = express.Router();
const Product = require('../models/product');

// Home page - one-page website
router.get('/', async (req, res) => {
  try {
    let products = [];
    try {
      products = await Product.getAll(20); // Get all products for catalog
    } catch (dbError) {
      console.warn('Database not available, showing demo products. Run migrations and seeding to enable full functionality.');
      // Show demo products even without DB
      const demo = require('../demo');
      products = demo.getDemoProducts(100);
    }

    res.render('index', {
      layout: false,
      title: 'HStockHub - Premium Social Media Accounts',
      products,
      user: req.session ? { name: req.session.name, isAdmin: req.session.isAdmin } : null,

    });
  } catch (error) {
    console.error(error);
    res.status(500).render('500', { title: 'Internal Server Error' });
  }
});

// About page (for footer links)
router.get('/about', (req, res) => {
  res.render('about', {
    title: 'About Us - Zombakk',
    user: req.session ? { name: req.session.name, isAdmin: req.session.isAdmin } : null,
    csrfToken: req.csrfToken()
  });
});

// Privacy policy
router.get('/privacy', (req, res) => {
  res.render('privacy', {
    title: 'Privacy Policy - Zombakk',
    user: req.session ? { name: req.session.name, isAdmin: req.session.isAdmin } : null,
    csrfToken: req.csrfToken()
  });
});

// Terms
router.get('/terms', (req, res) => {
  res.render('terms', {
    title: 'Terms of Service - Zombakk',
    user: req.session ? { name: req.session.name, isAdmin: req.session.isAdmin } : null,
    csrfToken: req.csrfToken()
  });
});

// Contact
router.get('/contact', (req, res) => {
  res.render('contact', {
    title: 'Contact Us - Zombakk',
    user: req.session ? { name: req.session.name, isAdmin: req.session.isAdmin } : null,
    csrfToken: req.csrfToken()
  });
});

module.exports = router;
