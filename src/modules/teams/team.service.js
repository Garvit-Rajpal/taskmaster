'use strict';

const repo = require('./team.repository');
const userRepo = require('../users/user.repository');
const { generateRefreshToken } = require('../../utils/tokens');
const { config } = require('../../config');
const {
  AppError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} = require('../../errors/AppError');

const ROLE_RANK = { MEMBER: 1, ADMIN: 2, OWNER: 3 };

/**
 * Ensure the team exists (404 otherwise) and the actor is a member with at least
 * `minRole` (403 otherwise). Returns { team, membership }.
 */
async function requireRole(userId, teamId, minRole = 'MEMBER') {
  const team = await repo.findTeamById(teamId);
  if (!team) throw new NotFoundError('Team not found');
  const membership = await repo.findMembership(userId, teamId);
  if (!membership) throw new ForbiddenError('You are not a member of this team');
  if (ROLE_RANK[membership.role] < ROLE_RANK[minRole]) {
    throw new ForbiddenError('Insufficient team role for this action');
  }
  return { team, membership };
}

async function createTeam(userId, input) {
  return repo.createTeamWithOwner(userId, input);
}

async function listTeams(userId) {
  return repo.listTeamsForUser(userId);
}

async function getTeam(userId, teamId) {
  await requireRole(userId, teamId, 'MEMBER');
  const team = await repo.findTeamWithMembers(teamId);
  const { memberships, ...rest } = team;
  return { ...rest, members: memberships };
}

async function updateTeam(userId, teamId, data) {
  await requireRole(userId, teamId, 'ADMIN');
  return repo.updateTeam(teamId, data);
}

async function deleteTeam(userId, teamId) {
  await requireRole(userId, teamId, 'OWNER');
  await repo.deleteTeam(teamId);
}

async function addMember(actorId, teamId, { userId, role }) {
  await requireRole(actorId, teamId, 'ADMIN');

  const target = await userRepo.findById(userId);
  if (!target) throw new NotFoundError('User not found');

  const existing = await repo.findMembership(userId, teamId);
  if (existing) throw new ConflictError('User is already a team member', 'ALREADY_MEMBER');

  return repo.addMember(teamId, userId, role);
}

async function removeMember(actorId, teamId, targetUserId) {
  const { team } = await requireRole(actorId, teamId, 'ADMIN');
  if (targetUserId === team.ownerId) {
    throw new ForbiddenError('The team owner cannot be removed');
  }
  const membership = await repo.findMembership(targetUserId, teamId);
  if (!membership) throw new NotFoundError('Member not found');
  await repo.removeMember(teamId, targetUserId);
}

async function inviteByEmail(actorId, teamId, { email, role }) {
  await requireRole(actorId, teamId, 'ADMIN');

  // If a user with this email already belongs to the team, reject.
  const existingUser = await userRepo.findByEmail(email);
  if (existingUser) {
    const membership = await repo.findMembership(existingUser.id, teamId);
    if (membership) throw new ConflictError('User is already a team member', 'ALREADY_MEMBER');
  }

  const { raw: token } = generateRefreshToken();
  const expiresAt = new Date(Date.now() + config.INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
  return repo.createInvitation({ email, teamId, invitedById: actorId, role, token, expiresAt });
}

async function acceptInvitation(user, token) {
  const invite = await repo.findInvitationByToken(token);
  if (!invite) throw new NotFoundError('Invitation not found');

  if (invite.status !== 'PENDING') {
    throw new ConflictError('Invitation is no longer valid', 'INVITE_USED');
  }
  if (invite.expiresAt < new Date()) {
    await repo.updateInvitation(invite.id, { status: 'EXPIRED' });
    throw new AppError(410, 'INVITE_EXPIRED', 'Invitation has expired');
  }
  if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
    throw new ForbiddenError('This invitation was issued to a different email');
  }

  const existing = await repo.findMembership(user.id, invite.teamId);
  if (existing) {
    await repo.updateInvitation(invite.id, { status: 'ACCEPTED' });
    throw new ConflictError('User is already a team member', 'ALREADY_MEMBER');
  }

  const membership = await repo.addMember(invite.teamId, user.id, invite.role);
  await repo.updateInvitation(invite.id, { status: 'ACCEPTED' });
  return membership;
}

module.exports = {
  requireRole,
  createTeam,
  listTeams,
  getTeam,
  updateTeam,
  deleteTeam,
  addMember,
  removeMember,
  inviteByEmail,
  acceptInvitation,
};
