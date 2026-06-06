'use strict';

const { app, request, registerUser, authHeader, createTeam } = require('../helpers/factory');

describe('Teams (US-8..12)', () => {
  describe('POST /api/v1/teams', () => {
    it('creates a team and makes the creator an OWNER → 201', async () => {
      const u = await registerUser();
      const res = await request(app)
        .post('/api/v1/teams')
        .set(authHeader(u.accessToken))
        .send({ name: 'Engineering', description: 'Core team' });

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({ name: 'Engineering', ownerId: u.user.id });
      expect(res.body.data).toHaveProperty('id');
    });

    it('rejects an empty name → 422', async () => {
      const u = await registerUser();
      const res = await request(app)
        .post('/api/v1/teams')
        .set(authHeader(u.accessToken))
        .send({ name: '' });
      expect(res.status).toBe(422);
    });

    it('requires authentication → 401', async () => {
      const res = await request(app).post('/api/v1/teams').send({ name: 'X' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/teams', () => {
    it('lists only the teams the user belongs to', async () => {
      const owner = await registerUser();
      const other = await registerUser();
      await createTeam(owner.accessToken, { name: 'Mine A' });
      await createTeam(owner.accessToken, { name: 'Mine B' });
      await createTeam(other.accessToken, { name: 'Not Mine' });

      const res = await request(app)
        .get('/api/v1/teams')
        .set(authHeader(owner.accessToken));

      expect(res.status).toBe(200);
      const names = res.body.data.map((t) => t.name).sort();
      expect(names).toEqual(['Mine A', 'Mine B']);
    });
  });

  describe('GET /api/v1/teams/:id', () => {
    it('returns team detail with members for a member', async () => {
      const owner = await registerUser();
      const team = await createTeam(owner.accessToken);
      const res = await request(app)
        .get(`/api/v1/teams/${team.id}`)
        .set(authHeader(owner.accessToken));

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ id: team.id });
      expect(Array.isArray(res.body.data.members)).toBe(true);
      expect(res.body.data.members.length).toBe(1);
    });

    it('forbids a non-member from viewing → 403', async () => {
      const owner = await registerUser();
      const stranger = await registerUser();
      const team = await createTeam(owner.accessToken);
      const res = await request(app)
        .get(`/api/v1/teams/${team.id}`)
        .set(authHeader(stranger.accessToken));
      expect(res.status).toBe(403);
    });

    it('returns 404 for an unknown team', async () => {
      const u = await registerUser();
      const res = await request(app)
        .get('/api/v1/teams/00000000-0000-0000-0000-000000000000')
        .set(authHeader(u.accessToken));
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/teams/:id', () => {
    it('lets the owner update the team → 200', async () => {
      const owner = await registerUser();
      const team = await createTeam(owner.accessToken);
      const res = await request(app)
        .patch(`/api/v1/teams/${team.id}`)
        .set(authHeader(owner.accessToken))
        .send({ name: 'Renamed' });
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Renamed');
    });

    it('forbids a plain MEMBER from updating → 403', async () => {
      const owner = await registerUser();
      const member = await registerUser();
      const team = await createTeam(owner.accessToken);
      // add member as MEMBER
      await request(app)
        .post(`/api/v1/teams/${team.id}/members`)
        .set(authHeader(owner.accessToken))
        .send({ userId: member.user.id, role: 'MEMBER' });

      const res = await request(app)
        .patch(`/api/v1/teams/${team.id}`)
        .set(authHeader(member.accessToken))
        .send({ name: 'Hacked' });
      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/v1/teams/:id', () => {
    it('lets the owner delete the team → 204', async () => {
      const owner = await registerUser();
      const team = await createTeam(owner.accessToken);
      const res = await request(app)
        .delete(`/api/v1/teams/${team.id}`)
        .set(authHeader(owner.accessToken));
      expect(res.status).toBe(204);

      const after = await request(app)
        .get(`/api/v1/teams/${team.id}`)
        .set(authHeader(owner.accessToken));
      expect(after.status).toBe(404);
    });

    it('forbids a non-owner ADMIN from deleting → 403', async () => {
      const owner = await registerUser();
      const admin = await registerUser();
      const team = await createTeam(owner.accessToken);
      await request(app)
        .post(`/api/v1/teams/${team.id}/members`)
        .set(authHeader(owner.accessToken))
        .send({ userId: admin.user.id, role: 'ADMIN' });

      const res = await request(app)
        .delete(`/api/v1/teams/${team.id}`)
        .set(authHeader(admin.accessToken));
      expect(res.status).toBe(403);
    });
  });

  describe('Team members', () => {
    it('lets an admin add an existing user → 201', async () => {
      const owner = await registerUser();
      const newcomer = await registerUser();
      const team = await createTeam(owner.accessToken);
      const res = await request(app)
        .post(`/api/v1/teams/${team.id}/members`)
        .set(authHeader(owner.accessToken))
        .send({ userId: newcomer.user.id, role: 'MEMBER' });
      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({ userId: newcomer.user.id, role: 'MEMBER' });
    });

    it('rejects adding the same member twice → 409 ALREADY_MEMBER', async () => {
      const owner = await registerUser();
      const newcomer = await registerUser();
      const team = await createTeam(owner.accessToken);
      await request(app)
        .post(`/api/v1/teams/${team.id}/members`)
        .set(authHeader(owner.accessToken))
        .send({ userId: newcomer.user.id });
      const res = await request(app)
        .post(`/api/v1/teams/${team.id}/members`)
        .set(authHeader(owner.accessToken))
        .send({ userId: newcomer.user.id });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ALREADY_MEMBER');
    });

    it('returns 404 when adding a non-existent user', async () => {
      const owner = await registerUser();
      const team = await createTeam(owner.accessToken);
      const res = await request(app)
        .post(`/api/v1/teams/${team.id}/members`)
        .set(authHeader(owner.accessToken))
        .send({ userId: '00000000-0000-0000-0000-000000000000' });
      expect(res.status).toBe(404);
    });

    it('forbids a plain member from adding members → 403', async () => {
      const owner = await registerUser();
      const member = await registerUser();
      const target = await registerUser();
      const team = await createTeam(owner.accessToken);
      await request(app)
        .post(`/api/v1/teams/${team.id}/members`)
        .set(authHeader(owner.accessToken))
        .send({ userId: member.user.id, role: 'MEMBER' });

      const res = await request(app)
        .post(`/api/v1/teams/${team.id}/members`)
        .set(authHeader(member.accessToken))
        .send({ userId: target.user.id });
      expect(res.status).toBe(403);
    });

    it('lets an admin remove a member → 204', async () => {
      const owner = await registerUser();
      const member = await registerUser();
      const team = await createTeam(owner.accessToken);
      await request(app)
        .post(`/api/v1/teams/${team.id}/members`)
        .set(authHeader(owner.accessToken))
        .send({ userId: member.user.id });

      const res = await request(app)
        .delete(`/api/v1/teams/${team.id}/members/${member.user.id}`)
        .set(authHeader(owner.accessToken));
      expect(res.status).toBe(204);
    });

    it('forbids removing the owner → 403', async () => {
      const owner = await registerUser();
      const admin = await registerUser();
      const team = await createTeam(owner.accessToken);
      await request(app)
        .post(`/api/v1/teams/${team.id}/members`)
        .set(authHeader(owner.accessToken))
        .send({ userId: admin.user.id, role: 'ADMIN' });

      const res = await request(app)
        .delete(`/api/v1/teams/${team.id}/members/${owner.user.id}`)
        .set(authHeader(admin.accessToken));
      expect(res.status).toBe(403);
    });
  });

  describe('Invitations', () => {
    it('lets an admin invite by email → 201 with a token and expiry', async () => {
      const owner = await registerUser();
      const team = await createTeam(owner.accessToken);
      const res = await request(app)
        .post(`/api/v1/teams/${team.id}/invitations`)
        .set(authHeader(owner.accessToken))
        .send({ email: 'invitee@example.com', role: 'MEMBER' });
      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data).toHaveProperty('expiresAt');
      expect(res.body.data.status).toBe('PENDING');
    });

    it('lets the invited user accept and join the team', async () => {
      const owner = await registerUser();
      const invitee = await registerUser();
      const team = await createTeam(owner.accessToken);
      const invite = await request(app)
        .post(`/api/v1/teams/${team.id}/invitations`)
        .set(authHeader(owner.accessToken))
        .send({ email: invitee.email, role: 'MEMBER' });

      const accept = await request(app)
        .post(`/api/v1/invitations/${invite.body.data.token}/accept`)
        .set(authHeader(invitee.accessToken));
      expect(accept.status).toBe(200);

      // Now the invitee can view the team.
      const view = await request(app)
        .get(`/api/v1/teams/${team.id}`)
        .set(authHeader(invitee.accessToken));
      expect(view.status).toBe(200);
    });

    it('rejects accepting when the email does not match the invite → 403', async () => {
      const owner = await registerUser();
      const wrongUser = await registerUser();
      const team = await createTeam(owner.accessToken);
      const invite = await request(app)
        .post(`/api/v1/teams/${team.id}/invitations`)
        .set(authHeader(owner.accessToken))
        .send({ email: 'someone-else@example.com', role: 'MEMBER' });

      const accept = await request(app)
        .post(`/api/v1/invitations/${invite.body.data.token}/accept`)
        .set(authHeader(wrongUser.accessToken));
      expect(accept.status).toBe(403);
    });

    it('rejects accepting the same invite twice → 409', async () => {
      const owner = await registerUser();
      const invitee = await registerUser();
      const team = await createTeam(owner.accessToken);
      const invite = await request(app)
        .post(`/api/v1/teams/${team.id}/invitations`)
        .set(authHeader(owner.accessToken))
        .send({ email: invitee.email, role: 'MEMBER' });

      await request(app)
        .post(`/api/v1/invitations/${invite.body.data.token}/accept`)
        .set(authHeader(invitee.accessToken));
      const again = await request(app)
        .post(`/api/v1/invitations/${invite.body.data.token}/accept`)
        .set(authHeader(invitee.accessToken));
      expect(again.status).toBe(409);
    });

    it('rejects inviting an existing member → 409', async () => {
      const owner = await registerUser();
      const member = await registerUser();
      const team = await createTeam(owner.accessToken);
      await request(app)
        .post(`/api/v1/teams/${team.id}/members`)
        .set(authHeader(owner.accessToken))
        .send({ userId: member.user.id });

      const res = await request(app)
        .post(`/api/v1/teams/${team.id}/invitations`)
        .set(authHeader(owner.accessToken))
        .send({ email: member.email, role: 'MEMBER' });
      expect(res.status).toBe(409);
    });

    it('returns 404 for an unknown invitation token', async () => {
      const u = await registerUser();
      const res = await request(app)
        .post('/api/v1/invitations/nonexistent-token/accept')
        .set(authHeader(u.accessToken));
      expect(res.status).toBe(404);
    });
  });
});
