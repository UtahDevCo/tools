# GTD Enhancement Plans - Architecture Diagrams

## Plan 1: Durable Objects Architecture

### System Overview
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
│  │  │  - Input, Button, Sheet, Dialog, Select, etc.       │  │ │
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

### Data Flow Example: Create Task

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

---

## Plan 2: Google Calendar Integration Architecture

### System Overview
```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (Browser)                          │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    React Components                        │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │  Dashboard with Calendar Section                     │  │ │
│  │  │  - Task categories (Next, Waiting, Someday)          │  │ │
│  │  │  - Calendar category (NEW)                           │  │ │
│  │  │    - Today's events                                  │  │ │
│  │  │    - Tomorrow's events                               │  │ │
│  │  │    - Upcoming events                                 │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │  Settings Pages (NEW)                                │  │ │
│  │  │  - /settings/google-accounts                         │  │ │
│  │  │  - /settings/calendar                                │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │  TanStack Query (Calendar Data)                      │  │ │
│  │  │  - googleAccounts: Query<Account[]>                  │  │ │
│  │  │  - calendarEvents: Query<Event[]>                    │  │ │
│  │  │  - Auto-refetch every 15 minutes                     │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
           │                                    │
           │ OAuth Flow                         │ API Requests
           ↓                                    ↓
┌─────────────────────────────────────────────────────────────────┐
│                  Cloudflare Workers (Edge)                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                Google API Router (NEW)                     │ │
│  │  - /api/google/auth/start                                  │ │
│  │  - /api/google/auth/callback                               │ │
│  │  - /api/google/accounts                                    │ │
│  │  - /api/google/sync                                        │ │
│  │  - /api/google/events                                      │ │
│  │  - /api/google/calendars                                   │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
           │                                    │
           │                                    ↓
           │                    ┌────────────────────────────────┐
           │                    │  CalendarSyncDO                │
           │                    │  ID: sync-{userId}             │
           │                    ├────────────────────────────────┤
           │                    │  SQLite Database               │
           │                    │  - calendar_events table       │
           │                    │  - google_tasks table          │
           │                    │  - sync_status table           │
           │                    │                                │
           │                    │  Methods:                      │
           │                    │  - syncEvents()                │
           │                    │  - getEvents()                 │
           │                    │  - cacheEvents()               │
           │                    └────────────────────────────────┘
           │                                    │
           ↓                                    ↓
┌──────────────────────────┐      ┌────────────────────────────┐
│   GoogleAccountDO        │      │   Google Calendar API      │
│   ID: account-{acctId}   │      │   (External)               │
├──────────────────────────┤      ├────────────────────────────┤
│  SQLite Database         │      │  - Calendar Events         │
│  - google_accounts table │      │  - Google Tasks            │
│  - access_token          │      │  - Calendar List           │
│  - refresh_token         │←─────┤  - OAuth 2.0              │
│  - token_expires_at      │      │                            │
│                          │      │  Rate Limits:              │
│  Methods:                │      │  - 10,000 req/day default  │
│  - getValidAccessToken() │      │  - Per-user quotas         │
│  - refreshAccessToken()  │      └────────────────────────────┘
│  - storeTokens()         │
└──────────────────────────┘
```

### OAuth Flow Diagram

```
User clicks "Connect Google Account"
           ↓
┌────────────────────────────────────────┐
│ 1. GET /api/google/auth/start          │
│    - Generate state token              │
│    - Redirect to Google OAuth          │
└────────────────────────────────────────┘
           ↓
┌────────────────────────────────────────┐
│ 2. User at Google                      │
│    - Select account                    │
│    - Grant permissions                 │
│    - Google redirects back             │
└────────────────────────────────────────┘
           ↓
┌────────────────────────────────────────┐
│ 3. GET /api/google/auth/callback       │
│    - Verify state token                │
│    - Exchange code for tokens          │
│    - Store in GoogleAccountDO          │
└────────────────────────────────────────┘
           ↓
┌────────────────────────────────────────┐
│ 4. Create GoogleAccountDO              │
│    - Store access_token                │
│    - Store refresh_token               │
│    - Set expiry time                   │
└────────────────────────────────────────┘
           ↓
┌────────────────────────────────────────┐
│ 5. Initial Sync                        │
│    - Fetch calendar list               │
│    - Fetch events (30 days)            │
│    - Cache in CalendarSyncDO           │
└────────────────────────────────────────┘
           ↓
┌────────────────────────────────────────┐
│ 6. Display in Dashboard                │
│    - Show events grouped by date       │
│    - Enable sync button                │
└────────────────────────────────────────┘
```

