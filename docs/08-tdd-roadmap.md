# Phase 3 — TDD Roadmap

> Build order with, for each feature: the tests to write **first**, endpoints,
> schema changes, and validation rules. Implementation in Phase 4 follows this
> exactly (red → green → refactor per feature).

## Module dependency graph

```
   ┌─────────────────────────────────────────────┐
   │ 0. Foundation (no feature tests yet):         │
   │    config+env, prisma client, app/server,     │
   │    error handler, response envelope, test DB  │
   └───────────────┬───────────────────────────────┘
                   ▼
   1. Auth ──► 2. User Profile
        │
        ▼
   3. Teams ──► 4. Projects ──► 5. Tasks ──► 6. Assignment/Status/Filter
                                   │
                                   ├──► 7. Comments
                                   └──► 8. Attachments
                                            │
                                            ▼
                                   9. Notifications (deferred wiring)
```

Each feature depends only on those above it. Auth tokens and the project-membership
model are prerequisites for nearly everything, so they come first.

---

## Step 0 — Foundation (enablement, test infra)

Not a user feature, but required before any test runs.

- **Build**: `config/env` (Zod-validated), `lib/prisma`, `app.js`/`server.js`,
  `errorHandler`, `validate` middleware, `response` helper, `tests/setup` +
  truncation helper + auth/token factory, `jest.config`, test Postgres via compose.
- **First test**: a smoke integration test — `GET /health` → 200 — to prove the
  harness (app import, DB connect, supertest) works before feature work.

---

## 1. Authentication  (US-1..4)

**Tests to write first** (`tests/integration/auth.test.js`, `tests/unit/*`):
- register: 201 + user(no password)+tokens; password is hashed in DB.
- register duplicate email → 409 `EMAIL_TAKEN`; weak password → 422; bad email → 422.
- login valid → 200+tokens; wrong password → 401 `INVALID_CREDENTIALS`; unknown
  email → 401 (generic).
- refresh valid → rotates (old revoked, new issued); expired → 401; reused old token
  → chain revoked + 401.
- logout revokes refresh; reuse after logout → 401.
- unit: `utils/password` hash≠plain & compare; `utils/tokens` rotation + reuse logic;
  `jwt` sign/verify.

**Endpoints**: `POST /auth/register|login|refresh|logout`.
**Schema changes**: `User`, `RefreshToken` models + migration.
**Validation (Zod)**: email (email, lowercased/trimmed), password (min 8, upper+
lower+digit+symbol or configurable), name (1–80). Refresh/logout require a refresh
token in body.

---

## 2. User Profile  (US-5..7)

**Tests first**:
- `GET /users/me` authed → 200 profile (no password); no token → 401.
- `PATCH /users/me` updates name/avatar; password change requires current password,
  re-hashes, and revokes all refresh tokens; wrong current password → 401/422.
- `GET /users/:id` → limited fields; unknown → 404.

**Endpoints**: `GET /users/me`, `PATCH /users/me`, `GET /users/:id`.
**Schema changes**: none (reuses `User`).
**Validation**: name (1–80), avatarUrl (url, optional), password change object
(`currentPassword`, `newPassword` policy).

---

## 3. Teams  (US-8..12)

**Tests first**:
- create team → 201, creator is `OWNER` membership.
- list → only my teams.
- view/update/delete RBAC: non-member view 403; non-admin update 403; non-owner
  delete 403; unknown 404.
- add member (admin) → 201; duplicate → 409 `ALREADY_MEMBER`; remove member; remove
  owner → 403.
- invite by email → 201 (token+expiry); accept valid → joins; expired/used → 409/410;
  email mismatch → 403; invite existing member → 409.

**Endpoints**: `POST/GET /teams`, `GET/PATCH/DELETE /teams/:id`,
`POST/DELETE /teams/:id/members[/:userId]`, `POST /teams/:id/invitations`,
`POST /invitations/:token/accept`.
**Schema changes**: `Team`, `TeamMembership` (unique userId+teamId, role enum),
`Invitation` (unique token, status enum, expiresAt) + migration.
**Validation**: team name (1–80), description optional; member add (userId uuid,
role enum); invite (email, role enum).

---

## 4. Projects  (US-13..15)

**Tests first**:
- team member creates project → 201, creator is `MANAGER`; non-team-member → 403.
- list team projects (team members); view (project members) ; update/delete
  (`MANAGER`) → others 403.
