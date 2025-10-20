# Cloudflare Durable Objects Implementation — Task List

Use this checklist to coordinate the full implementation of Plan 1. Tasks are ordered to match the recommended execution sequence. Keep this document updated as work progresses.

## 0. Preparation
- [ ] Confirm Plan 1 ownership and assign engineering lead
- [ ] Review `cloudflare-do/plan.md` and supporting reference docs
- [ ] Verify access to Cloudflare dashboard, Wrangler, and production environments
- [ ] Ensure auth service keys and environment variables are available in local `.env`
- [ ] Create feature flag or environment toggle to gate Durable Object-backed APIs
- [ ] Align QA and product stakeholders on acceptance criteria and rollout plan

## 1. Durable Object Foundations
### 1.1 Local Setup
- [ ] Add Durable Object bindings to `wrangler.toml` for UserDO and QueueDO (dev + prod)
- [ ] Scaffold placeholder classes for `UserDO` and `QueueDO` with constructor wiring
- [ ] Write smoke tests to confirm each Durable Object can be instantiated locally via Wrangler

### 1.2 SQLite Schema and Utilities
- [ ] Define queue and task tables and indices in shared SQL utility
- [ ] Implement helper to run migrations inside each Durable Object
- [ ] Add typed query helpers (insert/select/update/delete) with parameter binding
- [ ] Document schema versioning strategy inside the durable object metadata store

### 1.3 UserDO Implementation
- [ ] Implement `getUser`, `createUser`, `updateUser`, and `listQueues` methods
- [ ] Store and retrieve user preferences (theme, notifications)
- [ ] Persist queue ordering metadata for future drag-and-drop reordering
- [ ] Add unit tests covering success, not-found, and validation failures

### 1.4 QueueDO Implementation
- [ ] Implement queue CRUD operations (`getQueue`, `createQueue`, `updateQueue`, `archiveQueue`)
- [ ] Implement task CRUD operations (`getTask`, `createTask`, `updateTask`, `deleteTask`)
- [ ] Implement task move and batch operations (reorder, move between queues, archive)
- [ ] Enforce ownership checks based on authenticated user ID across every method
- [ ] Add comprehensive unit tests for each queue/task operation, including optimistic concurrency edge cases

## 2. API Layer
### 2.1 Router and Middleware
- [ ] Add `/api/queues` REST routes (GET/POST)
- [ ] Add `/api/queues/:queueId` routes (GET/PUT/DELETE)
- [ ] Add `/api/queues/:queueId/tasks` routes (POST)
- [ ] Add `/api/tasks/:taskId` routes (PUT/DELETE/PATCH)
- [ ] Add `/api/tasks/batch` route for bulk operations
- [ ] Ensure auth middleware validates JWT and injects user ID into request context
- [ ] Add request/response logging and structured error handling for new routes

### 2.2 Validation & Error Handling
- [ ] Create Zod schemas for every request payload and response envelope
- [ ] Standardize error codes (validation, unauthorized, not-found, rate-limit, conflict)
- [ ] Map Durable Object errors into HTTP responses with actionable messages
- [ ] Add integration tests covering happy path and error path for each endpoint

## 3. Frontend Integration
### 3.1 Query Layer
- [ ] Create TanStack Query hooks for `useQueues`, `useQueue`, and per-task operations
- [ ] Implement optimistic update handlers for create/update/delete/move flows
- [ ] Add error boundaries and retry logic for each mutation
- [ ] Wire cache invalidation to refresh queues after mutating operations

### 3.2 Forms & UI
- [ ] Refactor quick-add task form to use TanStack Form with Zod validation
- [ ] Update task detail drawer to fetch/save data through new APIs
- [ ] Implement queue management dialog with create/edit/delete flows
- [ ] Add skeleton loaders and empty states for dashboards while fetching data
- [ ] Ensure accessibility of new components (labels, aria attributes, keyboard support)

### 3.3 Feature Flag & Rollout Controls
- [ ] Hide Durable Object-backed UI behind feature flag or environment check
- [ ] Add fallback to mock data when flag disabled (dev/testing convenience)
- [ ] Document flag usage and removal plan post-launch

## 4. Quality Engineering
### 4.1 Automated Tests
- [ ] Expand unit test coverage for UI state management (optimistic updates, rollback)
- [ ] Add integration tests hitting Worker API locally via Miniflare or Wrangler test harness
- [ ] Write Playwright E2E tests for core flows (create/edit/move/delete)
- [ ] Ensure tests run in CI using Bun scripts defined in `package.json`

### 4.2 Observability
- [ ] Add structured logging inside Durable Objects for CRUD mutations
- [ ] Emit metrics for API latency, error rates, and queue/task counts
- [ ] Configure alert thresholds for elevated error rates post-deploy

### 4.3 Performance Validation
- [ ] Load-test key endpoints to confirm <50ms p95 latency
- [ ] Validate SQLite query plans and indexes with sample datasets
- [ ] Document monitoring approach for Durable Object CPU/time limits

## 5. Release Management
- [ ] Prepare release notes outlining user-facing and infrastructure changes
- [ ] Coordinate QA sign-off on staging environment
- [ ] Deploy to production behind feature flag and monitor logs/metrics for 24 hours
- [ ] Roll out feature flag gradually (internal users → beta group → full rollout)
- [ ] Schedule post-launch review and capture follow-ups for Plan 2 dependency needs

## 6. Knowledge Sharing
- [ ] Update `features/README.md` with links to new documentation structure
- [ ] Record architecture overview or brown-bag session for Plan 1 design
- [ ] Capture retrospective notes and share with the team before starting Plan 2
