const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const env = require('../config/env');
const { layout, escapeHtml } = require('../utils/view');

function notFound(req, res, next) {
  next(new AppError('Route not found', 404, 'NOT_FOUND'));
}

function errorHandler(error, req, res, next) {
  const statusCode = error.statusCode || (error.name === 'CastError' ? 404 : 500);
  const code = error.code || error.name || 'SERVER_ERROR';
  const message = statusCode >= 500 && env.isProduction ? 'Server error' : error.message;

  logger.error(message, { code, statusCode, path: req.originalUrl, stack: error.stack });

  if (req.accepts('json') && !req.accepts('html')) {
    return res.status(statusCode).json({ error: message, code });
  }

  return res.status(statusCode).send(layout({
    title: `${statusCode} Error`,
    req,
    body: `<div class="card"><h1>${statusCode}</h1><p class="bad">${escapeHtml(message)}</p></div>`
  }));
}

module.exports = { notFound, errorHandler };