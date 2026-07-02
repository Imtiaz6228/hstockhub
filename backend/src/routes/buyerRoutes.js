const express = require('express');
const { requireExactRole } = require('../middleware/auth');
const { csrfProtection } = require('../middleware/security');
const dashboard = require('../controllers/dashboardController');

const router = express.Router();
router.use(requireExactRole('buyer'));
router.use(csrfProtection);

router.get(['/', '/dashboard'], dashboard.buyerDashboard);
router.get('/orders/:id', dashboard.buyerOrderDetail);
router.get('/orders/:orderId/download/:itemId', dashboard.buyerDownload);
router.get('/profile', dashboard.buyerDashboard);
router.get('/orders', dashboard.buyerDashboard);
router.get('/wishlist', dashboard.buyerDashboard);
router.get('/favorites', dashboard.buyerDashboard);
router.get('/support', dashboard.buyerDashboard);
router.get('/disputes', dashboard.buyerDashboard);
router.get('/notifications', dashboard.buyerDashboard);
router.get('/messages', dashboard.buyerDashboard);
router.get('/reviews', dashboard.buyerDashboard);
router.get('/coupons', dashboard.buyerDashboard);
router.get('/invoices', dashboard.buyerDashboard);
router.get('/security', dashboard.buyerDashboard);
router.get('/login-history', dashboard.buyerDashboard);
router.get('/api-keys', dashboard.buyerDashboard);

module.exports = router;