'use strict';

const { app, request, uniqueEmail } = require('../helpers/factory');
const prisma = require('../../src/lib/prisma');

const base = '/api/v1/auth';
const strongPw = 'Str0ng!pass';

describe('Auth — register', () => {
  it('registers a user → 201 with tokens, password not returned', async () => {
    const email = uniqueEmail();
    const res = await request(app)
      .post(`${base}/register`)
      .send({ email, password: strongPw, name: 'Ada' });

    expect(res.status).toBe(201);
    expect(res.body.data.user).toMatchObject({ email, name: 'Ada' });
    expect(res.body.data.user.password).toBeUndefined();
    expect(typeof res.body.data.accessToken).toBe('string');
    expect(typeof res.body.data.refreshToken).toBe('string');
  });

  it('stores the password as a bcrypt hash, not plaintext', async () => {
    const email = uniqueEmail();
    await request(app).post(`${base}/register`).send({ email, password: strongPw, name: 'Ada' });
    const row = await prisma.user.findUnique({ where: { email } });
    expect(row.password).not.toBe(strongPw);
    expect(row.password.startsWith('$2')).toBe(true);
  });

  it('rejects duplicate email → 409 EMAIL_TAKEN', async () => {
    const email = uniqueEmail();
    await request(app).post(`${base}/register`).send({ email, password: strongPw, name: 'A' });
    const res = await request(app)
      .post(`${base}/register`)
      .send({ email, password: strongPw, name: 'B' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('rejects a weak password → 422 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post(`${base}/register`)
      .send({ email: uniqueEmail(), password: 'weak', name: 'A' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects an invalid email → 422', async () => {
    const res = await request(app)
      .post(`${base}/register`)
      .send({ email: 'not-an-email', password: strongPw, name: 'A' });
    expect(res.status).toBe(422);
  });
});

describe('Auth — login', () => {
  it('logs in with valid credentials → 200 + tokens', async () => {
    const email = uniqueEmail();
    await request(app).post(`${base}/register`).send({ email, password: strongPw, name: 'A' });
    const res = await request(app).post(`${base}/login`).send({ email, password: strongPw });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
  });

  it('rejects a wrong password → 401 INVALID_CREDENTIALS', async () => {
    const email = uniqueEmail();
    await request(app).post(`${base}/register`).send({ email, password: strongPw, name: 'A' });
    const res = await request(app).post(`${base}/login`).send({ email, password: 'Wr0ng!pass' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('uses a generic error for unknown email (no enumeration) → 401', async () => {
    const res = await request(app)
      .post(`${base}/login`)
      .send({ email: uniqueEmail(), password: strongPw });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });
});

describe('Auth — refresh (rotation + reuse detection)', () => {
  it('rotates: returns new tokens and revokes the old refresh token', async () => {
    const email = uniqueEmail();
    const reg = await request(app)
      .post(`${base}/register`)
      .send({ email, password: strongPw, name: 'A' });
    const oldRefresh = reg.body.data.refreshToken;

    const res = await request(app).post(`${base}/refresh`).send({ refreshToken: oldRefresh });
    expect(res.status).toBe(200);
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.refreshToken).not.toBe(oldRefresh);

    // Old token can no longer be refreshed.
    const reuse = await request(app).post(`${base}/refresh`).send({ refreshToken: oldRefresh });
    expect(reuse.status).toBe(401);
  });

  it('detects reuse of a rotated token and revokes the whole chain', async () => {
    const email = uniqueEmail();
    const reg = await request(app)
      .post(`${base}/register`)
      .send({ email, password: strongPw, name: 'A' });
    const t1 = reg.body.data.refreshToken;
    const r1 = await request(app).post(`${base}/refresh`).send({ refreshToken: t1 });
    const t2 = r1.body.data.refreshToken; // valid, current

    // Reuse t1 (already rotated) → should revoke chain, including t2.
    await request(app).post(`${base}/refresh`).send({ refreshToken: t1 });
    const afterReuse = await request(app).post(`${base}/refresh`).send({ refreshToken: t2 });
    expect(afterReuse.status).toBe(401);
  });

  it('rejects an unknown refresh token → 401', async () => {
    const res = await request(app).post(`${base}/refresh`).send({ refreshToken: 'nope' });
    expect(res.status).toBe(401);
  });
});

describe('Auth — logout', () => {
  it('revokes the presented refresh token; later refresh fails → 401', async () => {
    const email = uniqueEmail();
    const reg = await request(app)
      .post(`${base}/register`)
      .send({ email, password: strongPw, name: 'A' });
    const refreshToken = reg.body.data.refreshToken;

    const out = await request(app).post(`${base}/logout`).send({ refreshToken });
    expect(out.status).toBe(204);

    const res = await request(app).post(`${base}/refresh`).send({ refreshToken });
    expect(res.status).toBe(401);
  });
});
