'use strict';

const service = require('./team.service');
const { ok, asyncHandler } = require('../../utils/response');

const create = asyncHandler(async (req, res) => {
  const team = await service.createTeam(req.user.id, req.body);
  return ok(res, team, 201);
});

const list = asyncHandler(async (req, res) => {
  const teams = await service.listTeams(req.user.id);
  return ok(res, teams, 200);
});

const detail = asyncHandler(async (req, res) => {
  const team = await service.getTeam(req.user.id, req.params.id);
  return ok(res, team, 200);
});

const update = asyncHandler(async (req, res) => {
  const team = await service.updateTeam(req.user.id, req.params.id, req.body);
  return ok(res, team, 200);
});

const remove = asyncHandler(async (req, res) => {
  await service.deleteTeam(req.user.id, req.params.id);
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

const invite = asyncHandler(async (req, res) => {
  const invitation = await service.inviteByEmail(req.user.id, req.params.id, req.body);
  return ok(res, invitation, 201);
});

const acceptInvite = asyncHandler(async (req, res) => {
  const membership = await service.acceptInvitation(req.user, req.params.token);
  return ok(res, membership, 200);
});

module.exports = {
  create,
  list,
  detail,
  update,
  remove,
  addMember,
  removeMember,
  invite,
  acceptInvite,
};
