'use strict';

const prisma = require('../../lib/prisma');

module.exports = {
  create: (data) => prisma.attachment.create({ data }),

  findById: (id) => prisma.attachment.findUnique({ where: { id } }),

  listByTask: (taskId) =>
    prisma.attachment.findMany({ where: { taskId }, orderBy: { createdAt: 'desc' } }),

  delete: (id) => prisma.attachment.delete({ where: { id } }),
};
