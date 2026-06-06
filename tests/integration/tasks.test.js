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

/** Build an owner + team + project, returning all the handles. */
async function setupProject() {
  const owner = await registerUser();
  const team = await createTeam(owner.accessToken);
  const project = await createProject(owner.accessToken, team.id);
  return { owner, team, project };
}

describe('Tasks CRUD (US-16, US-17)', () => {
  describe('POST /api/v1/projects/:projectId/tasks', () => {
    it('lets a project member create a task with defaults → 201', async () => {
      const { owner, project } = await setupProject();
      const res = await request(app)
        .post(`/api/v1/projects/${project.id}/tasks`)
        .set(authHeader(owner.accessToken))
        .send({ title: 'Write tests' });

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({
        title: 'Write tests',
        status: 'TODO',
        priority: 'MEDIUM',
        createdById: owner.user.id,
        projectId: project.id,
      });
    });

    it('forbids a non-project-member from creating → 403', async () => {
      const { project } = await setupProject();
      const stranger = await registerUser();
      const res = await request(app)
        .post(`/api/v1/projects/${project.id}/tasks`)
        .set(authHeader(stranger.accessToken))
        .send({ title: 'Nope' });
      expect(res.status).toBe(403);
    });

    it('rejects an empty title → 422', async () => {
      const { owner, project } = await setupProject();
      const res = await request(app)
        .post(`/api/v1/projects/${project.id}/tasks`)
        .set(authHeader(owner.accessToken))
        .send({ title: '' });
      expect(res.status).toBe(422);
    });

    it('rejects an assignee who is not a project member → 422', async () => {
      const { owner, team, project } = await setupProject();
      const outsider = await registerUser();
      await addTeamMember(owner.accessToken, team.id, outsider.user.id);
      // outsider is on the team but NOT the project.
      const res = await request(app)
        .post(`/api/v1/projects/${project.id}/tasks`)
        .set(authHeader(owner.accessToken))
        .send({ title: 'Assigned', assignedUserId: outsider.user.id });
      expect(res.status).toBe(422);
    });

    it('accepts an assignee who is a project member → 201', async () => {
      const { owner, team, project } = await setupProject();
      const member = await registerUser();
      await addTeamMember(owner.accessToken, team.id, member.user.id);
      await addProjectMember(owner.accessToken, project.id, member.user.id);
      const res = await request(app)
        .post(`/api/v1/projects/${project.id}/tasks`)
        .set(authHeader(owner.accessToken))
        .send({ title: 'Assigned', assignedUserId: member.user.id, priority: 'HIGH' });
      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({ assignedUserId: member.user.id, priority: 'HIGH' });
    });
  });

  describe('GET /api/v1/tasks/:id', () => {
    it('returns task detail with comments and attachments arrays', async () => {
      const { owner, project } = await setupProject();
      const task = await createTask(owner.accessToken, project.id);
      const res = await request(app)
        .get(`/api/v1/tasks/${task.id}`)
        .set(authHeader(owner.accessToken));
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ id: task.id });
      expect(Array.isArray(res.body.data.comments)).toBe(true);
      expect(Array.isArray(res.body.data.attachments)).toBe(true);
    });

    it('returns 404 for an unknown task', async () => {
      const u = await registerUser();
      const res = await request(app)
        .get('/api/v1/tasks/00000000-0000-0000-0000-000000000000')
        .set(authHeader(u.accessToken));
      expect(res.status).toBe(404);
    });

    it('forbids a non-member from viewing → 403', async () => {
      const { owner, project } = await setupProject();
      const stranger = await registerUser();
      const task = await createTask(owner.accessToken, project.id);
      const res = await request(app)
        .get(`/api/v1/tasks/${task.id}`)
        .set(authHeader(stranger.accessToken));
      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/v1/tasks/:id', () => {
    it('updates fields and bumps updatedAt → 200', async () => {
      const { owner, project } = await setupProject();
      const task = await createTask(owner.accessToken, project.id);
      const res = await request(app)
        .patch(`/api/v1/tasks/${task.id}`)
        .set(authHeader(owner.accessToken))
        .send({ title: 'Updated title', description: 'now with detail' });
      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Updated title');
      expect(new Date(res.body.data.updatedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(task.updatedAt).getTime()
      );
    });

    it('forbids a non-member from updating → 403', async () => {
      const { owner, project } = await setupProject();
      const stranger = await registerUser();
      const task = await createTask(owner.accessToken, project.id);
      const res = await request(app)
        .patch(`/api/v1/tasks/${task.id}`)
        .set(authHeader(stranger.accessToken))
        .send({ title: 'x' });
      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/v1/tasks/:id', () => {
    it('lets the creator delete the task → 204', async () => {
      const { owner, project } = await setupProject();
      const task = await createTask(owner.accessToken, project.id);
      const res = await request(app)
        .delete(`/api/v1/tasks/${task.id}`)
        .set(authHeader(owner.accessToken));
      expect(res.status).toBe(204);
    });

    it('forbids an ordinary member (non-creator, non-manager) from deleting → 403', async () => {
      const { owner, team, project } = await setupProject();
      const member = await registerUser();
      await addTeamMember(owner.accessToken, team.id, member.user.id);
      await addProjectMember(owner.accessToken, project.id, member.user.id);
      const task = await createTask(owner.accessToken, project.id);

      const res = await request(app)
        .delete(`/api/v1/tasks/${task.id}`)
        .set(authHeader(member.accessToken));
      expect(res.status).toBe(403);
    });
  });
});

describe('Assignment, Status, Filter/Search/Sort (US-18..20)', () => {
  describe('PATCH /api/v1/tasks/:id/status', () => {
    it('changes the status to a valid value → 200', async () => {
      const { owner, project } = await setupProject();
      const task = await createTask(owner.accessToken, project.id);
      const res = await request(app)
        .patch(`/api/v1/tasks/${task.id}/status`)
        .set(authHeader(owner.accessToken))
        .send({ status: 'IN_PROGRESS' });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('IN_PROGRESS');
    });

    it('rejects an invalid status → 422', async () => {
      const { owner, project } = await setupProject();
      const task = await createTask(owner.accessToken, project.id);
      const res = await request(app)
        .patch(`/api/v1/tasks/${task.id}/status`)
        .set(authHeader(owner.accessToken))
        .send({ status: 'NOPE' });
      expect(res.status).toBe(422);
    });

    it('forbids a non-member from changing status → 403', async () => {
      const { owner, project } = await setupProject();
      const stranger = await registerUser();
      const task = await createTask(owner.accessToken, project.id);
      const res = await request(app)
        .patch(`/api/v1/tasks/${task.id}/status`)
        .set(authHeader(stranger.accessToken))
        .send({ status: 'DONE' });
      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/v1/tasks/:id/assignee', () => {
    it('assigns a project member then clears the assignee', async () => {
      const { owner, team, project } = await setupProject();
      const member = await registerUser();
      await addTeamMember(owner.accessToken, team.id, member.user.id);
      await addProjectMember(owner.accessToken, project.id, member.user.id);
      const task = await createTask(owner.accessToken, project.id);

      const assign = await request(app)
        .patch(`/api/v1/tasks/${task.id}/assignee`)
        .set(authHeader(owner.accessToken))
        .send({ assignedUserId: member.user.id });
      expect(assign.status).toBe(200);
      expect(assign.body.data.assignedUserId).toBe(member.user.id);

      const clear = await request(app)
        .patch(`/api/v1/tasks/${task.id}/assignee`)
        .set(authHeader(owner.accessToken))
        .send({ assignedUserId: null });
      expect(clear.status).toBe(200);
      expect(clear.body.data.assignedUserId).toBeNull();
    });

    it('rejects assigning a non-project-member → 422', async () => {
      const { owner, project } = await setupProject();
      const outsider = await registerUser();
      const task = await createTask(owner.accessToken, project.id);
      const res = await request(app)
        .patch(`/api/v1/tasks/${task.id}/assignee`)
        .set(authHeader(owner.accessToken))
        .send({ assignedUserId: outsider.user.id });
      expect(res.status).toBe(422);
    });
  });

  describe('GET /api/v1/projects/:projectId/tasks (filter/search/sort)', () => {
    async function seed() {
      const { owner, project } = await setupProject();
      await createTask(owner.accessToken, project.id, {
        title: 'Fix login bug',
        priority: 'HIGH',
        dueDate: '2026-07-01T00:00:00.000Z',
      });
      await createTask(owner.accessToken, project.id, {
        title: 'Write docs',
        priority: 'LOW',
        dueDate: '2026-08-01T00:00:00.000Z',
      });
      const t3 = await createTask(owner.accessToken, project.id, { title: 'Deploy release' });
      await request(app)
        .patch(`/api/v1/tasks/${t3.id}/status`)
        .set(authHeader(owner.accessToken))
        .send({ status: 'DONE' });
      return { owner, project };
    }

    it('filters by status CSV', async () => {
      const { owner, project } = await seed();
      const res = await request(app)
        .get(`/api/v1/projects/${project.id}/tasks?status=DONE`)
        .set(authHeader(owner.accessToken));
      expect(res.status).toBe(200);
      expect(res.body.data.every((t) => t.status === 'DONE')).toBe(true);
      expect(res.body.data.length).toBe(1);
    });

    it('filters by priority', async () => {
      const { owner, project } = await seed();
      const res = await request(app)
        .get(`/api/v1/projects/${project.id}/tasks?priority=HIGH`)
        .set(authHeader(owner.accessToken));
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].priority).toBe('HIGH');
    });

    it('searches by q over the title', async () => {
      const { owner, project } = await seed();
      const res = await request(app)
        .get(`/api/v1/projects/${project.id}/tasks?q=login`)
        .set(authHeader(owner.accessToken));
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].title).toMatch(/login/i);
    });

    it('filters by dueBefore', async () => {
      const { owner, project } = await seed();
      const res = await request(app)
        .get(`/api/v1/projects/${project.id}/tasks?dueBefore=2026-07-15`)
        .set(authHeader(owner.accessToken));
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].title).toBe('Fix login bug');
    });

    it('sorts by dueDate ascending and returns pagination meta', async () => {
      const { owner, project } = await seed();
      const res = await request(app)
        .get(`/api/v1/projects/${project.id}/tasks?sort=dueDate&order=asc&limit=2&page=1`)
        .set(authHeader(owner.accessToken));
      expect(res.status).toBe(200);
      expect(res.body.meta).toMatchObject({ page: 1, limit: 2 });
      expect(res.body.meta.total).toBe(3);
      expect(res.body.data.length).toBe(2);
    });

    it('rejects an invalid sort field → 422', async () => {
      const { owner, project } = await seed();
      const res = await request(app)
        .get(`/api/v1/projects/${project.id}/tasks?sort=ssn`)
        .set(authHeader(owner.accessToken));
      expect(res.status).toBe(422);
    });

    it('returns an empty list (not error) when nothing matches → 200 []', async () => {
      const { owner, project } = await seed();
      const res = await request(app)
        .get(`/api/v1/projects/${project.id}/tasks?q=zzzznomatch`)
        .set(authHeader(owner.accessToken));
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it('forbids a non-member from listing tasks → 403', async () => {
      const { project } = await seed();
      const stranger = await registerUser();
      const res = await request(app)
        .get(`/api/v1/projects/${project.id}/tasks`)
        .set(authHeader(stranger.accessToken));
      expect(res.status).toBe(403);
    });
  });
});
