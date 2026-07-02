const express = require('express');
const { body } = require('express-validator');
const { requireExactRole } = require('../middleware/auth');
const { csrfProtection } = require('../middleware/security');
const validate = require('../middleware/validate');
const dashboard = require('../controllers/dashboardController');
const seller = require('../controllers/sellerController');

const router = express.Router();
router.use(requireExactRole('seller'));
router.use(csrfProtection);

router.get(['/', '/dashboard'], dashboard.sellerDashboard);
router.post('/stock', body('productId').isMongoId(), body('stockText').isLength({ min: 1, max: 200000 }), validate, seller.uploadStock);
router.get('/store', dashboard.sellerDashboard);
router.get('/products', dashboard.sellerDashboard);
router.get('/inventory', dashboard.sellerDashboard);
router.get('/orders/pending', dashboard.sellerDashboard);
router.get('/orders/completed', dashboard.sellerDashboard);
router.get('/refunds', dashboard.sellerDashboard);
router.get('/disputes', dashboard.sellerDashboard);
router.get('/messages', dashboard.sellerDashboard);
router.get('/analytics', dashboard.sellerDashboard);
router.get('/earnings', dashboard.sellerDashboard);
router.get('/withdrawals', dashboard.sellerDashboard);
router.get('/coupons', dashboard.sellerDashboard);
router.get('/reviews', dashboard.sellerDashboard);
router.get('/notifications', dashboard.sellerDashboard);
router.get('/support', dashboard.sellerDashboard);
router.get('/reports', dashboard.sellerDashboard);
router.get('/security', dashboard.sellerDashboard);

module.exports = router;