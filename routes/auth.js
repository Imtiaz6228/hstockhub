const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/user');

// Middleware to check if authenticated
function requireAuth(req, res, next) {
  if (req.session.userId) {
    return next();
  }
  res.redirect('/login');
}

// Middleware to check if admin
function requireAdmin(req, res, next) {
  if (req.session.userId && req.session.isAdmin) {
    return next();
  }
  // Redirect to login page with admin access denied message
  res.redirect('/login?error=Admin access required. Please login with admin credentials.');
}

// Register route
router.get('/register', (req, res) => {
  res.render('register', { title: 'Register', csrfToken: req.csrfToken() });
});

router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const user = await User.create({ email, password, name });
    req.session.userId = user.user_id;
    req.session.name = user.name;
    req.session.isAdmin = user.is_admin;
    res.redirect('/');
  } catch (error) {
    res.render('register', { title: 'Register', error: error.message, csrfToken: req.csrfToken() });
  }
});

// Login route
router.get('/login', (req, res) => {
  const error = req.query.error;
  res.render('login', {
    title: 'Login',
    error: error,
    csrfToken: req.csrfToken()
  });
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Demo admin login fallback when DB unavailable
    if (email === 'admin@zombakk.com' && password === 'admin123') {
      try {
        const user = await User.findByEmail(email);
        if (user && await User.verifyPassword(password, user.password)) {
          req.session.userId = user.user_id;
          req.session.name = user.name;
          req.session.isAdmin = user.is_admin;
          return res.redirect('/admin');
        }
      } catch (dbError) {
        console.warn('Database unavailable, using demo admin login');
        // Demo admin session
        req.session.userId = 1;
        req.session.name = 'Admin User';
        req.session.isAdmin = true;
        return res.redirect('/admin');
      }
    }

    const user = await User.findByEmail(email);
    if (user && await User.verifyPassword(password, user.password)) {
      req.session.userId = user.user_id;
      req.session.name = user.name;
      req.session.isAdmin = user.is_admin;
      if (user.is_admin) {
        res.redirect('/admin');
      } else {
        res.redirect('/');
      }
    } else {
      res.render('login', { title: 'Login', error: 'Invalid credentials', csrfToken: req.csrfToken() });
    }
  } catch (error) {
    res.render('login', { title: 'Login', error: error.message, csrfToken: req.csrfToken() });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send('Error logging out');
    }
    res.redirect('/');
  });
});

// API route for JWT (if needed for frontend)
router.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findByEmail(email);
    if (user && await User.verifyPassword(password, user.password)) {
      const token = jwt.sign({ userId: user.user_id, isAdmin: user.is_admin }, process.env.JWT_SECRET, { expiresIn: '1h' });
      res.json({ token, user: { id: user.user_id, name: user.name, isAdmin: user.is_admin } });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = { router, requireAuth, requireAdmin };
