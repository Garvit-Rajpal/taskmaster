'use strict';

const crypto = require('crypto');
const { config } = require('../config');

/** Generate an opaque refresh token (raw) and its sha-256 hash (stored). */
function generateRefreshToken() {
  const raw = crypto.randomBytes(48).toString('hex');
  return { raw, hash: hashToken(raw) };
}

function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function refreshExpiry(now = new Date()) {
  const d = new Date(now);
  d.setDate(d.getDate() + config.JWT_REFRESH_TTL_DAYS);
  return d;
}

module.exports = { generateRefreshToken, hashToken, refreshExpiry };
