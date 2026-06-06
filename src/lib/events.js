'use strict';

const { EventEmitter } = require('events');

/**
 * Application event bus — the seam future realtime transport (Socket.IO) will
 * subscribe to. Services emit domain events here; the notification listener
 * persists rows today, and a WS gateway can fan them out later without touching
 * service code.
 */
const bus = new EventEmitter();

const EVENTS = {
  TASK_ASSIGNED: 'task.assigned',
  COMMENT_ADDED: 'comment.added',
};

module.exports = { bus, EVENTS };
