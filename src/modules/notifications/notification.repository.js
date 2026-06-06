'use strict';

const prisma = require('../../lib/prisma');

module.exports = {
  create: (data) => prisma.notification.create({ data }),

  listForUser: (userId) =>
    prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),

  findById: (id) => prisma.notification.findUnique({ where: { id } }),

  markRead: (id) =>
    prisma.notification.update({ where: { id }, data: { readAt: new Date() } }),
};
