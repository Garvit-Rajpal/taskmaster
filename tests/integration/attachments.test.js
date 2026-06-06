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

async function addMember(owner, team, project) {
  const member = await registerUser();
  await addTeamMember(owner.accessToken, team.id, member.user.id);
  await addProjectMember(owner.accessToken, project.id, member.user.id);
  return member;
}

describe('Attachments (US-22)', () => {
  it('lets a project member upload a file → 201 with metadata', async () => {
    const { owner, task } = await setup();
    const res = await request(app)
      .post(`/api/v1/tasks/${task.id}/attachments`)
      .set(authHeader(owner.accessToken))
      .attach('file', Buffer.from('hello world'), {
        filename: 'note.txt',
        contentType: 'text/plain',
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      filename: 'note.txt',
      mimeType: 'text/plain',
      taskId: task.id,
      uploadedById: owner.user.id,
    });
    expect(res.body.data.sizeBytes).toBe(Buffer.from('hello world').length);
  });

  it('rejects a disallowed MIME type → 422', async () => {
    const { owner, task } = await setup();
    const res = await request(app)
      .post(`/api/v1/tasks/${task.id}/attachments`)
      .set(authHeader(owner.accessToken))
      .attach('file', Buffer.from('MZ binary'), {
        filename: 'evil.exe',
        contentType: 'application/x-msdownload',
      });
    expect(res.status).toBe(422);
  });

  it('rejects an oversize file → 413', async () => {
    const { owner, task } = await setup();
    const big = Buffer.alloc(9000, 'a'); // cap is 8192 in tests
    const res = await request(app)
      .post(`/api/v1/tasks/${task.id}/attachments`)
      .set(authHeader(owner.accessToken))
      .attach('file', big, { filename: 'big.txt', contentType: 'text/plain' });
    expect(res.status).toBe(413);
  });

  it('rejects a request with no file → 422', async () => {
    const { owner, task } = await setup();
    const res = await request(app)
      .post(`/api/v1/tasks/${task.id}/attachments`)
      .set(authHeader(owner.accessToken));
    expect(res.status).toBe(422);
  });

  it('forbids a non-member from uploading → 403', async () => {
    const { task } = await setup();
    const stranger = await registerUser();
    const res = await request(app)
      .post(`/api/v1/tasks/${task.id}/attachments`)
      .set(authHeader(stranger.accessToken))
      .attach('file', Buffer.from('x'), { filename: 'a.txt', contentType: 'text/plain' });
    expect(res.status).toBe(403);
  });

  it('lists attachment metadata for a member', async () => {
    const { owner, task } = await setup();
    await request(app)
      .post(`/api/v1/tasks/${task.id}/attachments`)
      .set(authHeader(owner.accessToken))
      .attach('file', Buffer.from('one'), { filename: 'one.txt', contentType: 'text/plain' });

    const res = await request(app)
      .get(`/api/v1/tasks/${task.id}/attachments`)
      .set(authHeader(owner.accessToken));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0]).toHaveProperty('storageKey');
  });

  it('downloads the file bytes for a member → 200', async () => {
    const { owner, task } = await setup();
    const up = await request(app)
      .post(`/api/v1/tasks/${task.id}/attachments`)
      .set(authHeader(owner.accessToken))
      .attach('file', Buffer.from('downloadable'), {
        filename: 'd.txt',
        contentType: 'text/plain',
      });

    const res = await request(app)
      .get(`/api/v1/attachments/${up.body.data.id}/download`)
      .set(authHeader(owner.accessToken));
    expect(res.status).toBe(200);
    expect(res.text).toBe('downloadable');
  });

  it('forbids a non-member from downloading → 403', async () => {
    const { owner, task } = await setup();
    const stranger = await registerUser();
    const up = await request(app)
      .post(`/api/v1/tasks/${task.id}/attachments`)
      .set(authHeader(owner.accessToken))
      .attach('file', Buffer.from('secret'), { filename: 's.txt', contentType: 'text/plain' });

    const res = await request(app)
      .get(`/api/v1/attachments/${up.body.data.id}/download`)
      .set(authHeader(stranger.accessToken));
    expect(res.status).toBe(403);
  });

  it('lets the uploader delete the attachment → 204', async () => {
    const { owner, task } = await setup();
    const up = await request(app)
      .post(`/api/v1/tasks/${task.id}/attachments`)
      .set(authHeader(owner.accessToken))
      .attach('file', Buffer.from('temp'), { filename: 't.txt', contentType: 'text/plain' });

    const res = await request(app)
      .delete(`/api/v1/attachments/${up.body.data.id}`)
      .set(authHeader(owner.accessToken));
    expect(res.status).toBe(204);

    // Download now 404.
    const after = await request(app)
      .get(`/api/v1/attachments/${up.body.data.id}/download`)
      .set(authHeader(owner.accessToken));
    expect(after.status).toBe(404);
  });

  it('forbids an ordinary member from deleting another user’s attachment → 403', async () => {
    const { owner, team, project, task } = await setup();
    const member = await addMember(owner, team, project);
    const up = await request(app)
      .post(`/api/v1/tasks/${task.id}/attachments`)
      .set(authHeader(owner.accessToken))
      .attach('file', Buffer.from('ownersfile'), {
        filename: 'o.txt',
        contentType: 'text/plain',
      });

    const res = await request(app)
      .delete(`/api/v1/attachments/${up.body.data.id}`)
      .set(authHeader(member.accessToken));
    expect(res.status).toBe(403);
  });

  it('lets a MANAGER delete another user’s attachment → 204', async () => {
    const { owner, team, project, task } = await setup();
    const member = await addMember(owner, team, project);
    const up = await request(app)
      .post(`/api/v1/tasks/${task.id}/attachments`)
      .set(authHeader(member.accessToken))
      .attach('file', Buffer.from('membersfile'), {
        filename: 'm.txt',
        contentType: 'text/plain',
      });

    const res = await request(app)
      .delete(`/api/v1/attachments/${up.body.data.id}`)
      .set(authHeader(owner.accessToken));
    expect(res.status).toBe(204);
  });
});
