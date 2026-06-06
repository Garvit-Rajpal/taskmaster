'use strict';

const { AppError } = require('../errors/AppError');
const logger = require('../lib/logger');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, details: err.details || [] },
    });
  }

  // Prisma known errors → friendly mappings.
  if (err && err.code === 'P2002') {
    return res.status(409).json({
      error: { code: 'CONFLICT', message: 'Resource already exists', details: [] },
    });
  }
  if (err && err.code === 'P2025') {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Resource not found', details: [] },
    });
  }

  logger.error({ err }, 'Unhandled error');
  return res.status(500).json({
    error: { code: 'INTERNAL', message: 'Internal server error', details: [] },
  });
}

module.exports = errorHandler;
