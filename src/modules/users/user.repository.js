'use strict';

const prisma = require('../../lib/prisma');

const publicProfile = { id: true, email: true, name: true, avatarUrl: true, createdAt: true };
// Limited fields exposed when viewing *other* users.
const limitedProfile = { id: true, name: true, avatarUrl: true, createdAt: true };

module.exports = {
  findById: (id) => prisma.user.findUnique({ where: { id }, select: publicProfile }),

  findByEmail: (email) =>
    prisma.user.findUnique({ where: { email }, select: { id: true, email: true } }),

  findByIdWithPassword: (id) => prisma.user.findUnique({ where: { id } }),

  findLimitedById: (id) => prisma.user.findUnique({ where: { id }, select: limitedProfile }),

  updateById: (id, data) =>
    prisma.user.update({ where: { id }, data, select: publicProfile }),

  publicProfile,
  limitedProfile,
};
