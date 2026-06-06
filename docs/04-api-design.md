# API Design & Contracts — TaskMaster

> Phase 1 deliverable. REST contract. All routes are versioned under `/api/v1`.

## 1. Conventions

- **Base path**: `/api/v1`
- **Auth**: `Authorization: Bearer <accessToken>` on protected routes.
- **Content type**: `application/json` (except attachment upload: `multipart/form-data`).
- **Success envelope**: `{ "data": <payload>, "meta": <optional> }`
- **Error envelope**: `{ "error": { "code", "message", "details": [] } }`
- **Pagination**: `?page=1&limit=20` → `meta: { page, limit, total, totalPages }`
- **Idempotent verbs**: GET/PUT/DELETE; POST creates.
- **Status codes**: 200 OK, 201 Created, 204 No Content, 400 Bad Request,
  401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict,
  422 Validation Error, 429 Too Many Requests, 500 Internal.

## 2. Auth & Users

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/auth/register` | – | Create account → returns user + tokens |
| POST | `/auth/login` | – | Authenticate → returns access + refresh tokens |
| POST | `/auth/refresh` | refresh | Rotate refresh token → new access + refresh |
| POST | `/auth/logout` | refresh | Revoke the presented refresh token |
| GET  | `/users/me` | ✓ | Current user profile |
| PATCH| `/users/me` | ✓ | Update own profile (name, avatarUrl, password) |
| GET  | `/users/:id` | ✓ | Public-ish profile (limited fields) |

**Register request**
```json
{ "email": "a@b.com", "password": "Str0ng!pass", "name": "Ada" }
```
**Login response**
```json
{ "data": { "user": { "id": "...", "email": "a@b.com", "name": "Ada" },
            "accessToken": "ey...", "refreshToken": "ey..." } }
```

## 3. Teams

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/teams` | ✓ | Create team (creator becomes OWNER) |
| GET  | `/teams` | ✓ | List teams the user belongs to |
| GET  | `/teams/:id` | member | Team detail + members |
| PATCH| `/teams/:id` | OWNER/ADMIN | Update team |
| DELETE | `/teams/:id` | OWNER | Delete team |
| POST | `/teams/:id/members` | OWNER/ADMIN | Add an existing user by id |
| DELETE | `/teams/:id/members/:userId` | OWNER/ADMIN | Remove member |
| POST | `/teams/:id/invitations` | OWNER/ADMIN | Invite by email |
| POST | `/invitations/:token/accept` | ✓ | Accept an invite → join team |

## 4. Projects

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/teams/:teamId/projects` | team member | Create project under team |
| GET  | `/teams/:teamId/projects` | team member | List team projects |
| GET  | `/projects/:id` | project member | Project detail |
| PATCH| `/projects/:id` | MANAGER | Update project |
| DELETE | `/projects/:id` | MANAGER | Delete project |
| POST | `/projects/:id/members` | MANAGER | Assign a team member to project |
| DELETE | `/projects/:id/members/:userId` | MANAGER | Remove project member |

## 5. Tasks

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/projects/:projectId/tasks` | project member | Create task |
| GET  | `/projects/:projectId/tasks` | project member | List/filter/search/sort tasks |
| GET  | `/tasks/:id` | project member | View task (+comments/attachments) |
| PATCH| `/tasks/:id` | project member | Update fields |
| DELETE | `/tasks/:id` | creator/MANAGER | Delete task |
| PATCH| `/tasks/:id/status` | project member | Mark complete / change status |
| PATCH| `/tasks/:id/assignee` | project member | Assign / unassign user |

**List query parameters** (filter, search, sort):
```
?status=TODO,IN_PROGRESS      filter by status (CSV)
&assignedUserId=<id>          filter by assignee
&priority=HIGH                filter by priority
&dueBefore=2026-07-01         due-date range
&dueAfter=2026-06-01
&q=login                      full-text-ish search over title/description
&sort=dueDate                 sort field (dueDate|createdAt|priority|status)
&order=asc|desc
&page=1&limit=20
```

**Create task request**
```json
{ "title": "Build login", "description": "JWT flow",
  "dueDate": "2026-07-01T00:00:00Z", "priority": "HIGH",
  "assignedUserId": "..." }
```

## 6. Comments

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/tasks/:taskId/comments` | project member | Add comment |
| GET  | `/tasks/:taskId/comments` | project member | List comments (paginated) |
| PATCH| `/comments/:id` | author | Edit own comment |
| DELETE | `/comments/:id` | author/MANAGER | Delete comment |

## 7. Attachments

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/tasks/:taskId/attachments` | project member | Upload file (multipart) |
| GET  | `/tasks/:taskId/attachments` | project member | List attachment metadata |
| GET  | `/attachments/:id/download` | project member | Download bytes |
| DELETE | `/attachments/:id` | uploader/MANAGER | Delete attachment |

Upload constraints: max size (configurable, e.g. 10 MB), allowed MIME allowlist,
filename sanitised, stored under a generated `storageKey`.

## 8. Notifications (designed, deferred)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET  | `/notifications` | ✓ | List own notifications |
| PATCH| `/notifications/:id/read` | owner | Mark read |
| WS   | `/realtime` (Socket.IO) | ✓ | Push: assignment & task-update alerts |

## 9. System

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Liveness/readiness |
| GET | `/docs` | Swagger UI |
| GET | `/openapi.json` | Raw OpenAPI spec |

## 10. Error codes (catalogue)

`VALIDATION_ERROR` (422), `UNAUTHENTICATED` (401), `INVALID_CREDENTIALS` (401),
`TOKEN_EXPIRED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404),
`EMAIL_TAKEN` (409), `ALREADY_MEMBER` (409), `RATE_LIMITED` (429),
`INTERNAL` (500).
