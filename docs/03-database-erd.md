# Database ERD & Prisma Schema Design — TaskMaster

> Phase 1 deliverable. Design only — the real `prisma/schema.prisma` is written in
> Phase 4, test-first.

## 1. Entity-Relationship Diagram

```
┌────────────┐         ┌──────────────────┐        ┌────────────┐
│   User     │1       *│  TeamMembership  │*       1│   Team     │
│────────────│─────────│──────────────────│─────────│────────────│
│ id (uuid)  │         │ id               │         │ id         │
│ email (UQ) │         │ userId  (FK)     │         │ name       │
│ password   │         │ teamId  (FK)     │         │ description│
│ name       │         │ role  (enum)     │         │ ownerId(FK)│
│ avatarUrl  │         │ createdAt        │         │ createdAt  │
│ createdAt  │         └──────────────────┘         │ updatedAt  │
│ updatedAt  │            (UQ: userId+teamId)        └─────┬──────┘
└─────┬──────┘                                            │1
      │1                                                  │
      │                                                   │*
      │                                            ┌──────────────┐
      │                                            │   Project    │
      │                                            │──────────────│
      │                                            │ id           │
      │                                            │ name         │
      │                                            │ description  │
      │                                            │ teamId  (FK) │
      │                                            │ createdById  │
      │                                            │ createdAt    │
      │                                            │ updatedAt    │
      │                                            └──────┬───────┘
      │                                                   │1
      │              ┌──────────────────┐                 │*
      │             *│ ProjectMembership│           ┌───────────────┐
      │              │──────────────────│          *│     Task      │
      │              │ id               │           │───────────────│
      │              │ userId  (FK)     │           │ id            │
      │              │ projectId (FK)   │           │ title         │
      │              │ role  (enum)     │           │ description   │
      │              │ createdAt        │           │ dueDate       │
      │              └──────────────────┘           │ status (enum) │
      │               (UQ: userId+projectId)        │ priority(enum)│
      │                                             │ projectId(FK) │
      │   assignedTasks (1─*) ◄─────────────────────│ assignedUserId│
      │   createdTasks  (1─*) ◄─────────────────────│ createdById   │
      │                                             │ createdAt     │
      │                                             │ updatedAt     │
      │                                             └──────┬────────┘
      │                                                    │1
      │                          ┌──────────────┐          │*
      │                         *│   Comment    │──────────┤
      │ ◄───────────────────────│──────────────│          │
      │  author (1─*)            │ id           │          │
      │                          │ body         │          │
      │                          │ taskId  (FK) │          │
      │                          │ authorId(FK) │          │
      │                          │ createdAt    │          │
      │                          │ updatedAt    │          │
      │                          └──────────────┘          │
      │                          ┌──────────────┐          │*
      │                         *│  Attachment  │──────────┘
      │ ◄───────────────────────│──────────────│
      │  uploader (1─*)          │ id           │
      │                          │ taskId  (FK) │
      │                          │ uploadedById │
      │                          │ filename     │
      │                          │ mimeType     │
      │                          │ sizeBytes    │
      │                          │ storageKey   │
      │                          │ createdAt    │
      │                          └──────────────┘
┌──────────────────┐        ┌──────────────────┐
│  RefreshToken    │*      1│       User       │
│──────────────────│────────│   (see above)    │
│ id               │        └──────────────────┘
│ userId  (FK)     │
│ tokenHash (UQ)   │   rotation: on refresh, old row revoked, new row issued
│ expiresAt        │   logout: revoke matching row(s)
│ revokedAt        │
│ replacedByTokenId│
│ createdAt        │
└──────────────────┘
┌──────────────────┐
│  Notification    │  (designed now, populated in realtime phase)
│──────────────────│
│ id               │
│ userId  (FK)     │
│ type  (enum)     │   TASK_ASSIGNED | TASK_UPDATED | COMMENT_ADDED | INVITED
│ payload (json)   │
│ readAt           │
│ createdAt        │
└──────────────────┘
┌──────────────────┐
│  Invitation      │  (team/project invites)
│──────────────────│
│ id               │
│ email            │
│ teamId  (FK)     │
│ invitedById (FK) │
│ role  (enum)     │
│ token  (UQ)      │
│ status (enum)    │   PENDING | ACCEPTED | EXPIRED | REVOKED
│ expiresAt        │
│ createdAt        │
└──────────────────┘
```

