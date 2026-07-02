const express = require('express');
const { body } = require('express-validator');
const auth = require('../controllers/authController');
const dashboard = require('../controllers/dashboardController');
const { requireExactRole } = require('../middleware/auth');
const { csrfProtection } = require('../middleware/security');
const validate = require('../middleware/validate');

const router = express.Router();

router.get('/login', csrfProtection, (req, res) => auth.loginForm(req, res, 'admin'));
router.post('/login', csrfProtection, body('email').isEmail().normalizeEmail(), body('password').notEmpty(), validate, (req, res, next) => {
  req.params.role = 'admin';
  return auth.login(req, res, next);
});

router.use(requireExactRole('admin'));
router.use(csrfProtection);
router.get(['/', '/dashboard'], dashboard.adminDashboard);
router.get('/users', dashboard.adminDashboard);
router.get('/sellers', dashboard.adminDashboard);
router.get('/buyers', dashboard.adminDashboard);
router.get('/admins', dashboard.adminDashboard);
router.get('/products', dashboard.adminDashboard);
router.get('/categories', dashboard.adminDashboard);
router.get('/inventory', dashboard.adminDashboard);
router.get('/orders', dashboard.adminDashboard);
router.get('/payments', dashboard.adminDashboard);
router.get('/refunds', dashboard.adminDashboard);
router.get('/withdrawals', dashboard.adminDashboard);
router.get('/disputes', dashboard.adminDashboard);
router.get('/support', dashboard.adminDashboard);
router.get('/coupons', dashboard.adminDashboard);
router.get('/promotions', dashboard.adminDashboard);
router.get('/homepage', dashboard.adminDashboard);
router.get('/banners', dashboard.adminDashboard);
router.get('/cms', dashboard.adminDashboard);
router.get('/seo', dashboard.adminDashboard);
router.get('/email-templates', dashboard.adminDashboard);
router.get('/translations', dashboard.adminDashboard);
router.get('/reports', dashboard.adminDashboard);
router.get('/analytics', dashboard.adminDashboard);
router.get('/audit-logs', dashboard.adminDashboard);
router.get('/security-logs', dashboard.adminDashboard);
router.get('/login-logs', dashboard.adminDashboard);
router.get('/settings', dashboard.adminDashboard);
router.get('/backups', dashboard.adminDashboard);
router.get('/files', dashboard.adminDashboard);
router.get('/notifications', dashboard.adminDashboard);

module.exports = router;