'use strict';

const request = require('supertest');
const createApp = require('../../src/app');

const app = createApp();

let counter = 0;
function uniqueEmail(prefix = 'user') {
  counter += 1;
  return `${prefix}.${Date.now()}.${counter}@example.com`;
}

/** Register a user and return { user, accessToken, refreshToken, email, password }. */
async function registerUser(overrides = {}) {
  const email = overrides.email || uniqueEmail();
  const password = overrides.password || 'Str0ng!pass';
  const name = overrides.name || 'Test User';
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ email, password, name });
  return { ...res.body.data, email, password, status: res.status };
}

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

/** Create a team owned by the given user; returns the team object (res.body.data). */
async function createTeam(accessToken, overrides = {}) {
  const res = await request(app)
    .post('/api/v1/teams')
    .set(authHeader(accessToken))
    .send({ name: overrides.name || 'Team Alpha', description: overrides.description });
  return { ...res.body.data, status: res.status };
}

/** Add an existing user to a team (default role MEMBER). */
async function addTeamMember(ownerToken, teamId, userId, role = 'MEMBER') {
  return request(app)
    .post(`/api/v1/teams/${teamId}/members`)
    .set(authHeader(ownerToken))
    .send({ userId, role });
}

/** Create a project under a team; returns res.body.data + status. */
async function createProject(accessToken, teamId, overrides = {}) {
  const res = await request(app)
    .post(`/api/v1/teams/${teamId}/projects`)
    .set(authHeader(accessToken))
    .send({ name: overrides.name || 'Project X', description: overrides.description });
  return { ...res.body.data, status: res.status };
}

/** Add an existing team member to a project (default role MEMBER). */
async function addProjectMember(managerToken, projectId, userId, role = 'MEMBER') {
  return request(app)
    .post(`/api/v1/projects/${projectId}/members`)
    .set(authHeader(managerToken))
    .send({ userId, role });
}

/** Create a task under a project; returns res.body.data + status. */
async function createTask(accessToken, projectId, overrides = {}) {
  const res = await request(app)
    .post(`/api/v1/projects/${projectId}/tasks`)
    .set(authHeader(accessToken))
    .send({ title: overrides.title || 'Task 1', ...overrides });
  return { ...res.body.data, status: res.status };
}

module.exports = {
  app,
  request,
  registerUser,
  uniqueEmail,
  authHeader,
  createTeam,
  addTeamMember,
  createProject,
  addProjectMember,
  createTask,
};
