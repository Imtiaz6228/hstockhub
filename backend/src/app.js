const express = require('express');
const env = require('./config/env');
const { configureSecurity, protectReservedPaths, servePublicFrontend } = require('./middleware/security');
const { attachCurrentUser } = require('./middleware/auth');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const buyerRoutes = require('./routes/buyerRoutes');
const sellerRoutes = require('./routes/sellerRoutes');
const adminRoutes = require('./routes/adminRoutes');
const apiRoutes = require('./routes/apiRoutes');

function createApp() {
  const app = express();
  configureSecurity(app);
  app.use(attachCurrentUser);

  app.use('/api', apiRoutes);
  app.use('/auth', authRoutes);
  app.use('/buyer', buyerRoutes);
  app.use('/seller', sellerRoutes);
  app.use(env.adminPath, adminRoutes);
  app.get('/dashboard', (req, res) => {
    if (!req.user) return res.redirect('/auth/buyer/login?next=/dashboard');
    return res.redirect(`/${req.user.role}/dashboard`);
  });

  // Legacy /admin URLs are not linked publicly. Unauthenticated users are sent to the hidden configurable login path.
  app.use('/admin', (req, res) => {
    if (!req.user) return res.redirect(`${env.adminPath}/login?next=${encodeURIComponent(req.originalUrl)}`);
    return res.redirect(`${env.adminPath}${req.path === '/' ? '/dashboard' : req.path}`);
  });

  app.use(protectReservedPaths);
  servePublicFrontend(app);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = createApp;