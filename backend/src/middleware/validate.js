const { validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

function validate(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  return next(new AppError(errors.array().map((item) => item.msg).join(', '), 422, 'VALIDATION_ERROR'));
}

module.exports = validate;