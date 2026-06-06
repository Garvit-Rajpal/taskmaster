# Phase 2 — User Stories, Requirements & Acceptance Criteria

> Maps every user story to acceptance criteria, edge cases, APIs, and DB entities.
> Story IDs (`US-x`) are referenced by the Phase 3 TDD roadmap and Phase 4 tests.

## A. Non-Functional Requirements (apply to all stories)

| ID | Requirement |
|----|-------------|
| NFR-1 | All write/read of protected resources require a valid access token (401 otherwise). |
| NFR-2 | Every input is Zod-validated; invalid input → 422 with field-level `details`. |
| NFR-3 | Authorization is default-deny; unauthorized access → 403, not 200. |
| NFR-4 | Passwords stored as bcrypt hashes; never returned or logged. |
| NFR-5 | Responses use the standard success/error envelope; list endpoints paginate. |
| NFR-6 | p95 latency for simple reads < 200ms on indexed queries; N+1 avoided. |
| NFR-7 | Auth endpoints are rate-limited; brute force returns 429. |
| NFR-8 | Every feature ships with tests written first; coverage gate ≥ 85%. |
| NFR-9 | API documented in OpenAPI; `/docs` served. |
| NFR-10 | Idempotent verbs behave idempotently; no partial writes (transactions). |

---

## B. Authentication & User Management

### US-1 — Register
*As a visitor, I want to create an account so I can use the platform.*

**Acceptance criteria**
- Given a unique email + valid name + policy-compliant password, when I POST
  `/auth/register`, then I get 201 with my user (no password) and access+refresh tokens.
- The stored password is a bcrypt hash.

**Edge cases**: duplicate email → 409 `EMAIL_TAKEN`; weak/short password → 422;
invalid email format → 422; missing fields → 422; email is normalized (lowercase/trim).

**APIs**: `POST /auth/register` · **Entities**: `User`, `RefreshToken`.

### US-2 — Login
*As a user, I want to log in to receive tokens.*

**AC**: valid credentials → 200 + access+refresh tokens; access token verifies and
identifies me.
**Edge**: wrong password → 401 `INVALID_CREDENTIALS`; unknown email → 401 (same
generic message, no user enumeration); rate limit after N failures → 429.
**APIs**: `POST /auth/login` · **Entities**: `User`, `RefreshToken`.

### US-3 — Refresh token (rotation)
*As a user, I want to refresh my session without re-entering credentials.*

**AC**: valid refresh token → 200 with a new access + new refresh token; the old
refresh token is revoked.
**Edge**: expired token → 401 `TOKEN_EXPIRED`; revoked/unknown token → 401; reuse of
an already-rotated token → revoke entire token chain for that user + 401.
**APIs**: `POST /auth/refresh` · **Entities**: `RefreshToken`.

### US-4 — Logout
*As a user, I want to log out so my refresh token can no longer be used.*

**AC**: presented refresh token's row is revoked; a later refresh with it → 401.
**Edge**: already-revoked/unknown token → 401 (idempotent-ish, no leak).
**APIs**: `POST /auth/logout` · **Entities**: `RefreshToken`.

### US-5 — View own profile
**AC**: authenticated GET `/users/me` → 200 with my profile (no password).
**Edge**: no/invalid token → 401.
**APIs**: `GET /users/me` · **Entities**: `User`.

### US-6 — Update own profile
**AC**: PATCH `/users/me` updates name/avatarUrl; changing password requires current
password and re-hashes; password change revokes all my refresh tokens.
**Edge**: wrong current password → 401/422; invalid avatar URL → 422; cannot change
email to an existing one → 409.
**APIs**: `PATCH /users/me` · **Entities**: `User`, `RefreshToken`.

### US-7 — View another user
**AC**: GET `/users/:id` returns limited public fields (id, name, avatar).
**Edge**: unknown id → 404; password/email never exposed.
**APIs**: `GET /users/:id` · **Entities**: `User`.

---

## C. Teams

### US-8 — Create team
**AC**: POST `/teams` creates a team; creator becomes `OWNER` via a TeamMembership.
**Edge**: missing name → 422.
**APIs**: `POST /teams` · **Entities**: `Team`, `TeamMembership`.

### US-9 — List my teams
**AC**: GET `/teams` returns only teams I'm a member of.
**APIs**: `GET /teams` · **Entities**: `Team`, `TeamMembership`.

### US-10 — View / update / delete team
**AC**: members can view; `OWNER/ADMIN` can update; only `OWNER` can delete.
**Edge**: non-member view → 403; non-admin update → 403; non-owner delete → 403;
unknown id → 404.
**APIs**: `GET/PATCH/DELETE /teams/:id` · **Entities**: `Team`, `TeamMembership`.

### US-11 — Add / remove team members
**AC**: `OWNER/ADMIN` can add an existing user (role MEMBER/ADMIN) and remove members.
**Edge**: adding an existing member → 409 `ALREADY_MEMBER`; removing the owner →
403; non-admin → 403.
**APIs**: `POST /teams/:id/members`, `DELETE /teams/:id/members/:userId` ·
**Entities**: `TeamMembership`.

### US-12 — Invite members by email
**AC**: `OWNER/ADMIN` creates an invitation with a unique token + expiry; invitee can
accept to join.
**Edge**: invite already-member → 409; expired/used token on accept → 410/409;
accepting someone else's invite email mismatch → 403.
**APIs**: `POST /teams/:id/invitations`, `POST /invitations/:token/accept` ·
**Entities**: `Invitation`, `TeamMembership`.

