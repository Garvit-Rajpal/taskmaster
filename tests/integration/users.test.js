'use strict';

const { app, request, registerUser, authHeader } = require('../helpers/factory');

describe('User Profile (US-5..7)', () => {
  describe('GET /api/v1/users/me', () => {
    it('returns the authenticated user profile without the password', async () => {
      const u = await registerUser({ name: 'Ada Lovelace' });
      const res = await request(app)
        .get('/api/v1/users/me')
        .set(authHeader(u.accessToken));

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        id: u.user.id,
        email: u.email,
        name: 'Ada Lovelace',
      });
      expect(res.body.data).toHaveProperty('avatarUrl');
      expect(res.body.data).toHaveProperty('createdAt');
      expect(res.body.data).not.toHaveProperty('password');
    });

    it('rejects an unauthenticated request → 401', async () => {
      const res = await request(app).get('/api/v1/users/me');
      expect(res.status).toBe(401);
    });

    it('rejects a malformed bearer token → 401', async () => {
      const res = await request(app)
        .get('/api/v1/users/me')
        .set({ Authorization: 'Bearer not-a-real-token' });
      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /api/v1/users/me', () => {
    it('updates name and avatarUrl → 200 with new values', async () => {
      const u = await registerUser();
      const res = await request(app)
        .patch('/api/v1/users/me')
        .set(authHeader(u.accessToken))
        .send({ name: 'New Name', avatarUrl: 'https://cdn.example.com/a.png' });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        name: 'New Name',
        avatarUrl: 'https://cdn.example.com/a.png',
      });
      expect(res.body.data).not.toHaveProperty('password');
    });

    it('rejects an invalid avatarUrl → 422', async () => {
      const u = await registerUser();
      const res = await request(app)
        .patch('/api/v1/users/me')
        .set(authHeader(u.accessToken))
        .send({ avatarUrl: 'not-a-url' });
      expect(res.status).toBe(422);
    });

    it('rejects an empty name → 422', async () => {
      const u = await registerUser();
      const res = await request(app)
        .patch('/api/v1/users/me')
        .set(authHeader(u.accessToken))
        .send({ name: '' });
      expect(res.status).toBe(422);
    });

    it('requires authentication → 401', async () => {
      const res = await request(app).patch('/api/v1/users/me').send({ name: 'X' });
      expect(res.status).toBe(401);
    });

    it('changes the password with the correct current password, then old login fails and new works', async () => {
      const u = await registerUser();
      const newPassword = 'N3w!Strongpass';

      const res = await request(app)
        .patch('/api/v1/users/me')
        .set(authHeader(u.accessToken))
        .send({ currentPassword: u.password, newPassword });
      expect(res.status).toBe(200);

      // Old password no longer works.
      const oldLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: u.email, password: u.password });
      expect(oldLogin.status).toBe(401);

      // New password works.
      const newLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: u.email, password: newPassword });
      expect(newLogin.status).toBe(200);
    });

    it('revokes all refresh tokens on password change (existing refresh token invalidated)', async () => {
      const u = await registerUser();
      const res = await request(app)
        .patch('/api/v1/users/me')
        .set(authHeader(u.accessToken))
        .send({ currentPassword: u.password, newPassword: 'An0ther!pass' });
      expect(res.status).toBe(200);

      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: u.refreshToken });
      expect(refreshRes.status).toBe(401);
    });

    it('rejects a password change with the wrong current password → 401', async () => {
      const u = await registerUser();
      const res = await request(app)
        .patch('/api/v1/users/me')
        .set(authHeader(u.accessToken))
        .send({ currentPassword: 'Wr0ng!pass', newPassword: 'An0ther!pass' });
      expect(res.status).toBe(401);
    });

    it('rejects a weak new password → 422', async () => {
      const u = await registerUser();
      const res = await request(app)
        .patch('/api/v1/users/me')
        .set(authHeader(u.accessToken))
        .send({ currentPassword: u.password, newPassword: 'weak' });
      expect(res.status).toBe(422);
    });

    it('rejects newPassword without currentPassword → 422', async () => {
      const u = await registerUser();
      const res = await request(app)
        .patch('/api/v1/users/me')
        .set(authHeader(u.accessToken))
        .send({ newPassword: 'An0ther!pass' });
      expect(res.status).toBe(422);
    });
  });

  describe('GET /api/v1/users/:id', () => {
    it('returns a limited public profile for an existing user', async () => {
      const target = await registerUser({ name: 'Grace Hopper' });
      const viewer = await registerUser();

      const res = await request(app)
        .get(`/api/v1/users/${target.user.id}`)
        .set(authHeader(viewer.accessToken));

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ id: target.user.id, name: 'Grace Hopper' });
      // Limited fields: no email, no password.
      expect(res.body.data).not.toHaveProperty('email');
      expect(res.body.data).not.toHaveProperty('password');
    });

    it('returns 404 for an unknown user id', async () => {
      const viewer = await registerUser();
      const res = await request(app)
        .get('/api/v1/users/00000000-0000-0000-0000-000000000000')
        .set(authHeader(viewer.accessToken));
      expect(res.status).toBe(404);
    });

    it('returns 422 for a non-uuid id', async () => {
      const viewer = await registerUser();
      const res = await request(app)
        .get('/api/v1/users/not-a-uuid')
        .set(authHeader(viewer.accessToken));
      expect(res.status).toBe(422);
    });

    it('requires authentication → 401', async () => {
      const res = await request(app).get('/api/v1/users/00000000-0000-0000-0000-000000000000');
      expect(res.status).toBe(401);
    });
  });
});
