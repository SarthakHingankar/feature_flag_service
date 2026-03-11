# Feature Flag Service

A production-grade feature flag management API built with Node.js, Express, Prisma, and PostgreSQL. Supports percentage-based rollouts, user targeting, and serves runtime evaluations from an in-memory snapshot cache for near-zero latency.

## Data Model

```
Project  1──*  Environment  1──*  FeatureFlag
                                       │
                                   AuditLog (on update)
```

- **Project** — top-level grouping (e.g. `shop`, `dashboard`). Unique by `name`.
- **Environment** — deployment target under a project (e.g. `production`, `staging`). Unique by `[projectId, name]`.
- **FeatureFlag** — a toggle scoped to one environment. Unique by `[environmentId, key]`.
  - `enabled` — master kill switch. If `false`, the flag is off for everyone.
  - `rolloutPercentage` — integer 0–100, controls gradual rollout.
  - `targeting` — JSON `{ allow: ["user-id-1", "user-id-2"] }` for explicit user overrides.
- **AuditLog** — immutable record of flag updates (before/after snapshots).

## Architecture

```
src/
├── index.js                          # Express app, route mounting, startup
├── prisma.js                         # Shared PrismaClient instance
├── errors.js                         # AppError, NotFoundError, ValidationError, ConflictError
├── middleware/
│   └── error.middleware.js           # Centralized error handler
├── routes/
│   ├── project.routes.js             # POST/GET /projects
│   ├── environment.routes.js         # POST/GET /projects/:id/environments
│   ├── flag.routes.js                # POST/GET/PATCH .../environments/:id/flags
│   └── evaluation.routes.js          # GET /config
├── controllers/
│   ├── project.controller.js         # Input validation → service
│   ├── environment.controller.js
│   ├── flag.controller.js
│   └── evaluation.controller.js      # Reads from snapshot, runs evaluator
├── services/
│   ├── project.service.js            # DB operations, conflict handling
│   ├── environment.service.js
│   └── flag.service.js               # Transactional update + audit log
└── evaluation/
    ├── snapshot.js                    # In-memory snapshot cache
    ├── evaluator.js                  # Flag evaluation engine
    ├── flags.repository.js           # DB-backed flag loader (used by snapshot)
    ├── evaluator.test.js             # Unit tests
    └── evaluation.integration.test.js # Integration tests
```

The codebase follows a **routes → controllers → services** layered pattern. Controllers handle HTTP concerns (validation, response shaping). Services handle business logic and database access. The evaluation layer is separate and reads from memory at runtime.

## Execution Flow

### Server Startup

```
1.  initializeSnapshot()
      ├── Query all environments (with project names)
      ├── Query all feature flags (with environment + project joins)
      ├── Build nested Map<projectName, Map<envName, Flag[]>>
      ├── Record MAX(updatedAt) as snapshot version
      └── Store in global snapshotStore
2.  startSnapshotRefreshLoop(30s)
      └── setInterval → refreshSnapshotIfNeeded()
3.  app.listen(3000)

If snapshot initialization fails, the process exits with code 1.
```

### Runtime: Flag Evaluation (GET /config)

```
Request:  GET /config?project=shop&env=production&user_id=user-42
              │
              ▼
    evaluation.controller.js
        ├── Validate query params
        ├── getFlagsFromSnapshot("shop", "production")   ← O(1) Map lookup, no DB
        ├── evaluateFlags("user-42", flags)              ← pure computation
        └── Return JSON response

Response: { "project": "shop", "environment": "production", "flags": { "dark-mode": true, "beta-checkout": false } }
```

**Zero database queries at runtime.** All flag data is served from memory.

### Flag Evaluation Logic

For each flag, the evaluator runs this decision tree:

```
enabled == false?  ──yes──►  return FALSE
       │ no
       ▼
user in targetedUsers?  ──yes──►  return TRUE
       │ no
       ▼
rolloutPercentage > 0?  ──yes──►  hash(userId:flagKey) % 100 < percentage?  ──►  TRUE / FALSE
       │ no
       ▼
return TRUE  (flag is enabled, no rules restrict it)
```

- **Targeting takes priority over rollout.** A user in the allow-list always gets `true`.
- **Rollout is deterministic.** Same user + same flag = same result every time (SHA-256 hash bucketing).
- **Kill switch is absolute.** `enabled: false` = `false` for everyone, no exceptions.

### Background Snapshot Refresh

```
Every 30 seconds:
    ├── Query MAX(updatedAt) from FeatureFlag table  (single aggregate, not full scan)
    ├── Compare with lastSnapshotVersion
    ├── If unchanged → do nothing
    └── If newer → reload full snapshot and atomically replace the global reference
```

This gives eventual consistency with minimal database load. CRUD operations hit the database directly; the snapshot catches up within the refresh interval.

## API Reference

### Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/projects` | Create a project. Body: `{ "name": "shop" }` |
| `GET` | `/projects` | List all projects. |

### Environments

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/projects/:projectId/environments` | Create an environment. Body: `{ "name": "production" }` |
| `GET` | `/projects/:projectId/environments` | List environments for a project. |

### Feature Flags

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/projects/:projectId/environments/:envId/flags` | Create a flag. Body: `{ "key": "dark-mode", "enabled": true, "rolloutPercentage": 50, "targeting": { "allow": ["user-1"] } }` |
| `GET` | `/projects/:projectId/environments/:envId/flags` | List flags for an environment. |
| `PATCH` | `/projects/:projectId/environments/:envId/flags/:flagId` | Update a flag. Body: any subset of `{ enabled, description, rolloutPercentage, targeting }`. Creates an audit log entry. |

### Evaluation

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/config?project=X&env=Y&user_id=Z` | Evaluate all flags for a user. Returns `{ project, environment, flags: { key: boolean } }`. |

### Other

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/audit-logs?entityType=X&entityId=Y&limit=N` | Query audit log entries. |
| `GET` | `/health` | Health check. Returns `{ "status": "ok" }`. |

## Getting Started

### Prerequisites

- Docker and Docker Compose

### Run

```bash
docker compose up --build
```

This starts PostgreSQL on port 5432, runs Prisma migrations, and starts the app on port 3000 with hot-reload via nodemon.

### Test

Tests require a running PostgreSQL instance (the Docker Compose database works):

```bash
npm test
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20, Express 5 |
| Database | PostgreSQL 15 |
| ORM | Prisma 6 |
| Testing | Jest 30 |
| Containerization | Docker, Docker Compose |
