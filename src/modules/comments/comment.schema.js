'use strict';

const { z } = require('zod');

const body = z.string().min(1, 'Comment body is required').max(2000);

const createCommentSchema = {
  params: z.object({ taskId: z.string().uuid('Invalid task id') }),
  body: z.object({ body }),
};

const listCommentsSchema = {
  params: z.object({ taskId: z.string().uuid('Invalid task id') }),
  query: z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(20),
  }),
};

const commentIdParamSchema = {
  params: z.object({ id: z.string().uuid('Invalid comment id') }),
};

const updateCommentSchema = {
  params: z.object({ id: z.string().uuid('Invalid comment id') }),
  body: z.object({ body }),
};

module.exports = {
  createCommentSchema,
  listCommentsSchema,
  commentIdParamSchema,
  updateCommentSchema,
};
