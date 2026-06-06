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
  createTeamWithOwner: (ownerId, { name, description }) =>
    prisma.team.create({
      data: {
        name,
        description,
        ownerId,
        memberships: { create: { userId: ownerId, role: 'OWNER' } },
      },
    }),

  listTeamsForUser: (userId) =>
    prisma.team.findMany({
      where: { memberships: { some: { userId } } },
      orderBy: { createdAt: 'asc' },
    }),

  findTeamById: (id) => prisma.team.findUnique({ where: { id } }),

  findTeamWithMembers: (id) =>
    prisma.team.findUnique({
      where: { id },
      include: { memberships: { select: memberSelect, orderBy: { createdAt: 'asc' } } },
    }),

  findMembership: (userId, teamId) =>
    prisma.teamMembership.findUnique({ where: { userId_teamId: { userId, teamId } } }),

  updateTeam: (id, data) => prisma.team.update({ where: { id }, data }),

  deleteTeam: (id) => prisma.team.delete({ where: { id } }),

  addMember: (teamId, userId, role) =>
    prisma.teamMembership.create({ data: { teamId, userId, role }, select: memberSelect }),

  removeMember: (teamId, userId) =>
    prisma.teamMembership.delete({ where: { userId_teamId: { userId, teamId } } }),

  // Invitations
  createInvitation: (data) => prisma.invitation.create({ data }),

  findInvitationByToken: (token) => prisma.invitation.findUnique({ where: { token } }),

  updateInvitation: (id, data) => prisma.invitation.update({ where: { id }, data }),

  memberSelect,
};