### Calendar Sync Flow

```
┌────────────────────────────────────────┐
│ Trigger (Auto every 15 min OR Manual)  │
└────────────────────────────────────────┘
           ↓
┌────────────────────────────────────────┐
│ CalendarSyncDO.syncEvents()            │
│ - For each connected account           │
└────────────────────────────────────────┘
           ↓
┌────────────────────────────────────────┐
│ Get GoogleAccountDO                    │
│ - Check token expiry                   │
│ - Refresh if needed                    │
│ - Get valid access token               │
└────────────────────────────────────────┘
           ↓
┌────────────────────────────────────────┐
│ Fetch from Google Calendar API         │
│ - GET calendar list                    │
│ - For each calendar:                   │
│   - GET events (timeMin, timeMax)      │
└────────────────────────────────────────┘
           ↓
┌────────────────────────────────────────┐
│ Parse and Transform Events             │
│ - Extract relevant fields              │
│ - Convert timestamps                   │
│ - Group by date                        │
└────────────────────────────────────────┘
           ↓
┌────────────────────────────────────────┐
│ Cache in CalendarSyncDO SQLite         │
│ - DELETE old events for date range     │
│ - INSERT new events                    │
│ - UPDATE sync_status table             │
└────────────────────────────────────────┘
           ↓
┌────────────────────────────────────────┐
│ Return Success                         │
│ - Last sync time                       │
│ - Event count                          │
│ - Any errors                           │
└────────────────────────────────────────┘
```

### Data Flow: Display Calendar Events

```
1. User opens dashboard
   ↓
2. TanStack Query fetches events       [useQuery]
   ↓
3. GET /api/google/events?start=...    [HTTP Request]
   ↓
4. Worker checks cache freshness       [CalendarSyncDO]
   ↓
5. If stale, trigger background sync   [Async]
   ↓
6. Return cached events                [SQLite SELECT]
   ↓
7. Group events by date                [Client-side]
   ↓
8. Render calendar section             [React Components]
   │
   ├─ Today's Events (Dec 17)
   │  ├─ 9:00 AM - Team Standup
   │  ├─ 10:30 AM - Client Call
   │  └─ 2:00 PM - Project Review
   │
   ├─ Tomorrow (Dec 18)
   │  ├─ All Day - Company Holiday
   │  └─ 1:00 PM - Weekly Sync
   │
   └─ Thu, Dec 19
      └─ 11:00 AM - Design Meeting
```

---

## Combined Architecture (Both Plans)

