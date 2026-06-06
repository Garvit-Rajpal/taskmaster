'use strict';

const prisma = require('../../lib/prisma');

const authorSelect = { author: { select: { id: true, name: true, avatarUrl: true } } };

module.exports = {
  create: (data) => prisma.comment.create({ data, include: authorSelect }),

  findById: (id) => prisma.comment.findUnique({ where: { id } }),

  listByTask: ({ taskId, skip, take }) =>
    Promise.all([
      prisma.comment.findMany({
        where: { taskId },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: authorSelect,
      }),
      prisma.comment.count({ where: { taskId } }),
    ]).then(([items, total]) => ({ items, total })),

  update: (id, data) => prisma.comment.update({ where: { id }, data, include: authorSelect }),

  delete: (id) => prisma.comment.delete({ where: { id } }),
};
