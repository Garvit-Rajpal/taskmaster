# Testing Strategy (TDD) — TaskMaster

> Phase 1 deliverable. Defines how we satisfy the "tests-before-code" mandate.

## 1. Philosophy

Strict **red → green → refactor** for every feature. No production code is written
until a failing test demands it. Each Phase-4 feature follows: write failing test →
show it fails → implement minimal code → show it passes → refactor.

## 2. Test pyramid

```
        ┌───────────────────────────┐
        │   Integration (Supertest) │  ← majority of behavior coverage
        │  real HTTP → app → real DB │     (test Postgres, migrations applied)
        ├───────────────────────────┤
        │      Unit (Jest)          │  ← services/utils with mocked repos
        │  business rules, edge cases│     (pure, fast)
        └───────────────────────────┘
```

- **Integration tests** are the backbone: they exercise routes → controllers →
  services → repositories → a **real test Postgres**, asserting status codes,
  response envelopes, and DB side-effects. This catches wiring, validation, auth,
  and SQL behavior that mocks would hide.
- **Unit tests** cover branch-heavy business logic and utilities (password hashing,
  token rotation logic, authorization decision functions) with repositories mocked.

## 3. Tooling & setup

- **Jest** runner + **Supertest** for HTTP. `app.js` is imported directly (no port
  bind).
- A dedicated **test database** (`DATABASE_URL` pointing at a `taskmaster_test` DB,
  isolated via `docker-compose`). Migrations applied before the suite.
- **Isolation**: truncate all tables (or wrap each test in a transaction rollback)
  between tests via a `tests/helpers` utility, so tests are order-independent.
- **Factories/fixtures**: helpers to create users, teams, projects, tasks and to
  obtain auth tokens quickly.
- bcrypt cost lowered in `test` for speed; time-based logic (token expiry) uses
  injectable clock or short TTLs.

## 4. What each layer's tests validate

| Test type | Validates |
|-----------|-----------|
| Integration | endpoint exists, correct status, auth required, RBAC enforced, validation errors (422), DB persisted correctly, pagination/filter/sort correct, error envelopes |
| Unit | business rules (e.g. can't assign non-member), token rotation/reuse detection, password policy, authorization decision functions |

## 5. Coverage targets & quality gates

- Line/branch coverage gate (e.g. ≥ 85% on services + controllers).
- CI fails on: lint errors, formatting drift, any failing test, coverage below gate.
- Every bug fix starts with a regression test that reproduces it.

## 6. Test ordering (mirrors TDD roadmap)

1. Auth (register/login/refresh/logout) — foundation, everything else needs tokens.
2. User profile (me / update).
3. Teams (+ membership, invitations).
4. Projects (+ membership).
5. Tasks (CRUD).
6. Task assignment, status, filter/search/sort.
7. Comments.
8. Attachments (upload/download/limits).
9. Notifications (designed; minimal tests until realtime phase).

## 7. Representative test cases (per feature, abbreviated)

**Auth**
- register: 201 + tokens; duplicate email → 409 `EMAIL_TAKEN`; weak password → 422.
- login: valid → 200 + tokens; wrong password → 401 `INVALID_CREDENTIALS`.
- refresh: valid rotates token; reused old token → revokes chain + 401.
- logout: revokes refresh; subsequent refresh with it → 401.

**Tasks**
- create requires project membership (non-member → 403).
- list supports `status`, `assignedUserId`, `q`, `sort`, pagination.
- update status to DONE persists; assign to non-project-member → 422/403.
- delete by non-creator/non-manager → 403.

**Comments / Attachments**
- only author edits own comment; oversized upload → 413/422; bad MIME → 422.

## 8. Definition of Done (per feature)

A feature is "done" only when: tests written first and now green, validation +
authorization covered, error cases tested, lint/format clean, OpenAPI updated, and
coverage gate met.
