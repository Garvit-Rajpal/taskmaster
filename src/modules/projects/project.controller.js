'use strict';

const service = require('./project.service');
const { ok, asyncHandler } = require('../../utils/response');

const create = asyncHandler(async (req, res) => {
  const project = await service.createProject(req.user.id, req.params.teamId, req.body);
  return ok(res, project, 201);
});

const listByTeam = asyncHandler(async (req, res) => {
  const projects = await service.listProjects(req.user.id, req.params.teamId);
  return ok(res, projects, 200);
});

const detail = asyncHandler(async (req, res) => {
  const project = await service.getProject(req.user.id, req.params.id);
  return ok(res, project, 200);
});

const update = asyncHandler(async (req, res) => {
  const project = await service.updateProject(req.user.id, req.params.id, req.body);
  return ok(res, project, 200);
});

const remove = asyncHandler(async (req, res) => {
  await service.deleteProject(req.user.id, req.params.id);
  return res.status(204).send();
});

const addMember = asyncHandler(async (req, res) => {
  const membership = await service.addMember(req.user.id, req.params.id, req.body);
  return ok(res, membership, 201);
});

const removeMember = asyncHandler(async (req, res) => {
  await service.removeMember(req.user.id, req.params.id, req.params.userId);
  return res.status(204).send();
});

module.exports = { create, listByTeam, detail, update, remove, addMember, removeMember };
