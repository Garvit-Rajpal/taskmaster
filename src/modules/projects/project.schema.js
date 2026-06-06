'use strict';

const { z } = require('zod');

const projectName = z.string().min(1, 'Project name is required').max(80);
const projectRole = z.enum(['MANAGER', 'MEMBER']);

const createProjectSchema = {
  params: z.object({ teamId: z.string().uuid('Invalid team id') }),
  body: z.object({
    name: projectName,
    description: z.string().max(500).optional(),
  }),
};

const teamIdParamSchema = {
  params: z.object({ teamId: z.string().uuid('Invalid team id') }),
};

const projectIdParamSchema = {
  params: z.object({ id: z.string().uuid('Invalid project id') }),
};

const updateProjectSchema = {
  params: z.object({ id: z.string().uuid('Invalid project id') }),
  body: z
    .object({
      name: projectName.optional(),
      description: z.string().max(500).nullable().optional(),
    })
    .refine((d) => Object.keys(d).length > 0, { message: 'No fields to update' }),
};

const addProjectMemberSchema = {
  params: z.object({ id: z.string().uuid('Invalid project id') }),
  body: z.object({
    userId: z.string().uuid('Invalid user id'),
    role: projectRole.optional().default('MEMBER'),
  }),
};

const projectMemberParamSchema = {
  params: z.object({
    id: z.string().uuid('Invalid project id'),
    userId: z.string().uuid('Invalid user id'),
  }),
};

module.exports = {
  createProjectSchema,
  teamIdParamSchema,
  projectIdParamSchema,
  updateProjectSchema,
  addProjectMemberSchema,
  projectMemberParamSchema,
};
