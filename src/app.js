'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const { config } = require('./config');
const { globalLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const routes = require('./routes');
const { mountDocs } = require('./docs');
const { NotFoundError } = require('./errors/AppError');

function createApp() {
  const app = express();

  // Mounted before helmet so its default CSP doesn't block Swagger UI assets.
  mountDocs(app);

  app.use(helmet());
  app.use(cors({ origin: config.corsOrigins }));
  app.use(express.json({ limit: '1mb' }));
  app.use(globalLimiter);

  app.get('/health', (_req, res) =>
    res.status(200).json({ data: { status: 'ok', uptime: process.uptime() } })
  );

  app.use('/api/v1', routes);

  // Unknown route → 404 envelope.
  app.use((req, _res, next) => next(new NotFoundError(`Route ${req.method} ${req.path} not found`)));

  app.use(errorHandler);
  return app;
}

module.exports = createApp;
