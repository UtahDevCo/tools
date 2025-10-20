# Cloudflare Durable Objects — Architecture Reference

This document captures the architecture visuals and call-outs specific to Plan 1. Use it alongside `plan.md` when discussing platform design, infrastructure, or integration touchpoints.

## System Overview
```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (Browser)                          │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              React + TanStack Router                       │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │           TanStack Query (Cache)                     │  │ │
│  │  │  - queues: Query<Queue[]>                            │  │ │
│  │  │  - tasks: Query<Task[]>                              │  │ │
│  │  │  - Optimistic updates                                │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │           TanStack Form                              │  │ │
│  │  │  - Task forms (create, edit)                         │  │ │
│  │  │  - Queue forms (create, edit)                        │  │ │
│  │  │  - Zod validation                                    │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │           Shadcn UI Components                       │  │ │
│  │  │  - Input, Button, Sheet, Dialog, Select, etc.        │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/JSON
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  Cloudflare Workers (Edge)                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                      API Router                            │ │
│  │  - /api/queues                                             │ │
│  │  - /api/queues/:id                                         │ │
│  │  - /api/queues/:id/tasks                                   │ │
│  │  - /api/tasks/:id                                          │ │
│  │  - /api/tasks/batch                                        │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                  Auth Middleware                           │ │
│  │  - Verify JWT from auth service                            │ │
│  │  - Extract user ID                                         │ │
│  │  - Rate limiting                                           │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                  Request Handlers                          │ │
│  │  - Zod validation                                          │ │
│  │  - Business logic                                          │ │
│  │  - Error handling                                          │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Durable Object Stub
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Durable Objects Layer                         │
│                                                                  │
│  ┌──────────────────────┐      ┌──────────────────────────┐    │
│  │       UserDO         │      │       QueueDO            │    │
│  │  ID: user-{userId}   │      │  ID: queue-{queueId}     │    │
│  ├──────────────────────┤      ├──────────────────────────┤    │
│  │ SQLite Database      │      │ SQLite Database          │    │
│  │  ┌────────────────┐  │      │  ┌────────────────────┐  │    │
│  │  │ users table    │  │      │  │ queues table       │  │    │
│  │  │ - id           │  │      │  │ - id               │  │    │
│  │  │ - email        │  │      │  │ - user_id          │  │    │
│  │  │ - displayName  │  │      │  │ - name             │  │    │
│  │  │ - preferences  │  │      │  │ - color            │  │    │
│  │  └────────────────┘  │      │  │ - position         │  │    │
│  │  ┌────────────────┐  │      │  └────────────────────┘  │    │
│  │  │ queues list    │  │      │  ┌────────────────────┐  │    │
│  │  │ - queue_id[]   │  │      │  │ tasks table        │  │    │
│  │  └────────────────┘  │      │  │ - id               │  │    │
│  │                      │      │  │ - queue_id         │  │    │
│  │ Methods:             │      │  │ - category         │  │    │
│  │ - getUser()          │      │  │ - title            │  │    │
│  │ - updateUser()       │      │  │ - description      │  │    │
│  │ - getQueues()        │      │  │ - position         │  │    │
│  │ - createQueue()      │      │  │ - completed        │  │    │
│  └──────────────────────┘      │  └────────────────────┘  │    │
│                                │                          │    │
│                                │ Methods:                 │    │
│                                │ - getQueue()             │    │
│                                │ - updateQueue()          │    │
│                                │ - getTasks()             │    │
│                                │ - createTask()           │    │
│                                │ - updateTask()           │    │
│                                │ - deleteTask()           │    │
│                                │ - batchUpdateTasks()     │    │
│                                └──────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Example — Create Task
```
1. User fills form                    [TanStack Form]
   ↓
2. Client validation                  [Zod Schema]
   ↓
3. Submit mutation                    [TanStack Query]
   ↓
4. Optimistic update                  [UI updates immediately]
   ↓
5. POST /api/queues/123/tasks         [HTTP Request]
   ↓
6. Worker receives request            [Cloudflare Workers]
   ↓
7. Verify JWT token                   [Auth Middleware]
   ↓
8. Validate request body              [Zod Schema]
   ↓
9. Get QueueDO stub                   [Durable Object Stub]
   ↓
10. Call queueDO.createTask()         [QueueDO Method]
    ↓
11. INSERT INTO tasks                 [SQLite]
    ↓
12. Return task data                  [JSON Response]
    ↓
13. Update cache                      [TanStack Query]
    ↓
14. UI confirms change                [Success state]
```

## Integration Touchpoints
- **Auth Service:** JWT validation is required for every request; existing middleware is reused.
- **Queue Ownership:** All Durable Object calls include the authenticated `userId` to enforce authorization.
- **Feature Flagging:** Route handlers should check for the feature flag to allow staged rollout.
- **Monitoring:** Log request metadata (method, queueId, userId, duration) to support debugging and capacity planning.

## Deployment Considerations
- Provision Durable Object namespaces in both staging and production environments.
- Ensure `wrangler.toml` includes bindings for `USER_DO` and `QUEUE_DO` referencing the correct namespaces.
- Apply migrations lazily on Durable Object startup and log the schema version to confirm successful upgrades.

## Future Extension Hooks
- Add WebSocket bridges for real-time updates by colocating connection metadata within QueueDO.
- Support cross-user collaboration by introducing shared QueueDO access lists and auditing actions via an `admin_action_logs` table.
- Enhance resilience by persisting event logs for all write operations, enabling replay in the event of corruption.
