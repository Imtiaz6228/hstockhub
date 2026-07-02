const User = require('../models/User');
const { Wallet } = require('../models');
const { hashToken, randomToken } = require('../utils/crypto');
const AppError = require('../utils/AppError');

function dashboardFor(role) {
  if (role === 'seller') return '/seller/dashboard';
  if (role === 'admin') return '/admin/dashboard';
  return '/buyer/dashboard';
}

async function registerUser({ role, name, email, password }) {
  const exists = await User.exists({ email: String(email).toLowerCase() });
  if (exists) throw new AppError('Email is already registered', 409, 'EMAIL_EXISTS');
  const status = role === 'seller' ? 'pending' : 'active';
  const user = await User.create({ role, name, email, password, status });
  await Wallet.create({ user: user._id }).catch(() => {});
  return user;
}

async function loginUser({ email, password, req }) {
  const user = await User.findOne({ email: String(email).toLowerCase() }).select('+password');
  if (!user) throw new AppError('Invalid email or password', 401, 'INVALID_LOGIN');
  if (user.isLocked()) throw new AppError('Account locked after repeated failed logins. Try again later.', 423, 'ACCOUNT_LOCKED');
  if (user.status !== 'active') throw new AppError('Account is not active', 403, 'ACCOUNT_INACTIVE');

  const ok = await user.comparePassword(password);
  user.recordLogin({ success: ok, ip: req.ip, userAgent: req.get('user-agent'), reason: ok ? undefined : 'invalid_password' });
  await user.save();
  if (!ok) throw new AppError('Invalid email or password', 401, 'INVALID_LOGIN');
  return user;
}

async function createPasswordReset(value) {
  const user = await User.findOne({ email: String(value).toLowerCase() }).select('+passwordResetTokenHash');
  if (!user) return null;
  const token = randomToken(24);
  user.passwordResetTokenHash = hashToken(token);
  user.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000);
  await user.save();
  return { user, token };
}

async function resetPassword({ token, password }) {
  const user = await User.findOne({ passwordResetTokenHash: hashToken(token), passwordResetExpires: { $gt: new Date() } }).select('+passwordResetTokenHash +password');
  if (!user) throw new AppError('Password reset token is invalid or expired', 400, 'INVALID_RESET_TOKEN');
  user.password = password;
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  return user;
}

module.exports = { registerUser, loginUser, createPasswordReset, resetPassword, dashboardFor };