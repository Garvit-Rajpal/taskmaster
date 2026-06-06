'use strict';

const os = require('os');
const path = require('path');

// Shared constants for the embedded Postgres used in the test suite.
const PORT = Number(process.env.TEST_PG_PORT || 54330);
const USER = 'postgres';
const PASSWORD = 'postgres';
const DATABASE = 'taskmaster_test';
const DATA_DIR = path.join(os.tmpdir(), 'taskmaster-pgdata');
const DATABASE_URL = `postgresql://${USER}:${PASSWORD}@localhost:${PORT}/${DATABASE}?schema=public`;

module.exports = { PORT, USER, PASSWORD, DATABASE, DATA_DIR, DATABASE_URL };
