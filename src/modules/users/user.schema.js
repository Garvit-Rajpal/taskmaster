'use strict';

const { z } = require('zod');
const { password } = require('../auth/auth.schema');

const name = z.string().min(1, 'Name is required').max(80, 'Name must be at most 80 characters');
const avatarUrl = z.string().url('avatarUrl must be a valid URL');

// PATCH /users/me — all fields optional, but a password change requires BOTH
// currentPassword and a policy-compliant newPassword together.
const updateMeSchema = {
  body: z
    .object({
      name: name.optional(),
      avatarUrl: avatarUrl.optional(),
      currentPassword: z.string().min(1).optional(),
      newPassword: password.optional(),
    })
    .strict()
    .refine(
      (d) => (d.newPassword === undefined) === (d.currentPassword === undefined),
      {
        message: 'currentPassword and newPassword must be provided together',
        path: ['newPassword'],
      }
    )
    .refine((d) => Object.keys(d).length > 0, { message: 'No fields to update' }),
};

const userIdParamSchema = {
  params: z.object({ id: z.string().uuid('Invalid user id') }),
};

module.exports = { updateMeSchema, userIdParamSchema };
