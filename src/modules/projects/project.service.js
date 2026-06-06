'use strict';

const repo = require('./project.repository');
const teamRepo = require('../teams/team.repository');
const teamService = require('../teams/team.service');
const {
  ValidationError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} = require('../../errors/AppError');

/**
 * Ensure project exists (404) and the actor is a project member (403). If
 * `requireManager`, the actor must hold the MANAGER role. Returns { project, membership }.
 */
async function requireProjectAccess(userId, projectId, { requireManager = false } = {}) {
  const project = await repo.findProjectById(projectId);
  if (!project) throw new NotFoundError('Project not found');
  const membership = await repo.findMembership(userId, projectId);
  if (!membership) throw new ForbiddenError('You are not a member of this project');
  if (requireManager && membership.role !== 'MANAGER') {
    throw new ForbiddenError('Only a project manager can perform this action');
  }
  return { project, membership };
}

async function createProject(userId, teamId, input) {
  // Must be a member of the team to create a project under it.
  await teamService.requireRole(userId, teamId, 'MEMBER');
  return repo.createProjectWithManager(teamId, userId, input);
}

async function listProjects(userId, teamId) {
  await teamService.requireRole(userId, teamId, 'MEMBER');
  return repo.listProjectsForTeam(teamId);
}

async function getProject(userId, projectId) {
  await requireProjectAccess(userId, projectId);
  const project = await repo.findProjectWithMembers(projectId);
  const { memberships, ...rest } = project;
  return { ...rest, members: memberships };
}

async function updateProject(userId, projectId, data) {
  await requireProjectAccess(userId, projectId, { requireManager: true });
  return repo.updateProject(projectId, data);
}

async function deleteProject(userId, projectId) {
  await requireProjectAccess(userId, projectId, { requireManager: true });
  await repo.deleteProject(projectId);
}

async function addMember(actorId, projectId, { userId, role }) {
  const { project } = await requireProjectAccess(actorId, projectId, { requireManager: true });

  // Target must be a member of the owning team.
  const teamMembership = await teamRepo.findMembership(userId, project.teamId);
  if (!teamMembership) {
    throw new ValidationError(
      [{ field: 'body.userId', message: 'User must be a member of the team' }],
      'User is not a team member'
    );
  }

  const existing = await repo.findMembership(userId, projectId);
  if (existing) throw new ConflictError('User is already a project member', 'ALREADY_MEMBER');

  return repo.addMember(projectId, userId, role);
}

async function removeMember(actorId, projectId, targetUserId) {
  await requireProjectAccess(actorId, projectId, { requireManager: true });
  const membership = await repo.findMembership(targetUserId, projectId);
  if (!membership) throw new NotFoundError('Project member not found');
  await repo.removeMember(projectId, targetUserId);
}

module.exports = {
  requireProjectAccess,
  createProject,
  listProjects,
  getProject,
  updateProject,
  deleteProject,
  addMember,
  removeMember,
};
