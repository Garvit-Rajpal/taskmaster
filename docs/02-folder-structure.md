# Folder Structure — TaskMaster Backend

> Phase 1 deliverable. Target layout for the GitHub-ready repository.

```
taskmaster/
├── prisma/
│   ├── schema.prisma            # data model + datasource/generator
│   ├── migrations/              # versioned SQL migrations (Prisma Migrate)
│   └── seed.js                  # optional dev seed data
│
├── src/
│   ├── app.js                   # builds & configures the Express app (no listen)
│   ├── server.js                # bootstraps app + graceful shutdown (listen)
│   │
│   ├── config/
│   │   ├── env.js               # reads + Zod-validates process.env
│   │   └── index.js             # typed config object
│   │
│   ├── lib/
│   │   ├── prisma.js            # singleton PrismaClient
│   │   ├── logger.js            # pino instance
│   │   └── storage/             # StorageProvider abstraction (local/S3)
│   │
│   ├── middleware/
│   │   ├── authenticate.js      # verify JWT, attach req.user
│   │   ├── authorize.js         # RBAC + resource-ownership guards
│   │   ├── validate.js          # generic Zod validator (body/params/query)
│   │   ├── rateLimiter.js
│   │   ├── requestContext.js    # request-id + logger child
│   │   └── errorHandler.js      # central error → HTTP mapper (mounted last)
│   │
│   ├── errors/
│   │   └── AppError.js          # AppError + subclasses (NotFound, Forbidden, ...)
│   │
│   ├── utils/
│   │   ├── password.js          # bcrypt hash/compare
│   │   ├── jwt.js               # sign/verify access tokens
│   │   ├── tokens.js            # refresh token generate/hash/rotate helpers
│   │   └── response.js          # success envelope helper
│   │
│   ├── modules/                 # one folder per feature (vertical slices)
│   │   ├── auth/
│   │   │   ├── auth.routes.js
│   │   │   ├── auth.controller.js
│   │   │   ├── auth.service.js
│   │   │   ├── auth.repository.js
│   │   │   └── auth.schema.js    # Zod schemas
│   │   ├── users/
│   │   ├── teams/
│   │   ├── projects/
│   │   ├── tasks/
│   │   ├── comments/
│   │   ├── attachments/
│   │   └── notifications/        # designed; routes thin until realtime phase
│   │
│   ├── routes/
│   │   └── index.js             # mounts module routers under /api/v1
│   │
│   └── docs/
│       ├── openapi.js           # OpenAPI spec assembly
│       └── swagger.js           # serves /docs
│
├── tests/
│   ├── setup.js                 # global test setup (env, db reset hooks)
│   ├── helpers/                 # factories, auth helpers, db truncation
│   ├── unit/                    # service/util tests (mocked repos)
│   └── integration/             # supertest HTTP tests per module
│       ├── auth.test.js
│       ├── users.test.js
│       ├── teams.test.js
│       ├── projects.test.js
│       ├── tasks.test.js
│       ├── comments.test.js
│       └── attachments.test.js
│
├── .env.example
├── .eslintrc.json
├── .prettierrc
├── jest.config.js
├── docker-compose.yml           # local Postgres
├── Dockerfile
├── package.json
└── README.md
```

## Conventions

- **Vertical slices** under `src/modules/*`: each feature owns its routes,
  controller, service, repository and schemas. Adding a feature never requires
  editing another module (Open/Closed Principle).
- **Naming**: `*.routes.js`, `*.controller.js`, `*.service.js`,
  `*.repository.js`, `*.schema.js`. Tests mirror module names.
- **Dependency direction is one-way**: routes → controller → service →
  repository → Prisma. Lower layers never import upward.
- **`app.js` vs `server.js`** are split so Supertest can import the app without
  binding a port.
- **No business logic in controllers**, **no Prisma in services** (only through
  repositories) — enforced by review + lint boundaries.
