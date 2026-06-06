'use strict';

const pino = require('pino');
const { config } = require('../config');

const logger = pino({
  level: config.isTest ? 'silent' : config.isProd ? 'info' : 'debug',
});

module.exports = logger;
