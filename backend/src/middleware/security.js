const path = require('path');
const fs = require('fs');
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const methodOverride = require('method-override');
const morgan = require('morgan');
const csrf = require('csurf');
const env = require('../config/env');
const logger = require('../utils/logger');
const AppError = require('../utils/AppError');

const csrfProtection = csrf({ cookie: false });

function configureSecurity(app) {
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  }));
  app.use(compression());
  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(methodOverride('_method'));
  app.use(mongoSanitize({ replaceWith: '_' }));
  app.use(cors({
    origin(origin, callback) {
      if (!origin || env.corsOrigins.length === 0 || env.corsOrigins.includes(origin)) return callback(null, true);
      return callback(new AppError('CORS origin denied', 403, 'CORS_DENIED'));
    },
    credentials: true
  }));
  app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

  app.use(session({
    name: env.cookieName,
    secret: env.sessionSecret,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    store: reqMongoStore(),
    cookie: {
      httpOnly: true,
      secure: env.isProduction,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    }
  }));

  const generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 500, standardHeaders: true, legacyHeaders: false });
  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });
  app.use(generalLimiter);
  app.use(['/auth', env.adminPath], authLimiter);
}

function reqMongoStore() {
  if (!global.__HSTOCKHUB_MONGO_CONNECTED__) return undefined;
  return MongoStore.create({ mongoUrl: env.mongoUri, ttl: 14 * 24 * 60 * 60, autoRemove: 'native' });
}

function protectReservedPaths(req, res, next) {
  const reserved = [/^\/admin(?:\/|$)/i, /^\/seller(?:\/|$)/i, /^\/buyer(?:\/|$)/i, /^\/dashboard(?:\/|$)/i];
  if (!reserved.some((pattern) => pattern.test(req.path))) return next();
  if (req.user) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Unauthorized' });
  const login = req.path.startsWith('/seller') ? '/auth/seller/login' : req.path.startsWith('/admin') ? `${env.adminPath}/login` : '/auth/buyer/login';
  return res.redirect(`${login}?next=${encodeURIComponent(req.originalUrl)}`);
}

function servePublicFrontend(app) {
  if (!fs.existsSync(env.frontendDir)) return;
  app.use((req, res, next) => {
    const publicPath = decodeURIComponent(req.path).replace(/\\/g, '/').toLowerCase();
    const blockedLegacyDashboard = [
      /^\/user\/dashboard(?:\.html)?$/,
      /^\/user\/seller(?:\/|$)/,
      /^\/user\/admin(?:\/|$)/,
      /^\/user\/account-settings(?:\.html)?$/,
      /^\/user\/balance_logs(?:\/|$)/,
      /^\/user\/favorites(?:\/|$)/
    ];
    if (!blockedLegacyDashboard.some((pattern) => pattern.test(publicPath))) return next();
    if (req.user) return res.redirect(`/${req.user.role}/dashboard`);
    return res.redirect(`/auth/buyer/login?next=${encodeURIComponent(req.originalUrl)}`);
  });
  app.use(express.static(env.frontendDir, {
    index: false,
    dotfiles: 'ignore',
    setHeaders(res, filePath) {
      if (/\.(html?)$/i.test(filePath)) res.setHeader('Cache-Control', 'no-store');
    }
  }));
  app.get('/', (req, res) => res.sendFile(path.join(env.frontendDir, 'index.html')));
}

module.exports = { configureSecurity, csrfProtection, protectReservedPaths, servePublicFrontend };