---

## D. Projects

### US-13 — Create project under a team
**AC**: a team member POSTs to `/teams/:teamId/projects`; project is linked to the
team; creator becomes project `MANAGER`.
**Edge**: non-team-member → 403; missing name → 422; unknown team → 404.
**APIs**: `POST /teams/:teamId/projects` · **Entities**: `Project`,
`ProjectMembership`.

### US-14 — List / view / update / delete project
**AC**: team members list; project members view; `MANAGER` updates/deletes.
**Edge**: non-member → 403; unknown → 404.
**APIs**: `GET /teams/:teamId/projects`, `GET/PATCH/DELETE /projects/:id` ·
**Entities**: `Project`, `ProjectMembership`.

### US-15 — Assign users to a project
**AC**: `MANAGER` adds a **team member** to the project; can remove members.
**Edge**: assigning a non-team-member → 422/403; duplicate → 409.
**APIs**: `POST /projects/:id/members`, `DELETE /projects/:id/members/:userId` ·
**Entities**: `ProjectMembership`, `TeamMembership`.

---

## E. Tasks

### US-16 — Create task
**AC**: a project member creates a task under a project with title (required),
optional description/dueDate/priority/assignee; defaults status `TODO`,
priority `MEDIUM`; `createdById` = me.
**Edge**: non-project-member → 403; assignee not a project member → 422; dueDate in
the past allowed but flagged by validation? (allowed); title empty → 422.
**APIs**: `POST /projects/:projectId/tasks` · **Entities**: `Task`.

### US-17 — View / update / delete task
**AC**: project members view & update fields; creator or `MANAGER` may delete.
**Edge**: non-member → 403; unknown → 404; delete by ordinary member (non-creator) →
403.
**APIs**: `GET/PATCH/DELETE /tasks/:id` · **Entities**: `Task`.

### US-18 — Mark task complete / change status
**AC**: PATCH `/tasks/:id/status` to `TODO|IN_PROGRESS|DONE` persists and updates
`updatedAt`.
**Edge**: invalid status value → 422; non-member → 403.
**APIs**: `PATCH /tasks/:id/status` · **Entities**: `Task`.

### US-19 — Assign / reassign task
**AC**: PATCH `/tasks/:id/assignee` sets/clears `assignedUserId`; assignee must be a
project member; (designed) triggers a `TASK_ASSIGNED` notification.
**Edge**: assignee not in project → 422; assign to null clears it.
**APIs**: `PATCH /tasks/:id/assignee` · **Entities**: `Task`, `Notification`.

### US-20 — List, filter, search, sort tasks
**AC**: GET `/projects/:projectId/tasks` supports filter (`status`, `assignedUserId`,
`priority`, `dueBefore/dueAfter`), search (`q` over title/description), sort
(`sort`+`order`), and pagination; returns `meta` with totals.
**Edge**: invalid sort field → 422; bad date format → 422; empty result → 200 with
empty array; CSV status filter parsed correctly.
**APIs**: `GET /projects/:projectId/tasks` · **Entities**: `Task`.

---

## F. Collaboration

### US-21 — Comment on a task
**AC**: project member POSTs a comment; lists are paginated newest-first; author can
edit/delete own; `MANAGER` can delete any.
**Edge**: empty body → 422; non-member → 403; editing others' comment → 403.
**APIs**: `POST/GET /tasks/:taskId/comments`, `PATCH/DELETE /comments/:id` ·
**Entities**: `Comment`.

### US-22 — Attach a file to a task
**AC**: project member uploads (multipart); metadata stored, bytes in storage;
members list & download; uploader or `MANAGER` deletes (also removes bytes).
**Edge**: oversize → 413/422; disallowed MIME → 422; download by non-member → 403;
filename sanitised.
**APIs**: `POST/GET /tasks/:taskId/attachments`,
`GET /attachments/:id/download`, `DELETE /attachments/:id` ·
**Entities**: `Attachment`.

---

## G. Notifications & Realtime (designed, deferred to post-core phase)

### US-23 — Receive notifications
**AC (design)**: assignment, task-update, and comment events create `Notification`
rows; `GET /notifications` lists mine; `PATCH /notifications/:id/read` marks read; a
Socket.IO `/realtime` channel pushes live alerts.
**Edge**: mark-read on someone else's notification → 403.
**APIs**: `GET /notifications`, `PATCH /notifications/:id/read`, `WS /realtime` ·
**Entities**: `Notification`.

---

## H. Story → API → Entity traceability (summary)

| Story | Primary API(s) | Entities |
|-------|----------------|----------|
| US-1..4 | `/auth/*` | User, RefreshToken |
| US-5..7 | `/users/*` | User |
| US-8..12 | `/teams/*`, `/invitations/*` | Team, TeamMembership, Invitation |
| US-13..15 | `/teams/:id/projects`, `/projects/*` | Project, ProjectMembership |
| US-16..20 | `/projects/:id/tasks`, `/tasks/*` | Task |
| US-21 | `/tasks/:id/comments`, `/comments/*` | Comment |
| US-22 | `/tasks/:id/attachments`, `/attachments/*` | Attachment |
| US-23 | `/notifications/*`, `/realtime` | Notification |
