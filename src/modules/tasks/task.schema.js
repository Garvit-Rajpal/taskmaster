'use strict';

const { z } = require('zod');

const STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];
const SORT_FIELDS = ['dueDate', 'createdAt', 'priority', 'status'];

const title = z.string().min(1, 'Title is required').max(140);

const createTaskSchema = {
  params: z.object({ projectId: z.string().uuid('Invalid project id') }),
  body: z.object({
    title,
    description: z.string().max(5000).optional(),
    dueDate: z.coerce.date().optional(),
    priority: z.enum(PRIORITIES).optional().default('MEDIUM'),
    status: z.enum(STATUSES).optional().default('TODO'),
    assignedUserId: z.string().uuid('Invalid user id').optional(),
  }),
};

const taskIdParamSchema = {
  params: z.object({ id: z.string().uuid('Invalid task id') }),
};

const updateTaskSchema = {
  params: z.object({ id: z.string().uuid('Invalid task id') }),
  body: z
    .object({
      title: title.optional(),
      description: z.string().max(5000).nullable().optional(),
      dueDate: z.coerce.date().nullable().optional(),
      priority: z.enum(PRIORITIES).optional(),
      status: z.enum(STATUSES).optional(),
    })
    .refine((d) => Object.keys(d).length > 0, { message: 'No fields to update' }),
};

const updateStatusSchema = {
  params: z.object({ id: z.string().uuid('Invalid task id') }),
  body: z.object({ status: z.enum(STATUSES) }),
};

const updateAssigneeSchema = {
  params: z.object({ id: z.string().uuid('Invalid task id') }),
  body: z.object({
    assignedUserId: z.string().uuid('Invalid user id').nullable(),
  }),
};

const listTasksSchema = {
  params: z.object({ projectId: z.string().uuid('Invalid project id') }),
  query: z.object({
    status: z
      .string()
      .optional()
      .transform((s) => (s ? s.split(',').map((x) => x.trim()).filter(Boolean) : undefined))
      .refine((arr) => !arr || arr.every((v) => STATUSES.includes(v)), {
        message: 'Invalid status value',
      }),
    priority: z.enum(PRIORITIES).optional(),
    assignedUserId: z.string().uuid('Invalid user id').optional(),
    dueBefore: z.coerce.date().optional(),
    dueAfter: z.coerce.date().optional(),
    q: z.string().min(1).optional(),
    sort: z.enum(SORT_FIELDS).optional().default('createdAt'),
    order: z.enum(['asc', 'desc']).optional().default('desc'),
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(20),
  }),
};

module.exports = {
  createTaskSchema,
  taskIdParamSchema,
  updateTaskSchema,
  updateStatusSchema,
  updateAssigneeSchema,
  listTasksSchema,
};
