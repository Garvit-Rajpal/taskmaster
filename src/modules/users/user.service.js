'use strict';

const repo = require('./user.repository');
const authRepo = require('../auth/auth.repository');
const { hashPassword, verifyPassword } = require('../../utils/password');
const { NotFoundError, UnauthenticatedError } = require('../../errors/AppError');

async function getMe(userId) {
  const user = await repo.findById(userId);
  if (!user) throw new NotFoundError('User not found');
  return user;
}

async function getById(id) {
  const user = await repo.findLimitedById(id);
  if (!user) throw new NotFoundError('User not found');
  return user;
}

async function updateMe(userId, input) {
  const { name, avatarUrl, currentPassword, newPassword } = input;
  const data = {};
  if (name !== undefined) data.name = name;
  if (avatarUrl !== undefined) data.avatarUrl = avatarUrl;

  if (newPassword !== undefined) {
    const existing = await repo.findByIdWithPassword(userId);
    if (!existing) throw new NotFoundError('User not found');
    const valid = await verifyPassword(currentPassword, existing.password);
    if (!valid) {
      throw new UnauthenticatedError('Current password is incorrect', 'INVALID_CREDENTIALS');
    }
    data.password = await hashPassword(newPassword);
  }

  const updated = await repo.updateById(userId, data);

  // Changing the password invalidates every existing session.
  if (data.password) await authRepo.revokeAllForUser(userId);

  return updated;
}

module.exports = { getMe, getById, updateMe };
