'use strict';

const request = require('supertest');
const createApp = require('../../src/app');

describe('GET /health (smoke)', () => {
  it('returns 200 and ok status — proves app + DB harness boot', async () => {
    const res = await request(createApp()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ok');
  });
});
