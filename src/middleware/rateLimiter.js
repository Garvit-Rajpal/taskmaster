'use strict';

const rateLimit = require('express-rate-limit');
const { config } = require('../config');

const json429 = {
  error: { code: 'RATE_LIMITED', message: 'Too many requests, try again later', details: [] },
};

// Disabled in tests to keep suites deterministic.
const noop = (_req, _res, next) => next();

const globalLimiter = config.isTest
  ? noop
  : rateLimit({ windowMs: 60 * 1000, max: 300, message: json429, standardHeaders: true });

const authLimiter = config.isTest
  ? noop
  : rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: json429, standardHeaders: true });

module.exports = { globalLimiter, authLimiter };
