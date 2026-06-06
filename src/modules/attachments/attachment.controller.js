'use strict';

const service = require('./attachment.service');
const { ok, asyncHandler } = require('../../utils/response');

const upload = asyncHandler(async (req, res) => {
  const attachment = await service.upload(req.user.id, req.params.taskId, req.file);
  return ok(res, attachment, 201);
});

const list = asyncHandler(async (req, res) => {
  const items = await service.listForTask(req.user.id, req.params.taskId);
  return ok(res, items, 200);
});

const download = asyncHandler(async (req, res) => {
  const { attachment, buffer } = await service.download(req.user.id, req.params.id);
  res.setHeader('Content-Type', attachment.mimeType);
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${attachment.filename}"`
  );
  return res.status(200).send(buffer);
});

const remove = asyncHandler(async (req, res) => {
  await service.remove(req.user.id, req.params.id);
  return res.status(204).send();
});

module.exports = { upload, list, download, remove };
