'use strict';

const swaggerUi = require('swagger-ui-express');
const { openapiSpec } = require('./openapi');

/**
 * Mounts interactive API docs.
 *   GET /docs        → Swagger UI
 *   GET /docs.json   → raw OpenAPI document
 */
function mountDocs(app) {
  app.get('/docs.json', (_req, res) => res.json(openapiSpec));
  app.use(
    '/docs',
    swaggerUi.serve,
    swaggerUi.setup(openapiSpec, {
      explorer: true,
      customSiteTitle: 'Task Tracker API Docs',
    })
  );
}

module.exports = { mountDocs, openapiSpec };
