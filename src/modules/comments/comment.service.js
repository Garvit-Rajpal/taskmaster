'use strict';

const repo = require('./comment.repository');
const taskService = require('../tasks/task.service');
const notificationService = require('../notifications/notification.service');
const { NotFoundError, ForbiddenError } = require('../../errors/AppError');

async function addComment(userId, taskId, body) {
  // Verifies task exists (404) + actor is a project member (403).
  const { task } = await taskService.requireTaskAccess(userId, taskId);
  const comment = await repo.create({ taskId, authorId: userId, body });

  // Notify the task's assignee (if any, and not the comment author).
  if (task.assignedUserId && task.assignedUserId !== userId) {
    await notificationService.notify({
      userId: task.assignedUserId,
      type: 'COMMENT_ADDED',
      payload: { taskId, commentId: comment.id, authorId: userId },
    });
  }
  return comment;
}

async function listComments(userId, taskId, { page, limit }) {
  await taskService.requireTaskAccess(userId, taskId);
  const skip = (page - 1) * limit;
  const { items, total } = await repo.listByTask({ taskId, skip, take: limit });
  return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

/** Load a comment + the actor's project membership, or throw 404/403. */
async function loadComment(userId, commentId) {
  const comment = await repo.findById(commentId);
  if (!comment) throw new NotFoundError('Comment not found');
  const task = await taskService.requireTaskAccess(userId, comment.taskId);
  return { comment, membership: task.membership };
}

async function updateComment(userId, commentId, body) {
  const { comment } = await loadComment(userId, commentId);
  if (comment.authorId !== userId) {
    throw new ForbiddenError('Only the author can edit this comment');
  }
  return repo.update(commentId, { body });
}

async function deleteComment(userId, commentId) {
  const { comment, membership } = await loadComment(userId, commentId);
  if (comment.authorId !== userId && membership.role !== 'MANAGER') {
    throw new ForbiddenError('Only the author or a project manager can delete this comment');
  }
  await repo.delete(commentId);
}

module.exports = { addComment, listComments, updateComment, deleteComment };
