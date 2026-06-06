'use strict';

// Load environment variables from .env before anything reads process.env.
require('dotenv').config();

const createApp = require('./app');
const { config } = require('./config');
const logger = require('./lib/logger');
const prisma = require('./lib/prisma');

const app = createApp();
const server = app.listen(config.PORT, () => {
  logger.info(`TaskMaster API listening on port ${config.PORT}`);
});

async function shutdown(signal) {
  logger.info(`${signal} received, shutting down gracefully`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = server;
