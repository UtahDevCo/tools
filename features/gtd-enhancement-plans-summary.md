# GTD Enhancement Plans: Summary

This document provides a concise overview of two major enhancement plans for the GTD application.

## Plan 1: Cloudflare Durable Objects Implementation
**Status:** Planning
**Document:** [gtd-06-durable-objects-plan.md](./gtd-06-durable-objects-plan.md)

### Goal
Replace in-memory mock data with persistent storage using Cloudflare Durable Objects and SQLite.

### Key Components
- **UserDO**: User-level data and queue list
- **QueueDO**: Queue metadata and all tasks within the queue
- **SQLite**: Persistent storage with ACID guarantees

### Web Pages
1. **Dashboard** (existing `/`) - Updated with TanStack Query for data fetching
2. **Task Detail Drawer** (existing component) - Form with TanStack Form
3. **Queue Management Dialog** (new modal) - Queue settings form

### Technology Stack
- **TanStack Query v5**: Server state management, optimistic updates
- **TanStack Form**: All form handling with validation
- **Shadcn UI**: Input, Button, Sheet, Dialog, Select, Checkbox, Textarea
- **Zod**: Schema validation for all API requests/responses

### API Endpoints
```
GET    /api/queues              # List user's queues
POST   /api/queues              # Create queue
GET    /api/queues/:id          # Get queue with tasks
PUT    /api/queues/:id          # Update queue
DELETE /api/queues/:id          # Soft delete queue
POST   /api/queues/:id/tasks    # Create task
PUT    /api/tasks/:id           # Update task
DELETE /api/tasks/:id           # Soft delete task
PATCH  /api/tasks/:id           # Move task (queue/category)
POST   /api/tasks/batch         # Bulk operations
```

### Implementation Phases
1. **Phase 1**: Durable Object setup (UserDO, QueueDO, SQLite schemas)
2. **Phase 2**: API endpoints (CRUD operations, batch operations)
3. **Phase 3**: Frontend integration (TanStack Query, optimistic updates)
4. **Phase 4**: Testing & migration (unit, integration, E2E tests)

---

## Plan 2: Google Calendar Integration
**Status:** Planning
**Document:** [gtd-07-google-calendar-integration-plan.md](./gtd-07-google-calendar-integration-plan.md)

### Goal
Integrate Google Calendar to display events from multiple accounts alongside GTD tasks, with daily event lists in each queue.

### Key Components
- **GoogleAccountDO**: OAuth token storage and refresh per account
- **CalendarSyncDO**: Calendar event caching and sync coordination
- **Google Calendar API**: Fetch events and tasks
- **Google Tasks API**: Fetch Google Tasks

### Web Pages
1. **Google Account Connection** (new `/settings/google-accounts`)
   - List connected accounts
   - Connect/disconnect buttons
   - Sync status and manual sync
   
2. **Calendar Settings** (new `/settings/calendar`)
   - Auto-sync toggle
   - Sync interval selection
   - Display preferences
   - Date range settings
   
3. **Calendar Selection Dialog** (new modal)
   - Checkbox list of all calendars from all accounts
   - Filter which calendars to display
   
4. **Dashboard Updates** (existing `/`)
   - New "Calendar" category in each queue
   - Events grouped by date (Today, Tomorrow, etc.)
   - Read-only event cards
   
5. **Event Detail Drawer** (new component)
   - Full event details (read-only)
   - Link to open in Google Calendar
   - Option to create GTD task from event

### Technology Stack
- **Google OAuth 2.0**: Multi-account authentication
- **Google Calendar API v3**: Event fetching
- **Google Tasks API v1**: Task fetching
- **TanStack Query v5**: Calendar data fetching and caching
- **TanStack Form**: Settings forms
- **Shadcn UI**: Card, Badge, Switch, Dialog, Collapsible, ScrollArea

### API Endpoints
```
GET  /api/google/auth/start        # Initiate OAuth flow
GET  /api/google/auth/callback     # Handle OAuth redirect
GET  /api/google/accounts          # List connected accounts
DEL  /api/google/accounts/:id      # Disconnect account
POST /api/google/sync              # Manual sync trigger
GET  /api/google/sync              # Get sync status
GET  /api/google/calendars         # List all calendars
GET  /api/google/events            # Fetch events (with date range)
GET  /api/google/tasks             # Fetch Google Tasks
```

### OAuth Scopes Required
```
https://www.googleapis.com/auth/calendar.readonly
https://www.googleapis.com/auth/tasks.readonly
https://www.googleapis.com/auth/userinfo.email
https://www.googleapis.com/auth/userinfo.profile
```

