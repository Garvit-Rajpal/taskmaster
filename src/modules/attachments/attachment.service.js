'use strict';

const path = require('path');
const repo = require('./attachment.repository');
const storage = require('../../lib/storage');
const taskService = require('../tasks/task.service');
const { ValidationError, NotFoundError, ForbiddenError } = require('../../errors/AppError');

/** Strip any directory components from a client-supplied filename. */
function sanitizeFilename(name) {
  return path.basename(name || 'file').replace(/[^\w.\-]+/g, '_');
}

async function upload(userId, taskId, file) {
  await taskService.requireTaskAccess(userId, taskId);
  if (!file) {
    throw new ValidationError([{ field: 'file', message: 'A file is required' }], 'No file uploaded');
  }

  const filename = sanitizeFilename(file.originalname);
  const storageKey = storage.save(file.buffer, filename);

  return repo.create({
    taskId,
    uploadedById: userId,
    filename,
    mimeType: file.mimetype,
    sizeBytes: file.size,
    storageKey,
  });
}

async function listForTask(userId, taskId) {
  await taskService.requireTaskAccess(userId, taskId);
  return repo.listByTask(taskId);
}

/** Load attachment + verify the actor can access its task. */
async function loadForAccess(userId, attachmentId) {
  const attachment = await repo.findById(attachmentId);
  if (!attachment) throw new NotFoundError('Attachment not found');
  const { membership } = await taskService.requireTaskAccess(userId, attachment.taskId);
  return { attachment, membership };
}

async function download(userId, attachmentId) {
  const { attachment } = await loadForAccess(userId, attachmentId);
  if (!storage.exists(attachment.storageKey)) {
    throw new NotFoundError('Attachment file is missing');
  }
  return { attachment, buffer: storage.read(attachment.storageKey) };
}

async function remove(userId, attachmentId) {
  const { attachment, membership } = await loadForAccess(userId, attachmentId);
  if (attachment.uploadedById !== userId && membership.role !== 'MANAGER') {
    throw new ForbiddenError('Only the uploader or a project manager can delete this attachment');
  }
  await repo.delete(attachmentId);
  storage.remove(attachment.storageKey);
}

module.exports = { upload, listForTask, download, remove, sanitizeFilename };
