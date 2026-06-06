'use strict';

/**
 * Hand-authored OpenAPI 3.0 description of the Task Tracker API.
 *
 * Kept as a plain object (not generated from code) so the contract is explicit,
 * reviewable, and decoupled from the Zod schemas. It is served raw at /docs.json
 * and rendered by swagger-ui-express at /docs.
 */

// ---------------------------------------------------------------------------
// Reusable component schemas
// ---------------------------------------------------------------------------

const schemas = {
  // -- Envelopes -----------------------------------------------------------
  ErrorBody: {
    type: 'object',
    properties: {
      error: {
        type: 'object',
        properties: {
          code: { type: 'string', example: 'VALIDATION_ERROR' },
          message: { type: 'string', example: 'Request validation failed' },
          details: {
            type: 'array',
            nullable: true,
            items: {
              type: 'object',
              properties: {
                field: { type: 'string', example: 'body.email' },
                message: { type: 'string', example: 'Invalid email' },
              },
            },
          },
        },
        required: ['code', 'message'],
      },
    },
    required: ['error'],
  },
  PaginationMeta: {
    type: 'object',
    properties: {
      page: { type: 'integer', example: 1 },
      limit: { type: 'integer', example: 20 },
      total: { type: 'integer', example: 42 },
      totalPages: { type: 'integer', example: 3 },
    },
  },

  // -- Resources -----------------------------------------------------------
  UserPublic: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      email: { type: 'string', format: 'email' },
      name: { type: 'string' },
      avatarUrl: { type: 'string', format: 'uri', nullable: true },
      createdAt: { type: 'string', format: 'date-time' },
    },
  },
  UserLimited: {
    type: 'object',
    description: 'Public profile of another user (no email).',
    properties: {
      id: { type: 'string', format: 'uuid' },
      name: { type: 'string' },
      avatarUrl: { type: 'string', format: 'uri', nullable: true },
      createdAt: { type: 'string', format: 'date-time' },
    },
  },
  AuthTokens: {
    type: 'object',
    properties: {
      user: { $ref: '#/components/schemas/UserPublic' },
      accessToken: { type: 'string', description: 'JWT access token (~15m TTL).' },
      refreshToken: {
        type: 'string',
        description: 'Opaque refresh token; rotated on each /auth/refresh.',
      },
    },
  },
  Team: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      name: { type: 'string' },
      description: { type: 'string', nullable: true },
      ownerId: { type: 'string', format: 'uuid' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },
  TeamMembership: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      userId: { type: 'string', format: 'uuid' },
      teamId: { type: 'string', format: 'uuid' },
      role: { type: 'string', enum: ['OWNER', 'ADMIN', 'MEMBER'] },
      createdAt: { type: 'string', format: 'date-time' },
    },
  },
  Invitation: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      email: { type: 'string', format: 'email' },
      teamId: { type: 'string', format: 'uuid' },
      role: { type: 'string', enum: ['ADMIN', 'MEMBER'] },
      token: { type: 'string' },
      status: { type: 'string', enum: ['PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED'] },
      expiresAt: { type: 'string', format: 'date-time' },
      createdAt: { type: 'string', format: 'date-time' },
    },
  },
  Project: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      name: { type: 'string' },
      description: { type: 'string', nullable: true },
      teamId: { type: 'string', format: 'uuid' },
      createdById: { type: 'string', format: 'uuid' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },
  ProjectMembership: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      userId: { type: 'string', format: 'uuid' },
      projectId: { type: 'string', format: 'uuid' },
      role: { type: 'string', enum: ['MANAGER', 'MEMBER'] },
      createdAt: { type: 'string', format: 'date-time' },
    },
  },
  Task: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      title: { type: 'string' },
      description: { type: 'string', nullable: true },
      dueDate: { type: 'string', format: 'date-time', nullable: true },
      status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'DONE'] },
      priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
      projectId: { type: 'string', format: 'uuid' },
      assignedUserId: { type: 'string', format: 'uuid', nullable: true },
      createdById: { type: 'string', format: 'uuid' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },
  Comment: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      body: { type: 'string' },
      taskId: { type: 'string', format: 'uuid' },
      authorId: { type: 'string', format: 'uuid' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },
  Attachment: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      taskId: { type: 'string', format: 'uuid' },
      uploadedById: { type: 'string', format: 'uuid' },
      filename: { type: 'string' },
      mimeType: { type: 'string' },
      sizeBytes: { type: 'integer' },
      createdAt: { type: 'string', format: 'date-time' },
    },
  },
  Notification: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      userId: { type: 'string', format: 'uuid' },
      type: {
        type: 'string',
        enum: ['TASK_ASSIGNED', 'TASK_UPDATED', 'COMMENT_ADDED', 'INVITED'],
      },
      payload: { type: 'object', additionalProperties: true },
      readAt: { type: 'string', format: 'date-time', nullable: true },
      createdAt: { type: 'string', format: 'date-time' },
    },
  },
};

