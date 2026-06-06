'use strict';

const service = require('./auth.service');
const { ok, asyncHandler } = require('../../utils/response');

const register = asyncHandler(async (req, res) => {
  const result = await service.register(req.body);
  return ok(res, result, 201);
});

const login = asyncHandler(async (req, res) => {
  const result = await service.login(req.body);
  return ok(res, result, 200);
});

const refresh = asyncHandler(async (req, res) => {
  const result = await service.refresh(req.body);
  return ok(res, result, 200);
});

const logout = asyncHandler(async (req, res) => {
  await service.logout(req.body);
  return res.status(204).send();
});

module.exports = { register, login, refresh, logout };
