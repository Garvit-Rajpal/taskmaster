# Task Tracker & Team Collaboration — Backend

A production-ready REST API for teams, projects, tasks, comments, file attachments, and in-app notifications. Built with Node.js and Express, persisted in PostgreSQL via Prisma, and developed entirely **test-first** (red → green → refactor) against a real database.

- **123 integration tests**, all green, exercising every endpoint against an embedded PostgreSQL instance.
- **Coverage:** statements 96.9%, branches 79.1%, functions 97.9%, lines 98.0%.
- **Interactive docs:** Swagger UI at `/docs`, raw OpenAPI 3 at `/docs.json`.

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [npm scripts](#npm-scripts)
- [Testing](#testing)
- [API overview](#api-overview)
- [Authentication & authorization](#authentication--authorization)
- [Conventions](#conventions)
- [Design decisions](#design-decisions)
- [Further documentation](#further-documentation)
- [Roadmap: Generative AI feature](#roadmap-generative-ai-feature)

---

## Features

- **Auth** — registration, login, JWT access tokens, and database-persisted refresh tokens with rotation and reuse detection. Logout revokes a token; a password change revokes them all.
- **Users** — view and edit your own profile (including password change), and view other users' public profiles.
- **Teams** — create teams, manage members, and invite people by email with token-based acceptance. Role hierarchy: `OWNER` → `ADMIN` → `MEMBER`.
- **Projects** — created under a team, with their own member list and roles (`MANAGER`, `MEMBER`).
- **Tasks** — full CRUD plus dedicated status and assignee endpoints, with filtering (status, priority, assignee, due-date range, free-text search), sorting, and pagination.
- **Comments** — threaded discussion on tasks, editable by the author and deletable by the author or a project manager.
- **Attachments** — file upload/download with a pluggable storage abstraction, MIME allowlist, and size limit.
- **Notifications** — generated on task assignment and new comments; listable and markable-as-read by the recipient.

## Tech stack

| Concern         | Choice                                            |
| --------------- | ------------------------------------------------- |
| Runtime         | Node.js (>= 18)                                   |
| Web framework   | Express 4                                         |
| Database        | PostgreSQL                                         |
| ORM             | Prisma (with `@prisma/adapter-pg` driver adapter) |
| Auth            | JWT (`jsonwebtoken`) + `bcryptjs`                 |
| Validation      | Zod                                               |
| Docs            | OpenAPI 3 + `swagger-ui-express`                  |
| Testing         | Jest + Supertest (embedded PostgreSQL)            |
| Security        | `helmet`, `cors`, `express-rate-limit`            |
| Logging         | `pino` / `pino-http`                              |
| Lint / format   | ESLint + Prettier                                 |

## Architecture

A layered monolith organized into **vertical feature slices**. Each request flows through clear, single-responsibility layers:

```
HTTP → Route → Validate (Zod) → Authenticate → Controller → Service → Repository → Prisma → PostgreSQL
                                                     │
                                                     └── emits events → Notifications
```

- **Routes** declare endpoints and attach middleware (auth, validation, upload).
- **Controllers** translate HTTP to/from service calls and shape the response envelope.
- **Services** hold business rules and authorization (existence checks before permission checks).
- **Repositories** are the only layer that talks to Prisma, keeping data access isolated and mockable.
- A lightweight **event bus** (`src/lib/events.js`) decouples side-effects (notifications today, real-time push later).

This separation follows SOLID: controllers depend on service abstractions, services depend on repository abstractions, and each layer is independently testable.

## Project structure

```
src/
  app.js                 # Express app assembly (helmet, cors, docs, routes, error handler)
  server.js              # HTTP bootstrap
  config/                # Env parsing & validation (fail-fast)
  docs/                  # OpenAPI spec + Swagger UI mount
  errors/                # AppError hierarchy
  lib/                   # prisma client, event bus, storage, logger
  middleware/            # authenticate, validate, upload, rateLimiter, errorHandler
  modules/               # Feature slices: auth, users, teams, projects, tasks,
                         #   comments, attachments, notifications
                         #   (each: routes / controller / service / repository / schema)
  routes/                # Top-level router wiring
  utils/                 # jwt, password, tokens, response helpers
prisma/
  schema.prisma          # Data model
tests/
  integration/           # One suite per feature (Supertest)
  helpers/               # Test data factories
  *.js                   # Embedded-Postgres setup/teardown, schema, fixtures
docs/                    # Design docs (architecture, ERD, security, TDD roadmap, …)
```

## Getting started

### Prerequisites

- Node.js >= 18
- PostgreSQL 14+ (a reachable instance for development/production; tests use their own embedded database)

### Install

```bash
npm install
cp .env.example .env      # then edit values, especially DATABASE_URL and JWT_ACCESS_SECRET
```

### Set up the database

```bash
npm run prisma:generate   # generate the Prisma client
npm run prisma:migrate    # apply migrations to your dev database
```

### Run

```bash
npm run dev               # start the server (default http://localhost:3000)
```

Then open:

- `http://localhost:3000/health` — liveness check
- `http://localhost:3000/docs` — interactive Swagger UI
- `http://localhost:3000/docs.json` — raw OpenAPI document

## Environment variables

All variables are validated at boot; the process fails fast on anything missing or malformed. See `.env.example` for a ready-to-copy template.

| Variable               | Required | Default                          | Description                                            |
| ---------------------- | -------- | -------------------------------- | ------------------------------------------------------ |
| `NODE_ENV`             | no       | `development`                    | `development` \| `test` \| `production`                |
| `PORT`                 | no       | `3000`                           | HTTP port                                              |
| `DATABASE_URL`         | **yes**  | —                                | PostgreSQL connection string                           |
| `JWT_ACCESS_SECRET`    | **yes**  | —                                | Secret for signing access tokens                       |
| `JWT_ACCESS_TTL`       | no       | `15m`                            | Access-token lifetime                                  |
| `JWT_REFRESH_TTL_DAYS` | no       | `7`                              | Refresh-token lifetime (days)                          |
| `INVITE_TTL_DAYS`      | no       | `7`                              | Invitation validity (days)                             |
| `BCRYPT_ROUNDS`        | no       | `12`                             | bcrypt cost factor                                     |
| `UPLOAD_DIR`           | no       | `./uploads`                      | Local attachment storage root                          |
| `MAX_UPLOAD_BYTES`     | no       | `10485760` (10 MB)               | Max attachment size                                    |
| `ALLOWED_MIME`         | no       | png, jpeg, gif, pdf, plain text  | Comma-separated MIME allowlist                         |
| `CORS_ORIGINS`         | no       | `*`                              | `*` or comma-separated allowed origins                 |

## npm scripts

| Script                  | Purpose                                  |
| ----------------------- | ---------------------------------------- |
| `npm run dev`           | Start the server                         |
| `npm start`             | Start the server (production entry)      |
| `npm test`              | Run the full Jest suite (serial)         |
| `npm run test:coverage` | Run tests with a coverage report         |
| `npm run prisma:generate` | Generate the Prisma client             |
| `npm run prisma:migrate`  | Apply migrations (dev)                  |
| `npm run prisma:deploy`   | Apply migrations (production)           |
| `npm run lint`          | ESLint                                   |
| `npm run format`        | Prettier (write)                         |

## Testing

The project was built test-first: every feature began with a failing integration suite before any implementation. Tests run against a **real, embedded PostgreSQL** instance (not mocks), so query behavior, constraints, and cascades are all exercised exactly as in production. Tables are truncated between tests for isolation.

```bash
npm test                  # all suites, run serially
npm run test:coverage     # with coverage report
```

Current result: **9 suites, 123 tests, all passing**, with coverage well above thresholds (lines/statements 80%, branches 65%, functions 80%). The generated Prisma client is excluded from coverage collection.

### Coverage report

`npm run test:coverage` regenerates a full report under `coverage/`:

- `coverage/index.html` — interactive, file-by-file HTML report (open in a browser for line-level highlighting).
- `coverage/lcov.info` — LCOV data for CI and editor plugins.
- `coverage/coverage-summary.json` — machine-readable totals.

The `coverage/` directory is **gitignored** (it's a build artifact regenerated from the tests), so it won't be committed. Run `npm run test:coverage` locally any time you want to view it.

## API overview

Base path: **`/api/v1`**. Full request/response schemas live in the OpenAPI document (`/docs`).

| Area          | Endpoints (abbreviated)                                                                 |
| ------------- | -------------------------------------------------------------------------------------- |
| Auth          | `POST /auth/register` · `/auth/login` · `/auth/refresh` · `/auth/logout`               |
| Users         | `GET/PATCH /users/me` · `GET /users/:id`                                                |
| Teams         | `POST/GET /teams` · `GET/PATCH/DELETE /teams/:id` · members · `POST /teams/:id/invitations` |
| Invitations   | `POST /invitations/:token/accept`                                                      |
| Projects      | `POST/GET /teams/:teamId/projects` · `GET/PATCH/DELETE /projects/:id` · members         |
| Tasks         | `POST/GET /projects/:projectId/tasks` · `GET/PATCH/DELETE /tasks/:id` · `/status` · `/assignee` |
| Comments      | `POST/GET /tasks/:taskId/comments` · `PATCH/DELETE /comments/:id`                        |
| Attachments   | `POST/GET /tasks/:taskId/attachments` · `GET /attachments/:id/download` · `DELETE /attachments/:id` |
| Notifications | `GET /notifications` · `PATCH /notifications/:id/read`                                   |

## Authentication & authorization

- **Access tokens** are short-lived JWTs sent as `Authorization: Bearer <token>`.
- **Refresh tokens** are opaque, stored in the database as SHA-256 hashes, and **rotated** on every refresh. Presenting a previously-used (rotated) token is treated as reuse and triggers revocation.
- **RBAC** is default-deny. Team roles (`OWNER` > `ADMIN` > `MEMBER`) and project roles (`MANAGER`, `MEMBER`) gate sensitive actions. Ownership checks (e.g. only a comment's author can edit it) are enforced in the service layer.
- Existence is checked before permission, so callers get a `404` for things that don't exist and a `403` only for things they may not touch.

## Conventions

**Success envelope**

```json
{ "data": { /* resource */ }, "meta": { "page": 1, "limit": 20, "total": 42, "totalPages": 3 } }
```

`meta` is present on paginated list responses.

**Error envelope**

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Request validation failed", "details": [ { "field": "body.email", "message": "Invalid email" } ] } }
```

Common status codes: `400` validation, `401` unauthenticated, `403` forbidden, `404` not found, `409` conflict, `410` expired invite, `413` file too large, `422` semantically invalid.

## Design decisions

- **Repository pattern** keeps Prisma in one layer, so services stay persistence-agnostic and unit-testable.
- **Driver adapter + Zod-validated config** make the app explicit about its dependencies and fail fast on misconfiguration.
- **DB-persisted refresh tokens with rotation** were chosen over stateless refresh so sessions can be revoked (logout, password change, reuse detection) — a deliberate trade of a little statefulness for real security control.
- **Event bus seam** lets notifications run synchronously today while leaving a clean insertion point for Socket.IO / async delivery without touching business logic.
- **Storage abstraction** wraps the local filesystem behind a small interface, so swapping in S3 later is a one-file change.
- **Tests hit a real database** because mocked persistence hides constraint, cascade, and migration bugs — exactly the class of failure that's expensive in production.

## Further documentation

The `docs/` directory contains the design artifacts produced during development:

- `01-architecture.md` — system architecture
- `02-folder-structure.md` — code organization
- `03-database-erd.md` — data model and relationships
- `04-api-design.md` — endpoint and contract design
- `05-security.md` — auth, RBAC, and hardening
- `06-testing-strategy.md` — TDD approach
- `07-user-stories.md` — requirements as user stories
- `08-tdd-roadmap.md` — feature-by-feature build order