// `data`-wrapped response helpers --------------------------------------------
const dataOf = (ref) => ({
  type: 'object',
  properties: { data: { $ref: `#/components/schemas/${ref}` } },
});
const listOf = (ref) => ({
  type: 'object',
  properties: {
    data: { type: 'array', items: { $ref: `#/components/schemas/${ref}` } },
    meta: { $ref: '#/components/schemas/PaginationMeta' },
  },
});

// ---------------------------------------------------------------------------
// Reusable responses & parameters
// ---------------------------------------------------------------------------

const errorResponse = (description) => ({
  description,
  content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorBody' } } },
});

const responses = {
  BadRequest: errorResponse('Validation failed'),
  Unauthorized: errorResponse('Missing or invalid access token'),
  Forbidden: errorResponse('Authenticated but not permitted'),
  NotFound: errorResponse('Resource not found'),
  Conflict: errorResponse('State conflict (e.g. duplicate or already used)'),
  Unprocessable: errorResponse('Semantically invalid (e.g. assignee not a project member)'),
};

const jsonBody = (schema, required = true) => ({
  required,
  content: { 'application/json': { schema } },
});
const jsonData = (ref, description = 'Success') => ({
  description,
  content: { 'application/json': { schema: dataOf(ref) } },
});
const jsonList = (ref, description = 'Success') => ({
  description,
  content: { 'application/json': { schema: listOf(ref) } },
});