### Implementation Phases
1. **Phase 1**: Google OAuth setup (Cloud Console, redirect endpoint)
2. **Phase 2**: Durable Objects (GoogleAccountDO, CalendarSyncDO)
3. **Phase 3**: API endpoints (OAuth flow, sync, event fetching)
4. **Phase 4**: Frontend integration (account connection, display events)
5. **Phase 5**: Sync logic (periodic sync, token refresh, multi-account)
6. **Phase 6**: Testing (unit, integration, E2E with multiple accounts)

---

## Shared Components & Technologies

### TanStack Packages
Both plans use:
- **TanStack Query v5** for all server state management
- **TanStack Form v0.x** for all form handling

### Shadcn UI Components
Commonly used across both plans:
- `Button`, `Input`, `Label`, `Checkbox`, `Select`
- `Dialog`, `Sheet`, `Card`, `Badge`
- `ScrollArea`, `Separator`, `Skeleton`
- `Switch`, `Textarea`, `AlertDialog`

### Validation
- **Zod** for all API request/response validation
- Schemas defined for every entity and API operation
- Client and server validation

### Architecture
- **Cloudflare Workers** for API layer
- **Durable Objects** for persistent state
- **SQLite** for structured data storage
- **JWT Authentication** via existing auth service

---

## Dependencies Between Plans

**Plan 1 is a prerequisite for Plan 2**

- Plan 2 requires the Durable Objects infrastructure from Plan 1
- Calendar events will be displayed within queues (Plan 1 structure)
- Both share the same authentication and authorization patterns
- Calendar feature can be added incrementally after Plan 1 is complete

---

## Implementation Order Recommendation

1. **Complete Plan 1 first** (Foundation)
   - Establishes persistent data layer
   - Validates Durable Objects architecture
   - Provides stable base for additional features
   
2. **Then implement Plan 2** (Enhancement)
   - Builds on proven infrastructure
   - Adds calendar integration as separate feature
   - Can be developed independently after Plan 1

---

## Quick Reference: Forms with TanStack Form

### Plan 1 Forms
1. **Quick Add Task** - Inline form in category section
   - Fields: title (text input)
   
2. **Task Detail** - Sheet drawer
   - Fields: title, description, category, queue, completed
   
3. **Queue Settings** - Dialog modal
   - Fields: name, color, position

### Plan 2 Forms
1. **Calendar Settings** - Settings page
   - Fields: autoSyncEnabled, syncIntervalMinutes, defaultView, showAllDayEvents, showDeclinedEvents, dateRangeDays
   
2. **Calendar Selection** - Dialog modal
   - Fields: Array of calendar checkboxes

---

## Quick Reference: API Endpoints

### Plan 1 Endpoints (Task Management)
```
Queues:  GET/POST /api/queues, GET/PUT/DELETE /api/queues/:id
Tasks:   POST /api/queues/:id/tasks, PUT/DELETE /api/tasks/:id
Batch:   POST /api/tasks/batch
```

### Plan 2 Endpoints (Calendar Integration)
```
OAuth:    GET /api/google/auth/start, GET /api/google/auth/callback
Accounts: GET/DELETE /api/google/accounts/:id
Sync:     POST/GET /api/google/sync
Data:     GET /api/google/calendars, GET /api/google/events, GET /api/google/tasks
```

---

## Next Steps

1. Review both detailed plans
2. Approve scope and approach
3. Prioritize Plan 1 implementation
4. Set up development environment with Durable Objects
5. Begin implementation following the phased approach

---

## Questions to Consider

1. Should we implement both plans simultaneously or sequentially?
   - **Recommendation**: Sequential (Plan 1 → Plan 2)
   
2. Do we want two-way sync with Google Calendar in Plan 2?
   - **Recommendation**: Start with read-only, add write capability later
   
3. What date range should we fetch for calendar events?
   - **Recommendation**: 14 days default, configurable up to 90 days
   
4. Should calendar events be editable in the GTD app?
   - **Recommendation**: Read-only initially, add editing in future phase
   
5. How many Google accounts should we support?
   - **Recommendation**: 5 accounts per user, with option to increase

---

## Success Metrics

### Plan 1
- ✅ All tasks persist across browser sessions
- ✅ API responses < 50ms (p95)
- ✅ Optimistic updates work for all mutations
- ✅ Zero data loss

### Plan 2
- ✅ OAuth flow completes in < 5 seconds
- ✅ Sync completes in < 10 seconds
- ✅ Support 5 connected accounts
- ✅ Cache hit rate > 80%
- ✅ Events display cleanly grouped by date
