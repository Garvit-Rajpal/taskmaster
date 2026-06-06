'use strict';

const service = require('./task.service');
const { ok, asyncHandler } = require('../../utils/response');

const create = asyncHandler(async (req, res) => {
  const task = await service.createTask(req.user.id, req.params.projectId, req.body);
  return ok(res, task, 201);
});

const list = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listTasks(
    req.user.id,
    req.params.projectId,
    req.validatedQuery
  );
  return ok(res, items, 200, meta);
});

const detail = asyncHandler(async (req, res) => {
  const task = await service.getTask(req.user.id, req.params.id);
  return ok(res, task, 200);
});

const update = asyncHandler(async (req, res) => {
  const task = await service.updateTask(req.user.id, req.params.id, req.body);
  return ok(res, task, 200);
});

const remove = asyncHandler(async (req, res) => {
  await service.deleteTask(req.user.id, req.params.id);
  return res.status(204).send();
});

const updateStatus = asyncHandler(async (req, res) => {
  const task = await service.updateStatus(req.user.id, req.params.id, req.body.status);
  return ok(res, task, 200);
});

const updateAssignee = asyncHandler(async (req, res) => {
  const task = await service.updateAssignee(req.user.id, req.params.id, req.body.assignedUserId);
  return ok(res, task, 200);
});

module.exports = { create, list, detail, update, remove, updateStatus, updateAssignee };