- assign team member to project → 201; assign non-team-member → 422; duplicate → 409.

**Endpoints**: `POST/GET /teams/:teamId/projects`, `GET/PATCH/DELETE /projects/:id`,
`POST/DELETE /projects/:id/members[/:userId]`.
**Schema changes**: `Project` (teamId FK), `ProjectMembership` (unique userId+
projectId, role enum) + migration.
**Validation**: project name (1–80), description optional; member add (userId uuid,
role enum) + service check "user is a team member".

---

## 5. Tasks (CRUD)  (US-16, US-17)

**Tests first**:
- project member creates task → 201 (defaults TODO/MEDIUM, createdById=me);
  non-member → 403; empty title → 422; assignee-not-in-project → 422.
- view (member) → 200 with comments/attachments arrays; unknown → 404.
- update fields → 200, `updatedAt` changes; non-member → 403.
- delete by creator/MANAGER → 204; by ordinary member → 403.

**Endpoints**: `POST /projects/:projectId/tasks`, `GET/PATCH/DELETE /tasks/:id`.
**Schema changes**: `Task` (status/priority enums, FKs, indexes on projectId/
assignedUserId/status/dueDate) + migration.
**Validation**: title (1–140), description optional, dueDate (ISO datetime optional),
priority enum, assignedUserId uuid optional.

---

## 6. Assignment, Status, Filter/Search/Sort  (US-18, US-19, US-20)

**Tests first**:
- `PATCH /tasks/:id/status` valid → persists; invalid value → 422; non-member → 403.
- `PATCH /tasks/:id/assignee` sets/clears; assignee not in project → 422; (designed)
  creates `TASK_ASSIGNED` notification row.
- list: filter by status (CSV), assignedUserId, priority, dueBefore/dueAfter;
  search `q`; sort by allowed fields + order; pagination `meta`; invalid sort/date
  → 422; empty → 200 [].

**Endpoints**: `PATCH /tasks/:id/status`, `PATCH /tasks/:id/assignee`,
`GET /projects/:projectId/tasks` (query params).
**Schema changes**: none (uses Task indexes); Notification row optional this step.
**Validation**: status enum; assignee uuid|null; query schema (status CSV→enum[],
dates ISO, sort in allowlist, order in {asc,desc}, page/limit positive ints with
caps).

---

## 7. Comments  (US-21)

**Tests first**:
- member adds comment → 201; empty body → 422; non-member → 403.
- list paginated newest-first.
- author edits/deletes own; non-author edit → 403; MANAGER deletes any.

**Endpoints**: `POST/GET /tasks/:taskId/comments`, `PATCH/DELETE /comments/:id`.
**Schema changes**: `Comment` (taskId, authorId FKs, index taskId) + migration.
**Validation**: body (1–2000).

---

## 8. Attachments  (US-22)

**Tests first**:
- member uploads (multipart) → 201 metadata; bytes persisted via storage provider.
- oversize → 413/422; disallowed MIME → 422; filename sanitised.
- list metadata; download (member) → 200 stream; non-member → 403.
- uploader/MANAGER deletes → 204 and bytes removed; others → 403.

**Endpoints**: `POST/GET /tasks/:taskId/attachments`,
`GET /attachments/:id/download`, `DELETE /attachments/:id`.
**Schema changes**: `Attachment` (taskId, uploadedById, filename, mimeType,
sizeBytes, storageKey; index taskId) + migration; `StorageProvider` (local impl).
**Validation**: multipart file required; size cap + MIME allowlist enforced in
middleware/service.

---

## 9. Notifications  (US-23 — designed, minimal wiring)

**Tests first (light)**:
- assigning a task / adding a comment creates a `Notification` row for the target.
- `GET /notifications` returns mine; `PATCH /notifications/:id/read` marks read;
  marking others' → 403.

**Endpoints**: `GET /notifications`, `PATCH /notifications/:id/read`
(WS `/realtime` deferred to a later realtime phase).
**Schema changes**: `Notification` (userId, type enum, payload json, readAt, index
userId) + migration. An event-emitter seam in services feeds future Socket.IO.
**Validation**: notification id uuid; read has no body.

---

## Cross-feature test conventions

- Each feature's suite asserts the global NFRs (401 without token, 422 on bad input,
  403 default-deny, standard envelopes, pagination where applicable).
- Negative paths from Phase 2 edge cases are mandatory, not optional.
- Migrations are added with the feature that needs them and run on the test DB before
  that suite.
