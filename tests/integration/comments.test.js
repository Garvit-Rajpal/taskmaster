'use strict';

const {
  app,
  request,
  registerUser,
  authHeader,
  createTeam,
  addTeamMember,
  createProject,
  addProjectMember,
  createTask,
} = require('../helpers/factory');

async function setup() {
  const owner = await registerUser();
  const team = await createTeam(owner.accessToken);
  const project = await createProject(owner.accessToken, team.id);
  const task = await createTask(owner.accessToken, project.id);
  return { owner, team, project, task };
}

/** Add a second user who is a project member. */
async function addMember(owner, team, project) {
  const member = await registerUser();
  await addTeamMember(owner.accessToken, team.id, member.user.id);
  await addProjectMember(owner.accessToken, project.id, member.user.id);
  return member;
}

describe('Comments (US-21)', () => {
  it('lets a project member add a comment → 201', async () => {
    const { owner, task } = await setup();
    const res = await request(app)
      .post(`/api/v1/tasks/${task.id}/comments`)
      .set(authHeader(owner.accessToken))
      .send({ body: 'Looks good to me' });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ body: 'Looks good to me', authorId: owner.user.id });
  });

  it('rejects an empty comment body → 422', async () => {
    const { owner, task } = await setup();
    const res = await request(app)
      .post(`/api/v1/tasks/${task.id}/comments`)
      .set(authHeader(owner.accessToken))
      .send({ body: '' });
    expect(res.status).toBe(422);
  });

  it('forbids a non-member from commenting → 403', async () => {
    const { task } = await setup();
    const stranger = await registerUser();
    const res = await request(app)
      .post(`/api/v1/tasks/${task.id}/comments`)
      .set(authHeader(stranger.accessToken))
      .send({ body: 'hi' });
    expect(res.status).toBe(403);
  });

  it('lists comments newest-first', async () => {
    const { owner, task } = await setup();
    await request(app)
      .post(`/api/v1/tasks/${task.id}/comments`)
      .set(authHeader(owner.accessToken))
      .send({ body: 'first' });
    await request(app)
      .post(`/api/v1/tasks/${task.id}/comments`)
      .set(authHeader(owner.accessToken))
      .send({ body: 'second' });

    const res = await request(app)
      .get(`/api/v1/tasks/${task.id}/comments`)
      .set(authHeader(owner.accessToken));
    expect(res.status).toBe(200);
    expect(res.body.data.map((c) => c.body)).toEqual(['second', 'first']);
    expect(res.body.meta.total).toBe(2);
  });

  it('lets the author edit their own comment → 200', async () => {
    const { owner, task } = await setup();
    const created = await request(app)
      .post(`/api/v1/tasks/${task.id}/comments`)
      .set(authHeader(owner.accessToken))
      .send({ body: 'typo here' });
    const res = await request(app)
      .patch(`/api/v1/comments/${created.body.data.id}`)
      .set(authHeader(owner.accessToken))
      .send({ body: 'fixed' });
    expect(res.status).toBe(200);
    expect(res.body.data.body).toBe('fixed');
  });

  it('forbids a non-author from editing a comment → 403', async () => {
    const { owner, team, project, task } = await setup();
    const member = await addMember(owner, team, project);
    const created = await request(app)
      .post(`/api/v1/tasks/${task.id}/comments`)
      .set(authHeader(owner.accessToken))
      .send({ body: 'owner comment' });

    const res = await request(app)
      .patch(`/api/v1/comments/${created.body.data.id}`)
      .set(authHeader(member.accessToken))
      .send({ body: 'hijack' });
    expect(res.status).toBe(403);
  });

  it('lets the author delete their own comment → 204', async () => {
    const { owner, task } = await setup();
    const created = await request(app)
      .post(`/api/v1/tasks/${task.id}/comments`)
      .set(authHeader(owner.accessToken))
      .send({ body: 'delete me' });
    const res = await request(app)
      .delete(`/api/v1/comments/${created.body.data.id}`)
      .set(authHeader(owner.accessToken));
    expect(res.status).toBe(204);
  });

  it('lets a MANAGER delete another user’s comment → 204', async () => {
    const { owner, team, project, task } = await setup();
    const member = await addMember(owner, team, project);
    const created = await request(app)
      .post(`/api/v1/tasks/${task.id}/comments`)
      .set(authHeader(member.accessToken))
      .send({ body: 'member comment' });

    // owner is the project MANAGER (creator).
    const res = await request(app)
      .delete(`/api/v1/comments/${created.body.data.id}`)
      .set(authHeader(owner.accessToken));
    expect(res.status).toBe(204);
  });

  it('forbids an ordinary member from deleting another user’s comment → 403', async () => {
    const { owner, team, project, task } = await setup();
    const member = await addMember(owner, team, project);
    const created = await request(app)
      .post(`/api/v1/tasks/${task.id}/comments`)
      .set(authHeader(owner.accessToken))
      .send({ body: 'owner comment' });

    const res = await request(app)
      .delete(`/api/v1/comments/${created.body.data.id}`)
      .set(authHeader(member.accessToken));
    expect(res.status).toBe(403);
  });

  it('returns 404 when commenting on an unknown task', async () => {
    const u = await registerUser();
    const res = await request(app)
      .post('/api/v1/tasks/00000000-0000-0000-0000-000000000000/comments')
      .set(authHeader(u.accessToken))
      .send({ body: 'hi' });
    expect(res.status).toBe(404);
  });
});
