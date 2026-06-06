'use strict';

const service = require('./comment.service');
const { ok, asyncHandler } = require('../../utils/response');

const create = asyncHandler(async (req, res) => {
  const comment = await service.addComment(req.user.id, req.params.taskId, req.body.body);
  return ok(res, comment, 201);
});

const list = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listComments(
    req.user.id,
    req.params.taskId,
    req.validatedQuery
  );
  return ok(res, items, 200, meta);
});

const update = asyncHandler(async (req, res) => {
  const comment = await service.updateComment(req.user.id, req.params.id, req.body.body);
  return ok(res, comment, 200);
});

const remove = asyncHandler(async (req, res) => {
  await service.deleteComment(req.user.id, req.params.id);
  return res.status(204).send();
});

module.exports = { create, list, update, remove };
