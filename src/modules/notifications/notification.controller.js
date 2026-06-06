'use strict';

const service = require('./notification.service');
const { ok, asyncHandler } = require('../../utils/response');

const list = asyncHandler(async (req, res) => {
  const items = await service.listMine(req.user.id);
  return ok(res, items, 200);
});

const markRead = asyncHandler(async (req, res) => {
  const notification = await service.markRead(req.user.id, req.params.id);
  return ok(res, notification, 200);
});

module.exports = { list, markRead };
