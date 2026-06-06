'use strict';

const { Router } = require('express');
const authenticate = require('../../middleware/authenticate');
const validate = require('../../middleware/validate');
const { uploadSingle } = require('../../middleware/upload');
const ctrl = require('./attachment.controller');
const { taskIdParamSchema, attachmentIdParamSchema } = require('./attachment.schema');

// Nested under /tasks/:taskId/attachments.
const taskAttachmentsRouter = Router({ mergeParams: true });
taskAttachmentsRouter.use(authenticate);
taskAttachmentsRouter.post('/', uploadSingle('file'), validate(taskIdParamSchema), ctrl.upload);
taskAttachmentsRouter.get('/', validate(taskIdParamSchema), ctrl.list);

// Top-level /attachments.
const attachmentsRouter = Router();
attachmentsRouter.use(authenticate);
attachmentsRouter.get('/:id/download', validate(attachmentIdParamSchema), ctrl.download);
attachmentsRouter.delete('/:id', validate(attachmentIdParamSchema), ctrl.remove);

module.exports = { taskAttachmentsRouter, attachmentsRouter };
