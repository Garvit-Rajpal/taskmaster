'use strict';

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const EmbeddedPostgres = require('embedded-postgres').default;
const db = require('./db-config');

/**
 * Boots a real, userspace PostgreSQL for the whole Jest run, then applies the
 * Prisma schema. Stored on globalThis so global-teardown can stop it.
 */
module.exports = async function globalSetup() {
  fs.rmSync(db.DATA_DIR, { recursive: true, force: true });

  const pg = new EmbeddedPostgres({
    databaseDir: db.DATA_DIR,
    user: db.USER,
    password: db.PASSWORD,
    port: db.PORT,
    persistent: false,
  });

  await pg.initialise();
  await pg.start();
  await pg.createDatabase(db.DATABASE);

  globalThis.__EMBEDDED_PG__ = pg;

  // Apply the schema DDL directly (schema-engine CLI is unavailable here).
  const ddl = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  const client = new Client({ connectionString: db.DATABASE_URL });
  await client.connect();
  await client.query(ddl);
  await client.end();
};
