'use strict';

// Must run BEFORE any module that constructs PrismaClient reads the env.
const db = require('./db-config');
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = db.DATABASE_URL;
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_ACCESS_TTL = '15m';
process.env.BCRYPT_ROUNDS = '4';

// Store uploaded files under a throwaway tmp dir during tests.
const os = require('os');
const path = require('path');
process.env.UPLOAD_DIR = path.join(os.tmpdir(), 'taskmaster-test-uploads');
// Small cap so the oversize-upload test doesn't need a 10MB buffer.
process.env.MAX_UPLOAD_BYTES = '8192';

const prisma = require('../src/lib/prisma');

// Truncate every table between tests so suites are order-independent.
const TABLES = [
  'Notification',
  'Attachment',
  'Comment',
  'Task',
  'ProjectMembership',
  'Project',
  'Invitation',
  'TeamMembership',
  'Team',
  'RefreshToken',
  'User',
];

beforeEach(async () => {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${TABLES.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE;`
  );
});

afterAll(async () => {
  await prisma.$disconnect();
});
