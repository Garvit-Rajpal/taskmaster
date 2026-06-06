'use strict';

const { Router } = require('express');
const authenticate = require('../../middleware/authenticate');
const validate = require('../../middleware/validate');
const ctrl = require('./comment.controller');
const {
  createCommentSchema,
  listCommentsSchema,
  commentIdParamSchema,
  updateCommentSchema,
} = require('./comment.schema');

// Nested under /tasks/:taskId/comments.
const taskCommentsRouter = Router({ mergeParams: true });
taskCommentsRouter.use(authenticate);
taskCommentsRouter.post('/', validate(createCommentSchema), ctrl.create);
taskCommentsRouter.get('/', validate(listCommentsSchema), ctrl.list);

// Top-level /comments.
const commentsRouter = Router();
commentsRouter.use(authenticate);
commentsRouter.patch('/:id', validate(updateCommentSchema), ctrl.update);
commentsRouter.delete('/:id', validate(commentIdParamSchema), ctrl.remove);

module.exports = { taskCommentsRouter, commentsRouter };
