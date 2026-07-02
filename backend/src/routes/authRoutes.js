const express = require('express');
const { body } = require('express-validator');
const auth = require('../controllers/authController');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { csrfProtection } = require('../middleware/security');

const router = express.Router();

router.get('/:role(buyer|seller)/login', csrfProtection, auth.showLogin);
router.post('/:role(buyer|seller)/login', csrfProtection, auth.loginValidators, auth.login);
router.get('/:role(buyer|seller)/register', csrfProtection, auth.showRegister);
router.post('/:role(buyer|seller)/register', csrfProtection, auth.registerValidators, auth.register);
router.get('/:role(buyer|seller)/forgot-password', csrfProtection, auth.forgotPasswordForm);
router.post('/:role(buyer|seller)/forgot-password', csrfProtection, body('email').isEmail().normalizeEmail(), validate, auth.forgotPassword);
router.get('/:role(buyer|seller)/reset-password', csrfProtection, auth.resetPasswordForm);
router.post('/:role(buyer|seller)/reset-password', csrfProtection, body('token').notEmpty(), body('password').isLength({ min: 8 }), validate, auth.resetPasswordPost);
router.post('/change-password', csrfProtection, requireAuth, body('currentPassword').notEmpty(), body('newPassword').isLength({ min: 8 }), validate, auth.changePassword);
router.post('/logout', csrfProtection, requireAuth, auth.logout);
router.get('/logout', requireAuth, auth.logout);

module.exports = router;