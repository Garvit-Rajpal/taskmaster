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

async function setupWithMember() {
  const owner = await registerUser();
  const team = await createTeam(owner.accessToken);
  const project = await createProject(owner.accessToken, team.id);
  const member = await registerUser();
  await addTeamMember(owner.accessToken, team.id, member.user.id);
  await addProjectMember(owner.accessToken, project.id, member.user.id);
  return { owner, team, project, member };
}

describe('Notifications (US-23)', () => {
  it('creates a TASK_ASSIGNED notification when a task is assigned', async () => {
    const { owner, project, member } = await setupWithMember();
    const task = await createTask(owner.accessToken, project.id);

    await request(app)
      .patch(`/api/v1/tasks/${task.id}/assignee`)
      .set(authHeader(owner.accessToken))
      .send({ assignedUserId: member.user.id });

    const res = await request(app)
      .get('/api/v1/notifications')
      .set(authHeader(member.accessToken));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0]).toMatchObject({ type: 'TASK_ASSIGNED' });
    expect(res.body.data[0].payload).toMatchObject({ taskId: task.id });
  });

  it('creates a TASK_ASSIGNED notification when creating a task with an assignee', async () => {
    const { owner, project, member } = await setupWithMember();
    await createTask(owner.accessToken, project.id, { assignedUserId: member.user.id });

    const res = await request(app)
      .get('/api/v1/notifications')
      .set(authHeader(member.accessToken));
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].type).toBe('TASK_ASSIGNED');
  });

  it('does not notify when a user assigns a task to themselves', async () => {
    const { owner, project } = await setupWithMember();
    const task = await createTask(owner.accessToken, project.id);
    await request(app)
      .patch(`/api/v1/tasks/${task.id}/assignee`)
      .set(authHeader(owner.accessToken))
      .send({ assignedUserId: owner.user.id });

    const res = await request(app)
      .get('/api/v1/notifications')
      .set(authHeader(owner.accessToken));
    expect(res.body.data.length).toBe(0);
  });

  it('creates a COMMENT_ADDED notification for the task assignee', async () => {
    const { owner, project, member } = await setupWithMember();
    const task = await createTask(owner.accessToken, project.id, {
      assignedUserId: member.user.id,
    });
    // Clear the assignment notification by reading the list length later; here we
    // just add a comment as the owner and expect the member to be notified.
    await request(app)
      .post(`/api/v1/tasks/${task.id}/comments`)
      .set(authHeader(owner.accessToken))
      .send({ body: 'please review' });

    const res = await request(app)
      .get('/api/v1/notifications')
      .set(authHeader(member.accessToken));
    const types = res.body.data.map((n) => n.type).sort();
    expect(types).toEqual(['COMMENT_ADDED', 'TASK_ASSIGNED']);
  });

  it('lists only the requesting user’s notifications', async () => {
    const { owner, project, member } = await setupWithMember();
    const task = await createTask(owner.accessToken, project.id);
    await request(app)
      .patch(`/api/v1/tasks/${task.id}/assignee`)
      .set(authHeader(owner.accessToken))
      .send({ assignedUserId: member.user.id });

    // Owner has no notifications.
    const ownerRes = await request(app)
      .get('/api/v1/notifications')
      .set(authHeader(owner.accessToken));
    expect(ownerRes.body.data.length).toBe(0);
  });

  it('marks a notification as read → 200 with readAt set', async () => {
    const { owner, project, member } = await setupWithMember();
    const task = await createTask(owner.accessToken, project.id);
    await request(app)
      .patch(`/api/v1/tasks/${task.id}/assignee`)
      .set(authHeader(owner.accessToken))
      .send({ assignedUserId: member.user.id });

    const list = await request(app)
      .get('/api/v1/notifications')
      .set(authHeader(member.accessToken));
    const id = list.body.data[0].id;

    const res = await request(app)
      .patch(`/api/v1/notifications/${id}/read`)
      .set(authHeader(member.accessToken));
    expect(res.status).toBe(200);
    expect(res.body.data.readAt).not.toBeNull();
  });

  it('forbids marking another user’s notification as read → 403', async () => {
    const { owner, project, member } = await setupWithMember();
    const task = await createTask(owner.accessToken, project.id);
    await request(app)
      .patch(`/api/v1/tasks/${task.id}/assignee`)
      .set(authHeader(owner.accessToken))
      .send({ assignedUserId: member.user.id });

    const list = await request(app)
      .get('/api/v1/notifications')
      .set(authHeader(member.accessToken));
    const id = list.body.data[0].id;

    const res = await request(app)
      .patch(`/api/v1/notifications/${id}/read`)
      .set(authHeader(owner.accessToken));
    expect(res.status).toBe(403);
  });

  it('returns 404 for an unknown notification', async () => {
    const u = await registerUser();
    const res = await request(app)
      .patch('/api/v1/notifications/00000000-0000-0000-0000-000000000000/read')
      .set(authHeader(u.accessToken));
    expect(res.status).toBe(404);
  });

  it('requires authentication → 401', async () => {
    const res = await request(app).get('/api/v1/notifications');
    expect(res.status).toBe(401);
  });
});
