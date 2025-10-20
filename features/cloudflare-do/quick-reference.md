# Cloudflare Durable Objects — Quick Reference

Use this sheet while executing Plan 1. It highlights the core changes, endpoints, and UI surfaces that rely on the new persistent storage layer.

## Overview
- **Goal:** Replace in-memory mock data with Durable Object–backed persistence for queues and tasks.
- **Primary Deliverables:** UserDO, QueueDO, REST API for task management, TanStack Query integration, updated dashboard UX.
- **Dependencies:** Existing auth service (JWT), Wrangler configuration, Bun + TanStack stack already in repo.

## Durable Objects
| Object | Responsibility | Notes |
|--------|----------------|-------|
| `UserDO` | Stores user metadata, queue ordering, preferences | One instance per user; keyed by user ID/email hash |
| `QueueDO` | Owns queue metadata and full task list | One instance per queue; performs all task CRUD |

## REST Endpoints
```
GET    /api/queues              → List queues for current user
POST   /api/queues              → Create queue
GET    /api/queues/:queueId     → Fetch queue with tasks
PUT    /api/queues/:queueId     → Update queue metadata
DELETE /api/queues/:queueId     → Soft delete queue
POST   /api/queues/:queueId/tasks → Create task within queue
PUT    /api/tasks/:taskId       → Update task fields
DELETE /api/tasks/:taskId       → Soft delete task
PATCH  /api/tasks/:taskId       → Move task between queues/categories
POST   /api/tasks/batch         → Bulk reorder/move/archive operations
```

## Forms (TanStack Form + Zod)
| Form | Location | Fields |
|------|----------|--------|
| Quick Add Task | Dashboard inline | `title` |
| Task Detail Drawer | Drawer component | `title`, `description`, `category`, `queueId`, `completed` |
| Queue Management Dialog | Modal dialog | `name`, `color`, `position` |

## TanStack Query Keys
| Query | Key | Purpose |
|-------|-----|---------|
| Queues list | `['queues']` | Fetch all queues for authenticated user |
| Single queue | `['queues', queueId]` | Fetch queue details (tasks included) |

## Mutations & Optimistic Updates
- **`createQueue`**: append queue to cached list.
- **`updateQueue`**: merge changes and re-sort based on `position`.
- **`deleteQueue`**: remove queue and invalidate dependent queries.
- **`createTask`**: push task into correct category array with optimistic ID.
- **`updateTask` / `moveTask`**: update task attributes locally, reindex `position`.
- **`deleteTask`**: remove from cached queue and invalidate if request fails.

## Shadcn Components
| Component | Usage |
|-----------|-------|
| `Button` | Primary actions (save, cancel, delete) |
| `Input` | Queue name, task title |
| `Textarea` | Task description |
| `Select` | Category and queue selectors |
| `Checkbox` | Task completion flag |
| `Sheet` | Task detail drawer container |
| `Dialog` | Queue management modal |
| `Skeleton` | Loading placeholders for queue/task lists |
| `Alert` | Error messaging |

## Validation Schemas (Zod)
- `QueueSchema`: queue payload and persisted shape.
- `TaskSchema`: task payload and persisted shape.
- `CreateQueueRequestSchema`, `CreateTaskRequestSchema`, `UpdateTaskRequestSchema`, `BatchTaskOperationSchema` for request validation.

## Performance Targets
- API p95 latency < 50ms.
- Zero data loss across restarts (verified by automated tests).
- Optimistic update accuracy > 95% success rate.

## Testing Checklist
- Unit tests for Durable Object CRUD methods (UserDO & QueueDO).
- Integration tests for each REST endpoint covering success and failure modes.
- Playwright flows for create/edit/move/delete task scenarios.
- Load-testing script validating concurrency handling and SQLite performance.

## Rollout Guidance
1. Deploy Durable Objects and API endpoints behind feature flag.
2. Switch dashboard data source to API in staging; validate with QA.
3. Roll out to production with monitoring dashboards watching latency, error rate, and DO CPU usage.
4. Remove mock data code once telemetry shows stable usage for at least one week.
