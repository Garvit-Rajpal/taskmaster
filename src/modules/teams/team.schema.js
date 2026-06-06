'use strict';

const { z } = require('zod');

const teamName = z.string().min(1, 'Team name is required').max(80);
const teamRole = z.enum(['OWNER', 'ADMIN', 'MEMBER']);
// Roles that can be granted when adding/inviting (cannot mint a second OWNER).
const grantableRole = z.enum(['ADMIN', 'MEMBER']);

const createTeamSchema = {
  body: z.object({
    name: teamName,
    description: z.string().max(500).optional(),
  }),
};

const updateTeamSchema = {
  params: z.object({ id: z.string().uuid('Invalid team id') }),
  body: z
    .object({
      name: teamName.optional(),
      description: z.string().max(500).nullable().optional(),
    })
    .refine((d) => Object.keys(d).length > 0, { message: 'No fields to update' }),
};

const teamIdParamSchema = {
  params: z.object({ id: z.string().uuid('Invalid team id') }),
};

const addMemberSchema = {
  params: z.object({ id: z.string().uuid('Invalid team id') }),
  body: z.object({
    userId: z.string().uuid('Invalid user id'),
    role: grantableRole.optional().default('MEMBER'),
  }),
};

const memberParamSchema = {
  params: z.object({
    id: z.string().uuid('Invalid team id'),
    userId: z.string().uuid('Invalid user id'),
  }),
};

const inviteSchema = {
  params: z.object({ id: z.string().uuid('Invalid team id') }),
  body: z.object({
    email: z.string().email('Invalid email').transform((s) => s.toLowerCase().trim()),
    role: grantableRole.optional().default('MEMBER'),
  }),
};

const acceptInviteSchema = {
  params: z.object({ token: z.string().min(1, 'Invalid token') }),
};

module.exports = {
  createTeamSchema,
  updateTeamSchema,
  teamIdParamSchema,
  addMemberSchema,
  memberParamSchema,
  inviteSchema,
  acceptInviteSchema,
  teamRole,
};
