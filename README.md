# Feature Flag Management Platform

Production-inspired SaaS platform for managing feature flags, gradual rollouts, and runtime configuration across applications. The platform supports deterministic percentage rollouts, user-level targeting, audit logging, and serves runtime evaluations from an in-memory snapshot cache for near-zero latency.

---

## Overview

Feature flags allow teams to release features safely without redeploying applications. This project demonstrates how a centralized feature management platform can provide runtime configuration, gradual rollouts, and targeted feature releases while keeping evaluation latency extremely low.

Instead of querying the database for every request, flag configurations are periodically loaded into memory and evaluated entirely in-process, making runtime flag evaluation independent of database performance.

---

## Highlights

- Centralized feature management across projects and environments
- Deterministic percentage-based rollouts using SHA-256 hashing
- User-level targeting with explicit allow lists
- In-memory snapshot cache for zero database queries during evaluation
- Audit logging for every flag modification
- Layered architecture following Routes → Controllers → Services

---

## Architecture

```
                    Client Application
                            │
                    GET /config
                            │
                     Express API
                            │
                Evaluation Controller
                            │
                  Snapshot Cache (Memory)
                            │
                  Flag Evaluation Engine
                            │
          Deterministic Hash + Targeting Rules
                            │
                     JSON Response

            ▲
            │

    Background Snapshot Refresh

            │
      PostgreSQL Database
```

---

## Tech Stack

### Backend

- Node.js
- Express

### Database

- PostgreSQL
- Prisma ORM

### Testing

- Jest

### Infrastructure

- Docker
- Docker Compose

---

## Data Model

```
Project
   │
   └── Environment
          │
          └── FeatureFlag
                  │
                  └── AuditLog
```

- **Project** – Logical application boundary
- **Environment** – Deployment target (Production, Staging, etc.)
- **Feature Flag** – Runtime configuration for an environment
- **Audit Log** – Immutable history of configuration changes

---

## Runtime Architecture

The application follows a layered architecture:

```
Routes
    │
Controllers
    │
Services
    │
Database

Evaluation Layer
    │
Snapshot Cache
    │
Evaluation Engine
```

HTTP requests and runtime flag evaluation are intentionally separated. Business logic is handled through services, while runtime evaluation operates entirely from an in-memory snapshot.

---

## Evaluation Flow

```
Client Request
      │
      ▼
Validate Request
      │
      ▼
Read Flags from Snapshot Cache
      │
      ▼
Evaluate Rules
      │
      ├── Kill Switch
      ├── User Targeting
      └── Percentage Rollout
      │
      ▼
Return Flag Configuration
```

No database queries occur during runtime evaluation.

---

## Engineering Decisions

### Snapshot-Based Evaluation

Flag configurations are periodically synchronized into memory. Runtime evaluation becomes a pure in-memory operation, eliminating database latency from every request.

---

### Deterministic Rollouts

Percentage rollouts use SHA-256 hashing of the user identifier and flag key, ensuring the same user consistently receives the same variation.

---

### Layered Architecture

Controllers remain responsible only for HTTP concerns while services encapsulate business logic and persistence. This separation keeps evaluation logic independent of the REST API.

---

### Audit Logging

Every flag modification creates an immutable audit record containing before and after snapshots, enabling configuration history and rollback analysis.

---

## API

### Projects

| Method | Endpoint |
|----------|----------|
| POST | `/projects` |
| GET | `/projects` |

### Environments

| Method | Endpoint |
|----------|----------|
| POST | `/projects/:projectId/environments` |
| GET | `/projects/:projectId/environments` |

### Feature Flags

| Method | Endpoint |
|----------|----------|
| POST | `/projects/:projectId/environments/:envId/flags` |
| GET | `/projects/:projectId/environments/:envId/flags` |
| PATCH | `/projects/:projectId/environments/:envId/flags/:flagId` |

### Evaluation

| Method | Endpoint |
|----------|----------|
| GET | `/config` |

### System

| Method | Endpoint |
|----------|----------|
| GET | `/health` |
| GET | `/audit-logs` |

---

## Running Locally

### Prerequisites

- Docker
- Docker Compose

### Start

```bash
docker compose up --build
```

The application starts PostgreSQL, runs database migrations, and launches the API.

---

## Future Improvements

- SDKs for JavaScript, Go, and Java
- Real-time flag synchronization
- Multi-tenant organizations
- Role-based access control
- Environment-specific permissions
- OpenFeature compatibility
- Metrics and rollout analytics
- Distributed cache synchronization

---
