'use strict';

const { z } = require('zod');

const taskIdParamSchema = {
  params: z.object({ taskId: z.string().uuid('Invalid task id') }),
};

const attachmentIdParamSchema = {
  params: z.object({ id: z.string().uuid('Invalid attachment id') }),
};

module.exports = { taskIdParamSchema, attachmentIdParamSchema };
