const createApp = require('./src/app');
const { connectDatabase } = require('./src/config/database');
const env = require('./src/config/env');
const logger = require('./src/utils/logger');

async function start() {
  global.__HSTOCKHUB_MONGO_CONNECTED__ = await connectDatabase();
  const app = createApp();
  const server = app.listen(env.port, () => {
    logger.info(`hstockhub.com secure backend running at ${env.appUrl} on port ${env.port}`);
    logger.info(`Configurable admin login path: ${env.adminPath}/login`);
  });

  const shutdown = (signal) => {
    logger.info(`${signal} received, shutting down gracefully`);
    server.close(() => process.exit(0));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

if (require.main === module) {
  start().catch((error) => {
    logger.error('Failed to start server', { error: error.message, stack: error.stack });
    process.exit(1);
  });
}

module.exports = { createApp, start };