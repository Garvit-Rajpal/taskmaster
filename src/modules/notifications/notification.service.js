'use strict';

const repo = require('./notification.repository');
const { bus } = require('../../lib/events');
const { NotFoundError, ForbiddenError } = require('../../errors/AppError');

/**
 * Persist a notification row and emit it on the event bus. Returns the row.
 * `userId` is the recipient. No-op when there is no recipient.
 */
async function notify({ userId, type, payload }) {
  if (!userId) return null;
  const row = await repo.create({ userId, type, payload });
  bus.emit('notification.created', row);
  return row;
}

async function listMine(userId) {
  return repo.listForUser(userId);
}

async function markRead(userId, notificationId) {
  const notification = await repo.findById(notificationId);
  if (!notification) throw new NotFoundError('Notification not found');
  if (notification.userId !== userId) {
    throw new ForbiddenError('You cannot modify this notification');
  }
  return repo.markRead(notificationId);
}

module.exports = { notify, listMine, markRead };
