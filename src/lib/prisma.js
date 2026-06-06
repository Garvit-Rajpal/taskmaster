'use strict';

// Use the WASM query engine build (no native engine binary required); the pg
// driver adapter handles the actual database I/O.
const { PrismaClient } = require('../generated/prisma/wasm-node.cjs');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const { config } = require('../config');

// Use the pg driver adapter + bundled WASM query engine.
// This keeps the client free of a platform-specific native engine binary.
const pool = global.__pgPool || new Pool({ connectionString: config.DATABASE_URL });
// Swallow idle-connection errors (e.g. when the test DB shuts down).
pool.on('error', () => {});
const adapter = new PrismaPg(pool);

const prisma = global.__prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
  global.__pgPool = pool;
  global.__prisma = prisma;
}

module.exports = prisma;
