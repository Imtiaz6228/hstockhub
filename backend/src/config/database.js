const mongoose = require('mongoose');
const env = require('./env');
const logger = require('../utils/logger');

mongoose.set('strictQuery', true);

async function connectDatabase() {
  mongoose.connection.on('error', (error) => logger.error('MongoDB connection error', { error: error.message }));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));

  try {
    await mongoose.connect(env.mongoUri, {
      autoIndex: !env.isProduction,
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 50
    });
  } catch (error) {
    if (env.isProduction || process.env.REQUIRE_MONGO === 'true') throw error;
    logger.warn('MongoDB is unavailable; starting in development public-preview mode. Authenticated dashboards and database APIs require MongoDB.', { error: error.message });
    return false;
  }

  logger.info('MongoDB connected', { database: mongoose.connection.name });
  return true;
}

module.exports = { connectDatabase };