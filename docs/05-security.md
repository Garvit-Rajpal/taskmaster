# Security Design — TaskMaster

> Phase 1 deliverable.

## 1. Authentication: JWT access + DB-persisted refresh (rotation)

- **Access token**: short-lived JWT (e.g. 15 min), signed HS256 with
  `JWT_ACCESS_SECRET`. Payload: `sub` (userId), `iat`, `exp`. Verified statelessly
  on every protected request.
- **Refresh token**: long-lived (e.g. 7 days), **persisted in `RefreshToken`** with
  only its **hash** stored (sha-256). The raw token goes to the client.
- **Rotation**: each `/auth/refresh` call:
  1. hash the presented token, look it up;
  2. reject if missing, expired, or already `revokedAt` set
     (→ possible reuse/theft: revoke the whole chain for that user);
  3. mark the row `revokedAt`, set `replacedByTokenId`;
  4. issue a brand-new refresh token row + a fresh access token.
- **Logout**: revoke the presented refresh token's row (`revokedAt = now`). Access
  token remains valid until its short expiry — acceptable given 15-min window;
  optional access denylist can be added if instant kill is required.

This satisfies the chosen "session/refresh in DB with rotation" strategy: true
server-side revocation, reuse detection, and horizontal scalability.

## 2. Password handling

- bcrypt with a configurable cost factor (e.g. 12 in prod, low in `test` for speed).
- Passwords never logged, never returned in any response (excluded at the
  serializer/repository select level).
- Password policy enforced by Zod: min length, complexity; checked on register and
  password change. Changing password revokes all refresh tokens.

## 3. Authorization (RBAC + ownership)

- Two guard styles, both in the `authorize` middleware / service checks:
  - **Role-based**: team roles (`OWNER/ADMIN/MEMBER`), project roles
    (`MANAGER/MEMBER`).
  - **Resource-ownership**: e.g. only a comment's author (or a project MANAGER) may
    edit/delete it.
- Authorization decisions live in the **service layer** (so they are unit-testable)
  with middleware doing coarse gating. Default-deny: if no rule grants access, 403.

## 4. Input validation & injection defense

- Every endpoint validates `body`, `params`, `query` with **Zod** before the
  controller runs → consistent 422 errors, no unvalidated data reaches services.
- Prisma parameterises all queries (no string-built SQL) → SQL-injection safe.
- File uploads: MIME allowlist, size cap, filename sanitisation, randomised
  `storageKey` (no user-controlled paths).

## 5. Transport & HTTP hardening

- `helmet` for secure headers; `cors` with an explicit origin allowlist.
- HTTPS assumed at the edge (load balancer / reverse proxy).
- Body size limits on JSON and multipart.
- **Rate limiting**: global + stricter limits on `/auth/login` and
  `/auth/register` to blunt brute-force/credential-stuffing (429 `RATE_LIMITED`).

## 6. Secrets & configuration

- All secrets via env, validated at boot; `.env` git-ignored, `.env.example`
  documents keys. Separate secrets per environment.
- No secrets, tokens, or password hashes in logs.

## 7. Error & data-leak hygiene

- Central error handler returns generic messages for 500s; stack traces only in
  non-production logs. Typed `AppError`s carry safe, client-facing messages.
- Consistent 404 vs 403 policy to avoid resource-existence leakage where it matters.

## 8. Auditing & observability (baseline)

- Structured request logs with a correlation `request-id`.
- Security-relevant events (login success/failure, token reuse detected, role
  changes) logged at appropriate levels for later SIEM ingestion.

## 9. Threats considered (lightweight STRIDE)

| Threat | Mitigation |
|--------|------------|
| Credential stuffing / brute force | rate limit, bcrypt, generic auth errors |
| Token theft / replay | short access TTL, refresh rotation + reuse detection |
| Privilege escalation | default-deny RBAC, ownership checks in services |
| Injection | Prisma params + Zod validation |
| Sensitive data exposure | password never serialized, secret hygiene |
| DoS via large uploads | size caps, rate limits |
| IDOR (guessing IDs) | UUID ids + per-resource authorization |