### Full System View

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Client (Browser)                            │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                 React + TanStack Router                          ││
│  │  ┌─────────────────────────────────────────────────────────────┐││
│  │  │  Dashboard                                                   │││
│  │  │  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐ │││
│  │  │  │ Work Queue   │  │ Personal Q   │  │ Projects Queue    │ │││
│  │  │  ├──────────────┤  ├──────────────┤  ├───────────────────┤ │││
│  │  │  │ Next Actions │  │ Next Actions │  │ Next Actions      │ │││
│  │  │  │ - Task 1     │  │ - Task A     │  │ - Task X          │ │││
│  │  │  │ - Task 2     │  │ - Task B     │  │ - Task Y          │ │││
│  │  │  ├──────────────┤  ├──────────────┤  ├───────────────────┤ │││
│  │  │  │ Calendar 📅  │  │ Calendar 📅  │  │ Calendar 📅       │ │││
│  │  │  │ Today:       │  │ Today:       │  │ Today:            │ │││
│  │  │  │ • 9am Meet   │  │ • 2pm Appt   │  │ • 3pm Review      │ │││
│  │  │  │ Tomorrow:    │  │ Tomorrow:    │  │ Tomorrow:         │ │││
│  │  │  │ • 10am Call  │  │ • All Day    │  │ • 11am Planning   │ │││
│  │  │  ├──────────────┤  ├──────────────┤  ├───────────────────┤ │││
│  │  │  │ Waiting On   │  │ Waiting On   │  │ Waiting On        │ │││
│  │  │  │ Someday      │  │ Someday      │  │ Someday           │ │││
│  │  │  └──────────────┘  └──────────────┘  └───────────────────┘ │││
│  │  └─────────────────────────────────────────────────────────────┘││
│  │  ┌─────────────────────────────────────────────────────────────┐││
│  │  │  TanStack Query Cache                                        │││
│  │  │  - queues (Plan 1)                                           │││
│  │  │  - tasks (Plan 1)                                            │││
│  │  │  - googleAccounts (Plan 2)                                   │││
│  │  │  - calendarEvents (Plan 2)                                   │││
│  │  └─────────────────────────────────────────────────────────────┘││
│  └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTP/JSON
                                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    Cloudflare Workers (Edge)                         │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  API Routes                                                      ││
│  │  ┌──────────────────────┐  ┌───────────────────────────────┐   ││
│  │  │ Task API (Plan 1)    │  │ Calendar API (Plan 2)         │   ││
│  │  │ /api/queues/*        │  │ /api/google/auth/*            │   ││
│  │  │ /api/tasks/*         │  │ /api/google/accounts          │   ││
│  │  │                      │  │ /api/google/events            │   ││
│  │  └──────────────────────┘  └───────────────────────────────┘   ││
│  └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Durable Object Stubs
                                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      Durable Objects Layer                           │
│  ┌────────────┐  ┌──────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  UserDO    │  │ QueueDO  │  │ GoogleAcctDO │  │ CalendarDO   │ │
│  │  (Plan 1)  │  │ (Plan 1) │  │  (Plan 2)    │  │  (Plan 2)    │ │
│  └────────────┘  └──────────┘  └──────────────┘  └──────────────┘ │
│       │               │                │                  │         │
│       ↓               ↓                ↓                  ↓         │
│  ┌─────────┐    ┌──────────┐    ┌──────────┐      ┌──────────┐   │
│  │ SQLite  │    │ SQLite   │    │ SQLite   │      │ SQLite   │   │
│  │ Users   │    │ Queues   │    │ OAuth    │      │ Events   │   │
│  │ Prefs   │    │ Tasks    │    │ Tokens   │      │ Tasks    │   │
│  └─────────┘    └──────────┘    └──────────┘      └──────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                           │
                                           │ API Calls
                                           ↓
                                  ┌─────────────────┐
                                  │  Google APIs    │
                                  │  - Calendar     │
                                  │  - Tasks        │
                                  │  - OAuth        │
                                  └─────────────────┘
```

---

## Technology Stack Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
│  - React 19                                                  │
│  - TanStack Router (routing)                                 │
│  - TanStack Query (data fetching)                            │
│  - TanStack Form (form management)                           │
│  - Shadcn UI (component library)                             │
│  - Tailwind CSS (styling)                                    │
│  - Lucide Icons (icons)                                      │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                    API Layer                                 │
│  - Cloudflare Workers (serverless compute)                   │
│  - Zod (validation)                                          │
│  - JWT (authentication)                                      │
│  - CORS middleware                                           │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer                                │
│  - Cloudflare Durable Objects (stateful compute)             │
│  - SQLite (embedded database)                                │
│  - Point-in-time recovery (30 days)                          │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                    External Services                         │
│  - Auth Service (existing - JWT tokens)                      │
│  - Google Calendar API (Plan 2)                              │
│  - Google Tasks API (Plan 2)                                 │
│  - Google OAuth 2.0 (Plan 2)                                 │
└─────────────────────────────────────────────────────────────┘
```

---

**Last Updated:** 2025-10-18
**Purpose:** Visual reference for system architecture
