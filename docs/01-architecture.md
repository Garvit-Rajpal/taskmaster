# System Architecture — TaskMaster Backend

> Phase 1 deliverable. Planning only. No implementation code yet.

## 1. Overview

TaskMaster is a RESTful backend for task tracking and team collaboration. It exposes
a stateless HTTP API secured with JWT access tokens and database-persisted refresh
tokens (with rotation). It is built as a **layered (n-tier) monolith** organised by
feature module, which keeps the codebase simple to operate while preserving clean
separation of concerns and an easy path to extraction into services later.

```
                         ┌──────────────────────────────────────────┐
   Client (web/mobile)   │              Express App                   │
   ───────────────────►  │                                            │
        HTTPS / JSON      │  ┌─────────────┐  Cross-cutting middleware │
                          │  │  Routes      │  • helmet / cors         │
                          │  └─────┬───────┘  • request-id / logger    │
                          │        ▼          • rate limiter           │
                          │  ┌─────────────┐  • zod validation         │
                          │  │ Controllers │  • auth (JWT verify)      │
                          │  └─────┬───────┘  • RBAC guard             │
                          │        ▼          • error handler (last)   │
                          │  ┌─────────────┐                           │
                          │  │  Services   │  business logic / rules   │
                          │  └─────┬───────┘                           │
                          │        ▼                                   │
                          │  ┌─────────────┐                           │
                          │  │ Repositories│  data access (Prisma)     │
                          │  └─────┬───────┘                           │
                          └────────┼──────────────────────────────────┘
                                   ▼
                          ┌─────────────────┐      ┌──────────────────┐
                          │  PostgreSQL     │      │  File storage    │
                          │  (Prisma)       │      │  (local/S3-ready)│
                          └─────────────────┘      └──────────────────┘
```

## 2. Layered responsibilities

| Layer | Responsibility | Knows about | Must NOT |
|-------|----------------|-------------|----------|
| **Routes** | Map HTTP verb+path to a controller, attach middleware | Express | contain business logic |
| **Controllers** | Parse/validate request, call a service, shape HTTP response | req/res, services | touch Prisma directly |
| **Services** | Business rules, orchestration, authorization decisions, transactions | repositories, domain errors | know about `req`/`res` |
| **Repositories** | Encapsulate all Prisma queries for one aggregate | Prisma client | contain business rules |
| **Validators (Zod)** | Schema-validate input at the edge | Zod | DB |
| **Middleware** | Cross-cutting concerns (auth, errors, logging, rate limit) | Express | feature logic |

This enforces **SOLID**: each layer has a single reason to change (SRP); services
depend on repository **interfaces/abstractions** not Prisma details (DIP); new
features are added as new modules without editing existing ones (OCP).

## 3. Request lifecycle

1. Request hits Express → global middleware (`helmet`, `cors`, JSON body parser,
   request-id, pino HTTP logger, rate limiter).
2. Route matches → route-level middleware runs: **Zod validation** of
   `body`/`params`/`query`, then **`authenticate`** (verify JWT, load user), then
   **`authorize`** (RBAC / resource-ownership guard).
3. Controller invokes a **service** method.
4. Service applies business rules, calls **repositories**, wraps multi-write
   operations in a Prisma transaction, throws typed domain errors on violation.
5. Controller serialises the result into a consistent response envelope.
6. Any thrown error bubbles to the **central error handler** → mapped to an HTTP
   status + standard error body. No stack traces leak in production.

## 4. Technology choices & rationale

| Concern | Choice | Why |
|---------|--------|-----|
| Runtime | Node.js (LTS) | Required; strong async I/O for an API workload |
| Framework | Express.js | Required; minimal, well-understood, huge middleware ecosystem |
| DB | PostgreSQL | Required; relational data (users↔teams↔projects↔tasks) with strong constraints |
| ORM | Prisma | Required; type-safe queries, migrations, transactions |
| AuthN | JWT (access) + DB refresh tokens w/ rotation | Stateless reads + true server-side revocation on logout |
| Hashing | bcrypt | Required; adaptive cost, salted |
| Validation | Zod | Single source of truth for input shapes, infers TS types |
| Testing | Jest + Supertest | Unit + HTTP-level integration; TDD-friendly |
| Docs | OpenAPI / Swagger | Contract-first, browsable `/docs` |
| Config | dotenv + a validated config module | Fail fast on missing env |
| Logging | pino | Fast structured JSON logs, request correlation |
| Lint/format | ESLint + Prettier | Consistency, CI gate |

## 5. Configuration & environments

- All config flows through a single `config` module that **reads `process.env` and
  validates it with Zod at boot**. Missing/invalid env → process exits with a clear
  message (fail fast).
- Three environments: `test` (isolated DB, fast bcrypt rounds), `development`,
  `production`.
- Secrets (JWT secret, DB URL) never committed; `.env.example` documents every key.

## 6. Error model (uniform)

All errors are instances of a small `AppError` hierarchy carrying `statusCode`,
`code`, and `message`. The error middleware converts them to:

```json
{ "error": { "code": "TASK_NOT_FOUND", "message": "Task not found", "details": [] } }
```

Validation failures (Zod) produce `code: "VALIDATION_ERROR"` with a `details` array of
field errors and HTTP 422.

## 7. Scalability & future extraction

- Stateless app tier → horizontally scalable behind a load balancer; refresh-token
  and denylist state lives in Postgres (later movable to Redis).
- Realtime (WebSockets) is **designed now, implemented later**: a `notifications`
  table + an event-emitter seam in the service layer lets us bolt on a Socket.IO
  gateway without touching business logic.
- File attachments use a storage abstraction (`StorageProvider`) with a local-disk
  implementation first and an S3 implementation drop-in later.

## 8. Deployment shape (DevOps-minded)

- Dockerised app + `docker-compose` for local Postgres.
- 12-factor config, health endpoint `GET /health`, graceful shutdown.
- CI: install → lint → `prisma migrate deploy` on a throwaway DB → test → build.
- Migrations are versioned via Prisma Migrate and run as a deploy step, never at
  request time.
