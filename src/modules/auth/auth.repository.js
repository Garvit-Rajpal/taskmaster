'use strict';

const prisma = require('../../lib/prisma');

const publicUser = { id: true, email: true, name: true, avatarUrl: true, createdAt: true };

module.exports = {
  findUserByEmail: (email) => prisma.user.findUnique({ where: { email } }),

  createUser: (data) => prisma.user.create({ data, select: publicUser }),

  createRefreshToken: (data) => prisma.refreshToken.create({ data }),

  findRefreshByHash: (tokenHash) =>
    prisma.refreshToken.findUnique({ where: { tokenHash } }),

  revokeRefreshToken: (id, replacedByTokenId = null) =>
    prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date(), replacedByTokenId },
    }),

  revokeAllForUser: (userId) =>
    prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),

  publicUser,
};
