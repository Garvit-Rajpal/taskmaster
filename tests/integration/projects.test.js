'use strict';

const {
  app,
  request,
  registerUser,
  authHeader,
  createTeam,
  addTeamMember,
  createProject,
} = require('../helpers/factory');

describe('Projects (US-13..15)', () => {
  describe('POST /api/v1/teams/:teamId/projects', () => {
    it('lets a team member create a project and become MANAGER → 201', async () => {
      const owner = await registerUser();
      const team = await createTeam(owner.accessToken);
      const res = await request(app)
        .post(`/api/v1/teams/${team.id}/projects`)
        .set(authHeader(owner.accessToken))
        .send({ name: 'Apollo', description: 'Launch project' });

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({ name: 'Apollo', teamId: team.id });
      expect(res.body.data).toHaveProperty('id');
    });

    it('forbids a non-team-member from creating a project → 403', async () => {
      const owner = await registerUser();
      const stranger = await registerUser();
      const team = await createTeam(owner.accessToken);
      const res = await request(app)
        .post(`/api/v1/teams/${team.id}/projects`)
        .set(authHeader(stranger.accessToken))
        .send({ name: 'Sneaky' });
      expect(res.status).toBe(403);
    });

    it('rejects an empty name → 422', async () => {
      const owner = await registerUser();
      const team = await createTeam(owner.accessToken);
      const res = await request(app)
        .post(`/api/v1/teams/${team.id}/projects`)
        .set(authHeader(owner.accessToken))
        .send({ name: '' });
      expect(res.status).toBe(422);
    });
  });

  describe('GET /api/v1/teams/:teamId/projects', () => {
    it('lists projects for a team member', async () => {
      const owner = await registerUser();
      const team = await createTeam(owner.accessToken);
      await createProject(owner.accessToken, team.id, { name: 'P1' });
      await createProject(owner.accessToken, team.id, { name: 'P2' });

      const res = await request(app)
        .get(`/api/v1/teams/${team.id}/projects`)
        .set(authHeader(owner.accessToken));
      expect(res.status).toBe(200);
      expect(res.body.data.map((p) => p.name).sort()).toEqual(['P1', 'P2']);
    });

    it('forbids a non-team-member from listing → 403', async () => {
      const owner = await registerUser();
      const stranger = await registerUser();
      const team = await createTeam(owner.accessToken);
      const res = await request(app)
        .get(`/api/v1/teams/${team.id}/projects`)
        .set(authHeader(stranger.accessToken));
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/projects/:id', () => {
    it('returns detail for a project member', async () => {
      const owner = await registerUser();
      const team = await createTeam(owner.accessToken);
      const project = await createProject(owner.accessToken, team.id);
      const res = await request(app)
        .get(`/api/v1/projects/${project.id}`)
        .set(authHeader(owner.accessToken));
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ id: project.id });
      expect(Array.isArray(res.body.data.members)).toBe(true);
    });

    it('forbids a team member who is not a project member → 403', async () => {
      const owner = await registerUser();
      const teammate = await registerUser();
      const team = await createTeam(owner.accessToken);
      await addTeamMember(owner.accessToken, team.id, teammate.user.id);
      const project = await createProject(owner.accessToken, team.id);

      const res = await request(app)
        .get(`/api/v1/projects/${project.id}`)
        .set(authHeader(teammate.accessToken));
      expect(res.status).toBe(403);
    });

    it('returns 404 for an unknown project', async () => {
      const u = await registerUser();
      const res = await request(app)
        .get('/api/v1/projects/00000000-0000-0000-0000-000000000000')
        .set(authHeader(u.accessToken));
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH/DELETE /api/v1/projects/:id', () => {
    it('lets the MANAGER update the project → 200', async () => {
      const owner = await registerUser();
      const team = await createTeam(owner.accessToken);
      const project = await createProject(owner.accessToken, team.id);
      const res = await request(app)
        .patch(`/api/v1/projects/${project.id}`)
        .set(authHeader(owner.accessToken))
        .send({ name: 'Renamed' });
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Renamed');
    });

    it('forbids a project MEMBER from updating → 403', async () => {
      const owner = await registerUser();
      const member = await registerUser();
      const team = await createTeam(owner.accessToken);
      await addTeamMember(owner.accessToken, team.id, member.user.id);
      const project = await createProject(owner.accessToken, team.id);
      await request(app)
        .post(`/api/v1/projects/${project.id}/members`)
        .set(authHeader(owner.accessToken))
        .send({ userId: member.user.id, role: 'MEMBER' });

      const res = await request(app)
        .patch(`/api/v1/projects/${project.id}`)
        .set(authHeader(member.accessToken))
        .send({ name: 'Nope' });
      expect(res.status).toBe(403);
    });

    it('lets the MANAGER delete the project → 204', async () => {
      const owner = await registerUser();
      const team = await createTeam(owner.accessToken);
      const project = await createProject(owner.accessToken, team.id);
      const res = await request(app)
        .delete(`/api/v1/projects/${project.id}`)
        .set(authHeader(owner.accessToken));
      expect(res.status).toBe(204);
    });
  });

  describe('Project members', () => {
    it('lets the MANAGER assign a team member to the project → 201', async () => {
      const owner = await registerUser();
      const member = await registerUser();
      const team = await createTeam(owner.accessToken);
      await addTeamMember(owner.accessToken, team.id, member.user.id);
      const project = await createProject(owner.accessToken, team.id);

      const res = await request(app)
        .post(`/api/v1/projects/${project.id}/members`)
        .set(authHeader(owner.accessToken))
        .send({ userId: member.user.id, role: 'MEMBER' });
      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({ userId: member.user.id });
    });

    it('rejects assigning a non-team-member → 422', async () => {
      const owner = await registerUser();
      const outsider = await registerUser();
      const team = await createTeam(owner.accessToken);
      const project = await createProject(owner.accessToken, team.id);

      const res = await request(app)
        .post(`/api/v1/projects/${project.id}/members`)
        .set(authHeader(owner.accessToken))
        .send({ userId: outsider.user.id });
      expect(res.status).toBe(422);
    });

    it('rejects assigning the same member twice → 409', async () => {
      const owner = await registerUser();
      const member = await registerUser();
      const team = await createTeam(owner.accessToken);
      await addTeamMember(owner.accessToken, team.id, member.user.id);
      const project = await createProject(owner.accessToken, team.id);
      await request(app)
        .post(`/api/v1/projects/${project.id}/members`)
        .set(authHeader(owner.accessToken))
        .send({ userId: member.user.id });

      const res = await request(app)
        .post(`/api/v1/projects/${project.id}/members`)
        .set(authHeader(owner.accessToken))
        .send({ userId: member.user.id });
      expect(res.status).toBe(409);
    });

    it('lets the MANAGER remove a project member → 204', async () => {
      const owner = await registerUser();
      const member = await registerUser();
      const team = await createTeam(owner.accessToken);
      await addTeamMember(owner.accessToken, team.id, member.user.id);
      const project = await createProject(owner.accessToken, team.id);
      await request(app)
        .post(`/api/v1/projects/${project.id}/members`)
        .set(authHeader(owner.accessToken))
        .send({ userId: member.user.id });

      const res = await request(app)
        .delete(`/api/v1/projects/${project.id}/members/${member.user.id}`)
        .set(authHeader(owner.accessToken));
      expect(res.status).toBe(204);
    });

    it('forbids a project MEMBER from assigning members → 403', async () => {
      const owner = await registerUser();
      const member = await registerUser();
      const other = await registerUser();
      const team = await createTeam(owner.accessToken);
      await addTeamMember(owner.accessToken, team.id, member.user.id);
      await addTeamMember(owner.accessToken, team.id, other.user.id);
      const project = await createProject(owner.accessToken, team.id);
      await request(app)
        .post(`/api/v1/projects/${project.id}/members`)
        .set(authHeader(owner.accessToken))
        .send({ userId: member.user.id, role: 'MEMBER' });

      const res = await request(app)
        .post(`/api/v1/projects/${project.id}/members`)
        .set(authHeader(member.accessToken))
        .send({ userId: other.user.id });
      expect(res.status).toBe(403);
    });
  });
});
