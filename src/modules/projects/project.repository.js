'use strict';

const prisma = require('../../lib/prisma');

const memberSelect = {
  id: true,
  role: true,
  userId: true,
  createdAt: true,
  user: { select: { id: true, name: true, email: true, avatarUrl: true } },
};

module.exports = {
  createProjectWithManager: (teamId, createdById, { name, description }) =>
    prisma.project.create({
      data: {
        name,
        description,
        teamId,
        createdById,
        memberships: { create: { userId: createdById, role: 'MANAGER' } },
      },
    }),

  listProjectsForTeam: (teamId) =>
    prisma.project.findMany({ where: { teamId }, orderBy: { createdAt: 'asc' } }),

  findProjectById: (id) => prisma.project.findUnique({ where: { id } }),

  findProjectWithMembers: (id) =>
    prisma.project.findUnique({
      where: { id },
      include: { memberships: { select: memberSelect, orderBy: { createdAt: 'asc' } } },
    }),

  findMembership: (userId, projectId) =>
    prisma.projectMembership.findUnique({ where: { userId_projectId: { userId, projectId } } }),

  updateProject: (id, data) => prisma.project.update({ where: { id }, data }),

  deleteProject: (id) => prisma.project.delete({ where: { id } }),

  addMember: (projectId, userId, role) =>
    prisma.projectMembership.create({ data: { projectId, userId, role }, select: memberSelect }),

  removeMember: (projectId, userId) =>
    prisma.projectMembership.delete({ where: { userId_projectId: { userId, projectId } } }),

  memberSelect,
};