const pathId = (name, desc) => ({
  name,
  in: 'path',
  required: true,
  schema: { type: 'string', format: 'uuid' },
  description: desc,
});
const pageParams = [
  { name: 'page', in: 'query', schema: { type: 'integer', default: 1, minimum: 1 } },
  { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 } },
];

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const paths = {
  // -- Auth ---------------------------------------------------------------
  '/auth/register': {
    post: {
      tags: ['Auth'],
      summary: 'Register a new user',
      security: [],
      requestBody: jsonBody({
        type: 'object',
        required: ['email', 'password', 'name'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: {
            type: 'string',
            description: 'Min 8 chars with upper, lower, digit, and symbol.',
            example: 'Sup3r$ecret',
          },
          name: { type: 'string', maxLength: 80 },
        },
      }),
      responses: {
        201: jsonData('AuthTokens', 'User created'),
        400: { $ref: '#/components/responses/BadRequest' },
        409: { $ref: '#/components/responses/Conflict' },
      },
    },
  },
  '/auth/login': {
    post: {
      tags: ['Auth'],
      summary: 'Log in and receive tokens',
      security: [],
      requestBody: jsonBody({
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
        },
      }),
      responses: {
        200: jsonData('AuthTokens', 'Authenticated'),
        400: { $ref: '#/components/responses/BadRequest' },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },
  '/auth/refresh': {
    post: {
      tags: ['Auth'],
      summary: 'Rotate refresh token for a new access token',
      security: [],
      requestBody: jsonBody({
        type: 'object',
        required: ['refreshToken'],
        properties: { refreshToken: { type: 'string' } },
      }),
      responses: {
        200: jsonData('AuthTokens', 'New token pair'),
        400: { $ref: '#/components/responses/BadRequest' },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },
  '/auth/logout': {
    post: {
      tags: ['Auth'],
      summary: 'Revoke a refresh token',
      security: [],
      requestBody: jsonBody({
        type: 'object',
        required: ['refreshToken'],
        properties: { refreshToken: { type: 'string' } },
      }),
      responses: {
        204: { description: 'Logged out' },
        400: { $ref: '#/components/responses/BadRequest' },
      },
    },
  },

  // -- Users --------------------------------------------------------------
  '/users/me': {
    get: {
      tags: ['Users'],
      summary: 'Get the authenticated user',
      responses: {
        200: jsonData('UserPublic'),
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
    patch: {
      tags: ['Users'],
      summary: 'Update profile or change password',
      description:
        'A password change requires both `currentPassword` and a policy-compliant `newPassword`; doing so revokes all existing refresh tokens.',
      requestBody: jsonBody({
        type: 'object',
        properties: {
          name: { type: 'string', maxLength: 80 },
          avatarUrl: { type: 'string', format: 'uri' },
          currentPassword: { type: 'string' },
          newPassword: { type: 'string' },
        },
      }),
      responses: {
        200: jsonData('UserPublic'),
        400: { $ref: '#/components/responses/BadRequest' },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },
  '/users/{id}': {
    get: {
      tags: ['Users'],
      summary: 'Get another user’s public profile',
      parameters: [pathId('id', 'User id')],
      responses: {
        200: jsonData('UserLimited'),
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  // -- Teams --------------------------------------------------------------
  '/teams': {
    post: {
      tags: ['Teams'],
      summary: 'Create a team (caller becomes OWNER)',
      requestBody: jsonBody({
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', maxLength: 80 },
          description: { type: 'string', maxLength: 500 },
        },
      }),
      responses: {
        201: jsonData('Team', 'Team created'),
        400: { $ref: '#/components/responses/BadRequest' },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
    get: {
      tags: ['Teams'],
      summary: 'List teams the caller belongs to',
      responses: {
        200: jsonList('Team'),
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },
  '/teams/{id}': {
    get: {
      tags: ['Teams'],
      summary: 'Get a team',
      parameters: [pathId('id', 'Team id')],
      responses: {
        200: jsonData('Team'),
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
    patch: {
      tags: ['Teams'],
      summary: 'Update a team (ADMIN+)',
      parameters: [pathId('id', 'Team id')],
      requestBody: jsonBody({
        type: 'object',
        properties: {
          name: { type: 'string', maxLength: 80 },
          description: { type: 'string', maxLength: 500, nullable: true },
        },
      }),
      responses: {
        200: jsonData('Team'),
        400: { $ref: '#/components/responses/BadRequest' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
    delete: {
      tags: ['Teams'],
      summary: 'Delete a team (OWNER)',
      parameters: [pathId('id', 'Team id')],
      responses: {
        204: { description: 'Deleted' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },
  '/teams/{id}/members': {
    post: {
      tags: ['Teams'],
      summary: 'Add a member directly (ADMIN+)',
      parameters: [pathId('id', 'Team id')],
      requestBody: jsonBody({
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string', format: 'uuid' },
          role: { type: 'string', enum: ['ADMIN', 'MEMBER'], default: 'MEMBER' },
        },
      }),
      responses: {
        201: jsonData('TeamMembership', 'Member added'),
        400: { $ref: '#/components/responses/BadRequest' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
        409: { $ref: '#/components/responses/Conflict' },
      },
    },
  },
  '/teams/{id}/members/{userId}': {
    delete: {
      tags: ['Teams'],
      summary: 'Remove a member (ADMIN+)',
      parameters: [pathId('id', 'Team id'), pathId('userId', 'User id')],
      responses: {
        204: { description: 'Removed' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },
  '/teams/{id}/invitations': {
    post: {
      tags: ['Teams'],
      summary: 'Invite someone by email (ADMIN+)',
      parameters: [pathId('id', 'Team id')],
      requestBody: jsonBody({
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['ADMIN', 'MEMBER'], default: 'MEMBER' },
        },
      }),
      responses: {
        201: jsonData('Invitation', 'Invitation created'),
        400: { $ref: '#/components/responses/BadRequest' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },
  '/invitations/{token}/accept': {
    post: {
      tags: ['Teams'],
      summary: 'Accept an invitation',
      parameters: [
        { name: 'token', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        200: jsonData('TeamMembership', 'Invitation accepted'),
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
        409: { $ref: '#/components/responses/Conflict' },
        410: errorResponse('Invitation expired'),
      },
    },
  },

  // -- Projects -----------------------------------------------------------
  '/teams/{teamId}/projects': {
    post: {
      tags: ['Projects'],
      summary: 'Create a project under a team (MEMBER+)',
      parameters: [pathId('teamId', 'Team id')],
      requestBody: jsonBody({
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', maxLength: 80 },
          description: { type: 'string', maxLength: 500 },
        },
      }),
      responses: {
        201: jsonData('Project', 'Project created'),
        400: { $ref: '#/components/responses/BadRequest' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
    get: {
      tags: ['Projects'],
      summary: 'List projects in a team',
      parameters: [pathId('teamId', 'Team id')],
      responses: {
        200: jsonList('Project'),
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },
  '/projects/{id}': {
    get: {
      tags: ['Projects'],
      summary: 'Get a project',
      parameters: [pathId('id', 'Project id')],
      responses: {
        200: jsonData('Project'),
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
    patch: {
      tags: ['Projects'],
      summary: 'Update a project (MANAGER)',
      parameters: [pathId('id', 'Project id')],
      requestBody: jsonBody({
        type: 'object',
        properties: {
          name: { type: 'string', maxLength: 80 },
          description: { type: 'string', maxLength: 500, nullable: true },
        },
      }),
      responses: {
        200: jsonData('Project'),
        400: { $ref: '#/components/responses/BadRequest' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
    delete: {
      tags: ['Projects'],
      summary: 'Delete a project (MANAGER)',
      parameters: [pathId('id', 'Project id')],
      responses: {
        204: { description: 'Deleted' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },
  '/projects/{id}/members': {
    post: {
      tags: ['Projects'],
      summary: 'Add a project member (MANAGER)',
      parameters: [pathId('id', 'Project id')],
      requestBody: jsonBody({
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string', format: 'uuid' },
          role: { type: 'string', enum: ['MANAGER', 'MEMBER'], default: 'MEMBER' },
        },
      }),
      responses: {
        201: jsonData('ProjectMembership', 'Member added'),
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
        409: { $ref: '#/components/responses/Conflict' },
        422: { $ref: '#/components/responses/Unprocessable' },
      },
    },
  },
  '/projects/{id}/members/{userId}': {
    delete: {
      tags: ['Projects'],
      summary: 'Remove a project member (MANAGER)',
      parameters: [pathId('id', 'Project id'), pathId('userId', 'User id')],
      responses: {
        204: { description: 'Removed' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  // -- Tasks --------------------------------------------------------------
  '/projects/{projectId}/tasks': {
    post: {
      tags: ['Tasks'],
      summary: 'Create a task',
      parameters: [pathId('projectId', 'Project id')],
      requestBody: jsonBody({
        type: 'object',
        required: ['title'],
        properties: {
          title: { type: 'string', maxLength: 140 },
          description: { type: 'string', maxLength: 5000 },
          dueDate: { type: 'string', format: 'date-time' },
          priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'MEDIUM' },
          status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'DONE'], default: 'TODO' },
          assignedUserId: { type: 'string', format: 'uuid' },
        },
      }),
      responses: {
        201: jsonData('Task', 'Task created'),
        400: { $ref: '#/components/responses/BadRequest' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
        422: { $ref: '#/components/responses/Unprocessable' },
      },
    },
    get: {
      tags: ['Tasks'],
      summary: 'List & filter tasks',
      parameters: [
        pathId('projectId', 'Project id'),
        {
          name: 'status',
          in: 'query',
          description: 'Comma-separated subset of TODO,IN_PROGRESS,DONE',
          schema: { type: 'string', example: 'TODO,IN_PROGRESS' },
        },
        { name: 'priority', in: 'query', schema: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] } },
        { name: 'assignedUserId', in: 'query', schema: { type: 'string', format: 'uuid' } },
        { name: 'dueBefore', in: 'query', schema: { type: 'string', format: 'date-time' } },
        { name: 'dueAfter', in: 'query', schema: { type: 'string', format: 'date-time' } },
        { name: 'q', in: 'query', description: 'Search in title/description', schema: { type: 'string' } },
        {
          name: 'sort',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['dueDate', 'createdAt', 'priority', 'status'],
            default: 'createdAt',
          },
        },
        { name: 'order', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' } },
        ...pageParams,
      ],
      responses: {
        200: jsonList('Task'),
        400: { $ref: '#/components/responses/BadRequest' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },
  '/tasks/{id}': {
    get: {
      tags: ['Tasks'],
      summary: 'Get a task (with comments & attachments)',
      parameters: [pathId('id', 'Task id')],
      responses: {
        200: jsonData('Task'),
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
    patch: {
      tags: ['Tasks'],
      summary: 'Update task fields',
      parameters: [pathId('id', 'Task id')],
      requestBody: jsonBody({
        type: 'object',
        properties: {
          title: { type: 'string', maxLength: 140 },
          description: { type: 'string', maxLength: 5000, nullable: true },
          dueDate: { type: 'string', format: 'date-time', nullable: true },
          priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
          status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'DONE'] },
        },
      }),
      responses: {
        200: jsonData('Task'),
        400: { $ref: '#/components/responses/BadRequest' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
    delete: {
      tags: ['Tasks'],
      summary: 'Delete a task (creator or project MANAGER)',
      parameters: [pathId('id', 'Task id')],
      responses: {
        204: { description: 'Deleted' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },
  '/tasks/{id}/status': {
    patch: {
      tags: ['Tasks'],
      summary: 'Update task status',
      parameters: [pathId('id', 'Task id')],
      requestBody: jsonBody({
        type: 'object',
        required: ['status'],
        properties: { status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'DONE'] } },
      }),
      responses: {
        200: jsonData('Task'),
        400: { $ref: '#/components/responses/BadRequest' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },
  '/tasks/{id}/assignee': {
    patch: {
      tags: ['Tasks'],
      summary: 'Assign / unassign a task',
      parameters: [pathId('id', 'Task id')],
      requestBody: jsonBody({
        type: 'object',
        required: ['assignedUserId'],
        properties: {
          assignedUserId: {
            type: 'string',
            format: 'uuid',
            nullable: true,
            description: 'null clears the assignee.',
          },
        },
      }),
      responses: {
        200: jsonData('Task'),
        400: { $ref: '#/components/responses/BadRequest' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
        422: { $ref: '#/components/responses/Unprocessable' },
      },
    },
  },

  // -- Comments -----------------------------------------------------------
  '/tasks/{taskId}/comments': {
    post: {
      tags: ['Comments'],
      summary: 'Add a comment',
      parameters: [pathId('taskId', 'Task id')],
      requestBody: jsonBody({
        type: 'object',
        required: ['body'],
        properties: { body: { type: 'string', maxLength: 2000 } },
      }),
      responses: {
        201: jsonData('Comment', 'Comment added'),
        400: { $ref: '#/components/responses/BadRequest' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
    get: {
      tags: ['Comments'],
      summary: 'List comments (newest first)',
      parameters: [pathId('taskId', 'Task id'), ...pageParams],
      responses: {
        200: jsonList('Comment'),
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },
  '/comments/{id}': {
    patch: {
      tags: ['Comments'],
      summary: 'Edit a comment (author only)',
      parameters: [pathId('id', 'Comment id')],
      requestBody: jsonBody({
        type: 'object',
        required: ['body'],
        properties: { body: { type: 'string', maxLength: 2000 } },
      }),
      responses: {
        200: jsonData('Comment'),
        400: { $ref: '#/components/responses/BadRequest' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
    delete: {
      tags: ['Comments'],
      summary: 'Delete a comment (author or project MANAGER)',
      parameters: [pathId('id', 'Comment id')],
      responses: {
        204: { description: 'Deleted' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  // -- Attachments --------------------------------------------------------
  '/tasks/{taskId}/attachments': {
    post: {
      tags: ['Attachments'],
      summary: 'Upload a file attachment',
      parameters: [pathId('taskId', 'Task id')],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['file'],
              properties: { file: { type: 'string', format: 'binary' } },
            },
          },
        },
      },
      responses: {
        201: jsonData('Attachment', 'Uploaded'),
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
        413: errorResponse('File exceeds the maximum allowed size'),
        422: { $ref: '#/components/responses/Unprocessable' },
      },
    },
    get: {
      tags: ['Attachments'],
      summary: 'List a task’s attachments',
      parameters: [pathId('taskId', 'Task id')],
      responses: {
        200: jsonList('Attachment'),
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },
  '/attachments/{id}/download': {
    get: {
      tags: ['Attachments'],
      summary: 'Download an attachment',
      parameters: [pathId('id', 'Attachment id')],
      responses: {
        200: {
          description: 'Binary file stream',
          content: { 'application/octet-stream': { schema: { type: 'string', format: 'binary' } } },
        },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },
  '/attachments/{id}': {
    delete: {
      tags: ['Attachments'],
      summary: 'Delete an attachment (uploader or project MANAGER)',
      parameters: [pathId('id', 'Attachment id')],
      responses: {
        204: { description: 'Deleted' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  // -- Notifications ------------------------------------------------------
  '/notifications': {
    get: {
      tags: ['Notifications'],
      summary: 'List the caller’s notifications',
      responses: {
        200: jsonList('Notification'),
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },
  '/notifications/{id}/read': {
    patch: {
      tags: ['Notifications'],
      summary: 'Mark a notification read',
      parameters: [pathId('id', 'Notification id')],
      responses: {
        200: jsonData('Notification'),
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },
};

// ---------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------

const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Task Tracker & Team Collaboration API',
    version: '1.0.0',
    description:
      'REST API for teams, projects, tasks, comments, attachments, and notifications. ' +
      'All responses use a `{ data, meta }` envelope on success and `{ error: { code, message, details } }` on failure. ' +
      'Authenticate with `Authorization: Bearer <accessToken>`.',
  },
  servers: [{ url: '/api/v1', description: 'Default' }],
  tags: [
    { name: 'Auth', description: 'Registration, login, token rotation' },
    { name: 'Users', description: 'Profile and account' },
    { name: 'Teams', description: 'Teams, members, invitations' },
    { name: 'Projects', description: 'Projects and project members' },
    { name: 'Tasks', description: 'Tasks, status, assignment' },
    { name: 'Comments', description: 'Task comments' },
    { name: 'Attachments', description: 'Task file attachments' },
    { name: 'Notifications', description: 'In-app notifications' },
  ],
  security: [{ bearerAuth: [] }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas,
    responses,
  },
  paths,
};

module.exports = { openapiSpec };
