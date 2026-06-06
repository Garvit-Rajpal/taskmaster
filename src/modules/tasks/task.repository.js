'use strict';

const prisma = require('../../lib/prisma');

const detailInclude = {
  comments: {
    orderBy: { createdAt: 'desc' },
    include: { author: { select: { id: true, name: true, avatarUrl: true } } },
  },
  attachments: { orderBy: { createdAt: 'desc' } },
};

module.exports = {
  createTask: (data) => prisma.task.create({ data }),

  findById: (id) => prisma.task.findUnique({ where: { id } }),

  findDetailById: (id) => prisma.task.findUnique({ where: { id }, include: detailInclude }),

  updateById: (id, data) => prisma.task.update({ where: { id }, data }),

  deleteById: (id) => prisma.task.delete({ where: { id } }),

  list: ({ where, orderBy, skip, take }) =>
    Promise.all([
      prisma.task.findMany({ where, orderBy, skip, take }),
      prisma.task.count({ where }),
    ]).then(([items, total]) => ({ items, total })),
};
