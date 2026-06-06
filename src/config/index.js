'use strict';

const { z } = require('zod');

/**
 * Reads and validates environment configuration once at boot.
 * Fail-fast: an invalid/missing variable throws before the server starts.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_ACCESS_SECRET: z.string().min(1, 'JWT_ACCESS_SECRET is required'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(7),
  INVITE_TTL_DAYS: z.coerce.number().int().positive().default(7),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(10 * 1024 * 1024),
  ALLOWED_MIME: z
    .string()
    .default('image/png,image/jpeg,image/gif,application/pdf,text/plain'),
  CORS_ORIGINS: z.string().default('*'),
});

function loadConfig(env = process.env) {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${issues}`);
  }
  const c = parsed.data;
  return {
    ...c,
    isTest: c.NODE_ENV === 'test',
    isProd: c.NODE_ENV === 'production',
    allowedMime: c.ALLOWED_MIME.split(',').map((s) => s.trim()),
    corsOrigins: c.CORS_ORIGINS === '*' ? '*' : c.CORS_ORIGINS.split(',').map((s) => s.trim()),
  };
}

const config = loadConfig();

module.exports = { config, loadConfig };
