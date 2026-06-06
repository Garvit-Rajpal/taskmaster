'use strict';

const { z } = require('zod');

// Password policy: >= 8 chars with upper, lower, digit, and symbol.
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[0-9]/, 'Password must contain a digit')
  .regex(/[^A-Za-z0-9]/, 'Password must contain a symbol');

const email = z.string().email('Invalid email').transform((s) => s.toLowerCase().trim());

const registerSchema = {
  body: z.object({
    email,
    password,
    name: z.string().min(1).max(80),
  }),
};

const loginSchema = {
  body: z.object({
    email,
    password: z.string().min(1),
  }),
};

const refreshSchema = {
  body: z.object({ refreshToken: z.string().min(1) }),
};

module.exports = { registerSchema, loginSchema, refreshSchema, password };
