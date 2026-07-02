const express = require('express');
const { body } = require('express-validator');
const api = require('../controllers/apiController');
const validate = require('../middleware/validate');
const { requireAuth, requireExactRole } = require('../middleware/auth');
const { csrfProtection } = require('../middleware/security');

const router = express.Router();

router.get('/me', api.me);
router.get('/products', api.products);
router.get('/products/search', api.products);
router.get('/categories', api.categories);
router.post('/webhooks/payment/success', body('buyerId').isMongoId(), body('productId').isMongoId(), body('quantity').optional().isInt({ min: 1, max: 100 }), validate, api.paymentWebhook);

router.use(csrfProtection);
router.get('/buyer/orders', requireExactRole('buyer'), api.buyerOrders);
router.get('/notifications', requireAuth, api.notifications);
router.get('/tickets', requireAuth, api.tickets);

module.exports = router;