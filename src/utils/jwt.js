'use strict';

const jwt = require('jsonwebtoken');
const { config } = require('../config');

function signAccessToken(user) {
  return jwt.sign({ sub: user.id }, config.JWT_ACCESS_SECRET, {
    expiresIn: config.JWT_ACCESS_TTL,
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, config.JWT_ACCESS_SECRET);
}

module.exports = { signAccessToken, verifyAccessToken };
