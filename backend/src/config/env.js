const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

function normalizePath(value, fallback) {
  const raw = String(value || fallback || '').trim();
  const withSlash = raw.startsWith('/') ? raw : `/${raw}`;
  return withSlash.replace(/\/+$/, '') || fallback;
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT || 3000),
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/haoyi',
  sessionSecret: process.env.SESSION_SECRET || 'dev-only-change-this-session-secret',
  cookieName: process.env.COOKIE_NAME || 'haoyi.sid',
  csrfCookieName: process.env.CSRF_COOKIE_NAME || 'haoyi.csrf',
  adminPath: normalizePath(process.env.ADMIN_PATH, '/secure-admin-portal'),
  adminBootstrapKey: process.env.ADMIN_BOOTSTRAP_KEY || '',
  corsOrigins: String(process.env.CORS_ORIGINS || '').split(',').map((item) => item.trim()).filter(Boolean),
  uploadMaxBytes: Number(process.env.UPLOAD_MAX_BYTES || 5 * 1024 * 1024),
  webhookSecret: process.env.WEBHOOK_SECRET || 'dev-webhook-secret',
  dataEncryptionKey: process.env.DATA_ENCRYPTION_KEY || 'dev-only-change-this-data-encryption-key',
  frontendDir: path.resolve(__dirname, '..', '..', '..', 'HaoYi.com')
};

module.exports = env;