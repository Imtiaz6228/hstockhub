const User = require('../models/User');
const AppError = require('../utils/AppError');

async function attachCurrentUser(req, res, next) {
  try {
    if (!req.session?.userId) return next();
    const user = await User.findById(req.session.userId);
    if (!user || user.status !== 'active') {
      req.session.destroy(() => {});
      return next();
    }
    req.user = user;
    res.locals.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
}

function requireAuth(req, res, next) {
  if (req.user) return next();
  if (req.accepts('html')) return res.redirect(`/auth/buyer/login?next=${encodeURIComponent(req.originalUrl)}`);
  return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return requireAuth(req, res, next);
    if (req.user.role === 'admin' || roles.includes(req.user.role)) return next();
    return next(new AppError('Forbidden', 403, 'FORBIDDEN'));
  };
}

function requireExactRole(role) {
  return (req, res, next) => {
    if (!req.user) return requireAuth(req, res, next);
    if (req.user.role === role) return next();
    return next(new AppError('Forbidden', 403, 'FORBIDDEN'));
  };
}

function ensureOwnership(getOwnerId) {
  return async (req, res, next) => {
    try {
      if (req.user?.role === 'admin') return next();
      const ownerId = await getOwnerId(req);
      if (ownerId && String(ownerId) === String(req.user._id)) return next();
      return next(new AppError('Resource not found', 404, 'NOT_FOUND'));
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = { attachCurrentUser, requireAuth, requireRole, requireExactRole, ensureOwnership };