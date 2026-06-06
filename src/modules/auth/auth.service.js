'use strict';

const repo = require('./auth.repository');
const { hashPassword, verifyPassword } = require('../../utils/password');
const { signAccessToken } = require('../../utils/jwt');
const { generateRefreshToken, hashToken, refreshExpiry } = require('../../utils/tokens');
const {
  ConflictError,
  UnauthenticatedError,
} = require('../../errors/AppError');

async function issueTokens(user) {
  const accessToken = signAccessToken(user);
  const { raw, hash } = generateRefreshToken();
  await repo.createRefreshToken({
    userId: user.id,
    tokenHash: hash,
    expiresAt: refreshExpiry(),
  });
  return { accessToken, refreshToken: raw };
}

async function register({ email, password, name }) {
  const existing = await repo.findUserByEmail(email);
  if (existing) throw new ConflictError('Email already registered', 'EMAIL_TAKEN');
  const user = await repo.createUser({ email, name, password: await hashPassword(password) });
  const tokens = await issueTokens(user);
  return { user, ...tokens };
}

async function login({ email, password }) {
  const user = await repo.findUserByEmail(email);
  // Generic error in both branches to prevent user enumeration.
  if (!user || !(await verifyPassword(password, user.password))) {
    throw new UnauthenticatedError('Invalid email or password', 'INVALID_CREDENTIALS');
  }
  const safeUser = { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl };
  const tokens = await issueTokens(safeUser);
  return { user: safeUser, ...tokens };
}

async function refresh({ refreshToken }) {
  const tokenHash = hashToken(refreshToken);
  const row = await repo.findRefreshByHash(tokenHash);

  if (!row) throw new UnauthenticatedError('Invalid refresh token', 'TOKEN_INVALID');
  if (row.expiresAt < new Date())
    throw new UnauthenticatedError('Refresh token expired', 'TOKEN_EXPIRED');

  // Reuse of an already-revoked token → treat as theft, revoke the whole chain.
  if (row.revokedAt) {
    await repo.revokeAllForUser(row.userId);
    throw new UnauthenticatedError('Refresh token reuse detected', 'TOKEN_REUSED');
  }

  // Rotate: mint a new pair, then revoke the old row pointing to the new one.
  const user = { id: row.userId };
  const accessToken = signAccessToken(user);
  const { raw, hash } = generateRefreshToken();
  const created = await repo.createRefreshToken({
    userId: row.userId,
    tokenHash: hash,
    expiresAt: refreshExpiry(),
  });
  await repo.revokeRefreshToken(row.id, created.id);

  return { accessToken, refreshToken: raw };
}

async function logout({ refreshToken }) {
  const row = await repo.findRefreshByHash(hashToken(refreshToken));
  if (row && !row.revokedAt) await repo.revokeRefreshToken(row.id);
  // Idempotent: always succeed without leaking token state.
}

module.exports = { register, login, refresh, logout, issueTokens };
