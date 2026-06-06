'use strict';

/** Standard success envelope. */
function ok(res, data, status = 200, meta) {
  const body = { data };
  if (meta) body.meta = meta;
  return res.status(status).json(body);
}

/** Wrap async controller handlers so thrown errors reach the error middleware. */
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = { ok, asyncHandler };
