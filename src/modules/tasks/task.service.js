'use strict';

const repo = require('./task.repository');
const projectRepo = require('../projects/project.repository');
const projectService = require('../projects/project.service');
const notificationService = require('../notifications/notification.service');
const { ValidationError, NotFoundError, ForbiddenError } = require('../../errors/AppError');

/** Ensure the task exists (404) and the actor is a member of its project (403). */
async function requireTaskAccess(userId, taskId) {
  const task = await repo.findById(taskId);
  if (!task) throw new NotFoundError('Task not found');
  const membership = await projectRepo.findMembership(userId, task.projectId);
  if (!membership) throw new ForbiddenError('You are not a member of this project');
  return { task, membership };
}

/** Validate that a would-be assignee is a member of the project. */
async function assertAssigneeInProject(projectId, assignedUserId) {
  if (assignedUserId == null) return;
  const membership = await projectRepo.findMembership(assignedUserId, projectId);
  if (!membership) {
    throw new ValidationError(
      [{ field: 'body.assignedUserId', message: 'Assignee must be a project member' }],
      'Assignee is not a project member'
    );
  }
}

async function createTask(userId, projectId, input) {
  await projectService.requireProjectAccess(userId, projectId);
  await assertAssigneeInProject(projectId, input.assignedUserId);
  const task = await repo.createTask({
    title: input.title,
    description: input.description,
    dueDate: input.dueDate,
    priority: input.priority,
    status: input.status,
    projectId,
    createdById: userId,
    assignedUserId: input.assignedUserId ?? null,
  });

  // Notify the assignee unless the creator assigned the task to themselves.
  if (task.assignedUserId && task.assignedUserId !== userId) {
    await notificationService.notify({
      userId: task.assignedUserId,
      type: 'TASK_ASSIGNED',
      payload: { taskId: task.id, assignedById: userId },
    });
  }
  return task;
}

async function getTask(userId, taskId) {
  await requireTaskAccess(userId, taskId);
  return repo.findDetailById(taskId);
}

async function updateTask(userId, taskId, data) {
  await requireTaskAccess(userId, taskId);
  return repo.updateById(taskId, data);
}

async function deleteTask(userId, taskId) {
  const { task, membership } = await requireTaskAccess(userId, taskId);
  if (task.createdById !== userId && membership.role !== 'MANAGER') {
    throw new ForbiddenError('Only the creator or a project manager can delete this task');
  }
  await repo.deleteById(taskId);
}

async function updateStatus(userId, taskId, status) {
  await requireTaskAccess(userId, taskId);
  return repo.updateById(taskId, { status });
}

async function updateAssignee(userId, taskId, assignedUserId) {
  const { task } = await requireTaskAccess(userId, taskId);
  await assertAssigneeInProject(task.projectId, assignedUserId);
  const updated = await repo.updateById(taskId, { assignedUserId });

  // Notify a newly-assigned user (skip self-assignment and clears).
  if (assignedUserId && assignedUserId !== userId && assignedUserId !== task.assignedUserId) {
    await notificationService.notify({
      userId: assignedUserId,
      type: 'TASK_ASSIGNED',
      payload: { taskId, assignedById: userId },
    });
  }
  return updated;
}

async function listTasks(userId, projectId, query) {
  await projectService.requireProjectAccess(userId, projectId);

  const where = { projectId };
  if (query.status) where.status = { in: query.status };
  if (query.priority) where.priority = query.priority;
  if (query.assignedUserId) where.assignedUserId = query.assignedUserId;
  if (query.dueBefore || query.dueAfter) {
    where.dueDate = {};
    if (query.dueBefore) where.dueDate.lte = query.dueBefore;
    if (query.dueAfter) where.dueDate.gte = query.dueAfter;
  }
  if (query.q) {
    where.OR = [
      { title: { contains: query.q, mode: 'insensitive' } },
      { description: { contains: query.q, mode: 'insensitive' } },
    ];
  }

  const skip = (query.page - 1) * query.limit;
  const { items, total } = await repo.list({
    where,
    orderBy: { [query.sort]: query.order },
    skip,
    take: query.limit,
  });

  return {
    items,
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

module.exports = {
  requireTaskAccess,
  createTask,
  getTask,
  updateTask,
  deleteTask,
  updateStatus,
  updateAssignee,
  listTasks,
};
