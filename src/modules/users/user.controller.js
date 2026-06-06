'use strict';

const service = require('./user.service');
const { ok, asyncHandler } = require('../../utils/response');

const getMe = asyncHandler(async (req, res) => {
  const user = await service.getMe(req.user.id);
  return ok(res, user, 200);
});

const updateMe = asyncHandler(async (req, res) => {
  const user = await service.updateMe(req.user.id, req.body);
  return ok(res, user, 200);
});

const getById = asyncHandler(async (req, res) => {
  const user = await service.getById(req.params.id);
  return ok(res, user, 200);
});

module.exports = { getMe, updateMe, getById };
