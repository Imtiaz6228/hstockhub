const { body } = require('express-validator');
const User = require('../models/User');
const validate = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const env = require('../config/env');
const { layout, escapeHtml } = require('../utils/view');
const { registerUser, loginUser, createPasswordReset, resetPassword, dashboardFor } = require('../services/authService');
const { audit } = require('../services/auditService');

const allowedRoles = ['buyer', 'seller'];

function roleLabel(role) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function loginForm(req, res, role = 'buyer', error = '') {
  const csrf = req.csrfToken();
  const action = role === 'admin' ? `${env.adminPath}/login` : `/auth/${role}/login`;
  res.send(layout({
    title: `${roleLabel(role)} login`,
    req,
    body: `<div class="card"><h1>${roleLabel(role)} Login</h1>${error ? `<p class="bad">${escapeHtml(error)}</p>` : ''}<form method="post" action="${action}"><input type="hidden" name="_csrf" value="${csrf}"><input type="hidden" name="next" value="${escapeHtml(req.query.next || '')}"><label>Email</label><input name="email" type="email" required><label>Password</label><input name="password" type="password" required><label><input name="remember" type="checkbox" value="1"> Remember me</label><button>Login</button></form>${role === 'admin' ? '' : `<p><a href="/auth/${role}/forgot-password">Forgot password?</a></p>`}</div>`
  }));
}

function registerForm(req, res, role = 'buyer') {
  if (!allowedRoles.includes(role)) throw new AppError('Registration is not available for this role', 404);
  res.send(layout({
    title: `${roleLabel(role)} registration`,
    req,
    body: `<div class="card"><h1>${roleLabel(role)} Registration</h1><form method="post" action="/auth/${role}/register"><input type="hidden" name="_csrf" value="${req.csrfToken()}"><label>Name</label><input name="name" required maxlength="120"><label>Email</label><input name="email" type="email" required><label>Password</label><input name="password" type="password" minlength="8" required><button>Create account</button></form>${role === 'seller' ? '<p class="muted">Seller accounts require administrator approval before login.</p>' : ''}</div>`
  }));
}

const registerValidators = [
  body('name').trim().isLength({ min: 2, max: 120 }).withMessage('Name must be 2-120 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  validate
];

const loginValidators = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  validate
];

const showLogin = asyncHandler(async (req, res) => loginForm(req, res, req.params.role || 'buyer'));
const showRegister = asyncHandler(async (req, res) => registerForm(req, res, req.params.role || 'buyer'));

const register = asyncHandler(async (req, res) => {
  const role = req.params.role;
  if (!allowedRoles.includes(role)) throw new AppError('Invalid role', 404);
  const user = await registerUser({ role, name: req.body.name, email: req.body.email, password: req.body.password });
  await audit(req, `${role}.registered`, { entityType: 'User', entityId: String(user._id) });
  if (role === 'seller') return res.send(layout({ title: 'Seller pending approval', req, body: '<div class="card"><h1>Registration received</h1><p>Your seller account is pending administrator approval.</p></div>' }));
  req.session.regenerate((error) => {
    if (error) throw error;
    req.session.userId = user._id;
    req.session.role = user.role;
    req.session.save(() => res.redirect('/buyer/dashboard'));
  });
});

const login = asyncHandler(async (req, res) => {
  const role = req.params.role || 'buyer';
  const user = await loginUser({ email: req.body.email, password: req.body.password, req });
  if (role !== user.role && !(role === 'admin' && user.role === 'admin')) throw new AppError('This login page is not valid for your account role', 403);
  await audit(req, `${user.role}.login`, { entityType: 'User', entityId: String(user._id) });
  req.session.regenerate((error) => {
    if (error) throw error;
    req.session.userId = user._id;
    req.session.role = user.role;
    req.session.cookie.maxAge = req.body.remember ? 14 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const next = String(req.body.next || '').startsWith('/') ? req.body.next : dashboardFor(user.role);
    req.session.save(() => res.redirect(next));
  });
});

const logout = asyncHandler(async (req, res) => {
  await audit(req, 'auth.logout');
  req.session.destroy(() => res.clearCookie(env.cookieName).redirect('/auth/buyer/login'));
});

const forgotPasswordForm = asyncHandler(async (req, res) => res.send(layout({
  title: 'Forgot password',
  req,
  body: `<div class="card"><h1>Forgot password</h1><form method="post" action="/auth/${req.params.role}/forgot-password"><input type="hidden" name="_csrf" value="${req.csrfToken()}"><label>Email</label><input name="email" type="email" required><button>Send reset link</button></form></div>`
})));

const forgotPassword = asyncHandler(async (req, res) => {
  const result = await createPasswordReset(req.body.email);
  const devToken = result ? `<p class="muted">Development reset token: <code>${escapeHtml(result.token)}</code></p>` : '';
  res.send(layout({ title: 'Reset requested', req, body: `<div class="card"><h1>If the account exists, a reset link has been sent.</h1>${devToken}</div>` }));
});

const resetPasswordForm = asyncHandler(async (req, res) => res.send(layout({
  title: 'Reset password',
  req,
  body: `<div class="card"><h1>Reset password</h1><form method="post" action="/auth/${req.params.role}/reset-password"><input type="hidden" name="_csrf" value="${req.csrfToken()}"><input type="hidden" name="token" value="${escapeHtml(req.query.token || '')}"><label>New password</label><input name="password" type="password" minlength="8" required><button>Reset password</button></form></div>`
})));

const resetPasswordPost = asyncHandler(async (req, res) => {
  await resetPassword({ token: req.body.token, password: req.body.password });
  res.redirect(`/auth/${req.params.role}/login`);
});

const changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(req.body.currentPassword))) throw new AppError('Current password is incorrect', 400);
  user.password = req.body.newPassword;
  await user.save();
  await audit(req, 'auth.password_changed');
  res.redirect(`/${req.user.role}/security`);
});

module.exports = {
  loginForm,
  showLogin,
  showRegister,
  registerValidators,
  loginValidators,
  register,
  login,
  logout,
  forgotPasswordForm,
  forgotPassword,
  resetPasswordForm,
  resetPasswordPost,
  changePassword
};