## 2. Entities & key rules

- **User** — global identity. `email` unique. `password` stores a bcrypt hash.
- **Team** — top-level collaboration unit, has one `owner` (User). Members join via
  **TeamMembership** (join table with `role`: `OWNER | ADMIN | MEMBER`).
- **Project** — belongs to exactly one Team. Members via **ProjectMembership**
  (`role`: `MANAGER | MEMBER`). A project member must be a team member (enforced in
  service layer).
- **Task** — belongs to a Project. `createdById` (author) and `assignedUserId`
  (nullable assignee) both reference User. `status`: `TODO | IN_PROGRESS | DONE`.
  `priority`: `LOW | MEDIUM | HIGH`.
- **Comment** — belongs to a Task, authored by a User.
- **Attachment** — belongs to a Task, uploaded by a User; bytes live in storage,
  row keeps metadata + `storageKey`.
- **RefreshToken** — one row per issued refresh token, stores **only a hash** of the
  token. Rotation chains via `replacedByTokenId`; logout sets `revokedAt`.
- **Notification / Invitation** — modelled now to keep schema stable; fully wired in
  later phases.

## 3. Relationship cardinalities

| Relationship | Cardinality | Delete behavior |
|--------------|-------------|-----------------|
| User ↔ Team | many-to-many via TeamMembership | membership cascades on user/team delete |
| Team → Project | one-to-many | restrict (must move/delete projects first) or cascade (decide in migration) |
| Project → Task | one-to-many | cascade delete tasks |
| User → Task (created) | one-to-many | restrict (keep author integrity) |
| User → Task (assigned) | one-to-many, nullable | set null on user delete |
| Task → Comment | one-to-many | cascade |
| Task → Attachment | one-to-many | cascade (+ delete stored bytes in service) |
| User → RefreshToken | one-to-many | cascade |

## 4. Indexing strategy

- `User.email` unique index.
- `TeamMembership (userId, teamId)` and `ProjectMembership (userId, projectId)` —
  composite unique indexes (prevent duplicate membership).
- `Task` — indexes on `projectId`, `assignedUserId`, `status`, `dueDate` to support
  filtering/sorting/listing.
- `Comment.taskId`, `Attachment.taskId` indexes.
- `RefreshToken.tokenHash` unique; `RefreshToken.userId` index.
- `Notification.userId` + partial index on unread (`readAt IS NULL`).

## 5. Prisma schema design (shape preview)

> Illustrative — finalised in Phase 4. Enums and core models:

```prisma
enum TeamRole       { OWNER ADMIN MEMBER }
enum ProjectRole    { MANAGER MEMBER }
enum TaskStatus     { TODO IN_PROGRESS DONE }
enum TaskPriority   { LOW MEDIUM HIGH }
enum InviteStatus   { PENDING ACCEPTED EXPIRED REVOKED }
enum NotificationType { TASK_ASSIGNED TASK_UPDATED COMMENT_ADDED INVITED }

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  name      String
  avatarUrl String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  teamMemberships    TeamMembership[]
  projectMemberships ProjectMembership[]
  createdTasks       Task[]   @relation("TaskCreatedBy")
  assignedTasks      Task[]   @relation("TaskAssignee")
  comments           Comment[]
  attachments        Attachment[]
  refreshTokens      RefreshToken[]
  notifications      Notification[]
}

model Task {
  id             String       @id @default(uuid())
  title          String
  description    String?
  dueDate        DateTime?
  status         TaskStatus   @default(TODO)
  priority       TaskPriority @default(MEDIUM)
  projectId      String
  project        Project      @relation(fields: [projectId], references: [id], onDelete: Cascade)
  assignedUserId String?
  assignedUser   User?        @relation("TaskAssignee", fields: [assignedUserId], references: [id], onDelete: SetNull)
  createdById    String
  createdBy      User         @relation("TaskCreatedBy", fields: [createdById], references: [id])
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  comments       Comment[]
  attachments    Attachment[]

  @@index([projectId])
  @@index([assignedUserId])
  @@index([status])
  @@index([dueDate])
}
```

(Remaining models — Team, TeamMembership, Project, ProjectMembership, Comment,
Attachment, RefreshToken, Notification, Invitation — follow the same pattern and are
fully specified in Phase 4.)
