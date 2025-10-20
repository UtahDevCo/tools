# Plan 2: Google Calendar & Tasks Integration

## Goal
Surface Google Calendar events and Google Tasks from one or more connected Google accounts inside the GTD application so users can manage time-sensitive work without leaving their queues.

## Overview
This plan introduces OAuth-based account linking, durable storage for Google metadata, background synchronization, and dashboard updates that display calendar items grouped by day within each queue. It assumes the Durable Object persistence layer from Plan 1 is complete.

## Architecture

### Durable Object Types
1. **GoogleAccountDO** — one instance per connected Google account
   - Stores OAuth tokens (access, refresh, expiry)
   - Handles token refresh and quota tracking
   - Persists account metadata and selected calendars

2. **CalendarSyncDO** — one instance per user
   - Coordinates multi-account sync jobs
   - Caches normalized events and Google Tasks
   - Exposes status information to the UI

### High-Level Flows
```
OAuth Flow
Client → Google OAuth → Redirect URI → Worker Callback → GoogleAccountDO (store tokens)

Sync Flow
Manual Trigger / Scheduled Worker → CalendarSyncDO → GoogleAccountDO → Google APIs → Cache events/tasks

Display Flow
Client → TanStack Query → Worker API → CalendarSyncDO cache → Render calendar category in queue
```

## Implementation Phases

### Phase 1 — Google OAuth Foundations
- [ ] Register app + consent screen in Google Cloud Console
- [ ] Enable Calendar, Tasks, People APIs
- [ ] Store client ID/secret via Wrangler secrets
- [ ] Build `/api/google/auth/start` to generate OAuth URL and PKCE verifier
- [ ] Build `/api/google/auth/callback` to exchange code for tokens and persist in GoogleAccountDO
- [ ] Issue short-lived session token for the UI to confirm connection

### Phase 2 — Durable Objects & Storage
- [ ] Implement `GoogleAccountDO` with token refresh, scope validation, and encrypted storage (SQLite or KV)
- [ ] Implement `CalendarSyncDO` with SQLite tables for events, Google Tasks, and sync status
- [ ] Define schemas for `google_accounts`, `calendar_events`, `google_tasks`, and `sync_status`
- [ ] Add DO bindings to `wrangler.toml` and update Worker bootstrap
- [ ] Provide admin tooling to inspect a user's sync state (temporary CLI or debug endpoint)

### Phase 3 — Worker API Surface
- [ ] `/api/google/accounts` — GET (list connected accounts) & DELETE (disconnect)
- [ ] `/api/google/sync` — POST (manual trigger) & GET (latest status)
- [ ] `/api/google/calendars` — GET (available calendars grouped by account)
- [ ] `/api/google/events` — GET (events for date range, merged across accounts)
- [ ] `/api/google/tasks` — GET (Google Tasks grouped by list)
- [ ] Harden middleware (auth, rate limiting) for new routes

### Phase 4 — Sync Orchestration
- [ ] Implement incremental sync logic with support for `syncToken`
- [ ] Merge events from multiple accounts and deduplicate by Google event ID
- [ ] Normalize date handling (all-day vs timed, time zones)
- [ ] Persist sync status, timestamps, and error messages in `sync_status`
- [ ] Add scheduled Worker (Cron Trigger) to run automatic sync every 15 minutes
- [ ] Emit logs/metrics for sync duration, success rate, and API usage

### Phase 5 — Frontend Integration
- [ ] Create settings page (`/settings/google-accounts`) to connect/disconnect accounts
- [ ] Add calendar preferences page (auto-sync toggle, interval, default view, filters)
- [ ] Update queue view with new "Calendar" category and date-grouped events
- [ ] Implement `CalendarEventCard`, `DateGroup`, and `EventDetailDrawer`
- [ ] Wire TanStack Query hooks for accounts, events, sync status, and manual sync
- [ ] Provide manual sync button + progress indicator within dashboard

### Phase 6 — Testing & Hardening
- [ ] Unit tests for OAuth helpers, DO storage, token refresh, and event parsing
- [ ] Integration tests with mocked Google APIs covering multi-account sync and error cases
- [ ] Playwright flows: connect account, verify events render, disconnect account, manual sync
- [ ] Load testing for sync pipeline (multiple users, multiple accounts)
- [ ] Security review for token storage, scopes, and personal data handling

## Data Schemas (SQLite)

### `google_accounts`
```sql
CREATE TABLE IF NOT EXISTS google_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at INTEGER NOT NULL,
  scopes TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_sync_at INTEGER,
  UNIQUE(user_id, email)
);

CREATE INDEX idx_google_accounts_user_id ON google_accounts(user_id);
```

### `calendar_events`
```sql
CREATE TABLE IF NOT EXISTS calendar_events (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  calendar_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_time INTEGER NOT NULL,
  end_time INTEGER NOT NULL,
  all_day BOOLEAN DEFAULT 0,
  location TEXT,
  attendees TEXT,
  event_url TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (account_id) REFERENCES google_accounts(id)
);

CREATE INDEX idx_calendar_events_account_id ON calendar_events(account_id);
CREATE INDEX idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX idx_calendar_events_calendar_id ON calendar_events(calendar_id);
```

### `google_tasks`
```sql
CREATE TABLE IF NOT EXISTS google_tasks (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  task_list_id TEXT NOT NULL,
  title TEXT NOT NULL,
  notes TEXT,
  due_date INTEGER,
  completed BOOLEAN DEFAULT 0,
  position TEXT,
  task_url TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (account_id) REFERENCES google_accounts(id)
);

CREATE INDEX idx_google_tasks_account_id ON google_tasks(account_id);
CREATE INDEX idx_google_tasks_due_date ON google_tasks(due_date);
```

### `sync_status`
```sql
CREATE TABLE IF NOT EXISTS sync_status (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  last_sync_at INTEGER,
  last_sync_status TEXT CHECK(last_sync_status IN ('success', 'error', 'in_progress')),
  error_message TEXT,
  next_sync_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## Web Surfaces

### 1. Google Account Connection (`/settings/google-accounts`)
- Shows connected accounts, last sync time, manual sync button
- Uses Shadcn `Card`, `Avatar`, `Button`, `Badge`, `AlertDialog`
- Provides "Connect another account" CTA using OAuth start endpoint

### 2. Calendar Preferences (`/settings/calendar`)
- Toggles for auto-sync, all-day events, declined events
- Selects for sync interval, default view, date range
- Uses TanStack Form + Shadcn `Form`, `Switch`, `Select`, `Button`

### 3. Calendar Selection Dialog (modal in dashboard)
- Lists calendars grouped by account with checkboxes
- Persists selection per user in CalendarSyncDO or user DO
- Uses `Dialog`, `Checkbox`, `ScrollArea`, `Collapsible`

### 4. Dashboard Queue Updates (`/`)
- Adds "Calendar" category per queue with last sync indicator
- Groups events by date (Today, Tomorrow, explicit date)
- Each event renders via `CalendarEventCard` (read-only)
- Optional CTA to create GTD task from event

### 5. Event Detail Drawer
- Read-only details: duration, location, attendees, open-in-Google link
- Buttons: Close, Create Task from Event
- Uses Shadcn `Sheet`, `ScrollArea`, `Badge`, `Button`

## Validation (Zod)

```typescript
export const GoogleAccountSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  email: z.string().email(),
  accessToken: z.string(),
  refreshToken: z.string(),
  tokenExpiresAt: z.number().int().positive(),
  scopes: z.array(z.string()),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
  lastSyncAt: z.number().int().positive().nullable(),
});

export const CalendarEventSchema = z.object({
  id: z.string(),
  accountId: z.string().uuid(),
  calendarId: z.string(),
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  startTime: z.number().int().positive(),
  endTime: z.number().int().positive(),
  allDay: z.boolean(),
  location: z.string().max(500).optional(),
  attendees: z.array(z.string().email()).optional(),
  eventUrl: z.string().url().optional(),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
});

export const GoogleTaskSchema = z.object({
  id: z.string(),
  accountId: z.string().uuid(),
  taskListId: z.string(),
  title: z.string().min(1).max(500),
  notes: z.string().max(5000).optional(),
  dueDate: z.number().int().positive().optional(),
  completed: z.boolean(),
  position: z.string().optional(),
  taskUrl: z.string().url().optional(),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
});

export const CalendarSyncRequestSchema = z.object({
  startDate: z.number().int().positive().optional(),
  endDate: z.number().int().positive().optional(),
  calendarIds: z.array(z.string()).optional(),
  forceRefresh: z.boolean().optional(),
});

export const CalendarSettingsSchema = z.object({
  autoSyncEnabled: z.boolean(),
  syncIntervalMinutes: z.number().int().min(5).max(60),
  defaultView: z.enum(['today', 'week', 'all']),
  showAllDayEvents: z.boolean(),
  showDeclinedEvents: z.boolean(),
  dateRangeDays: z.number().int().min(1).max(90),
});

export const CreateTaskFromEventSchema = z.object({
  eventId: z.string(),
  queueId: z.string().uuid(),
  category: z.enum(['next', 'waiting', 'someday']),
  includeEventDetails: z.boolean().optional(),
});
```

## Google OAuth Scopes
```typescript
export const REQUIRED_SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/tasks.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

export const OPTIONAL_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/tasks',
];
```

## TanStack Usage Highlights
- `useQuery(['google', 'accounts'])` for connected accounts (stale time 60s)
- `useQuery(['google', 'events', { startDate, endDate }])` with refetch interval 15 minutes
- `useMutation` for manual sync (`/api/google/sync`) and disconnect account
- TanStack Form for calendar settings (Switch, Select, Button via Shadcn wrappers)

## Sync Pipeline Considerations
- Cache window defaults to 14 days forward and 3 days back
- Support incremental sync via `syncToken` to reduce API calls
- Fallback to full sync if token invalidated
- Apply exponential backoff (1s, 2s, 4s, max 5 attempts)
- Log metrics: sync duration, events fetched, API quota usage, failure reason

## Security & Privacy
- Encrypt refresh tokens before storage (Workers `crypto.subtle` + account-specific salt)
- Never expose tokens to the client; server to server only
- Respect user’s calendar selections to avoid ingesting private calendars by default
- Hard-delete tokens when disconnecting accounts (no soft delete)
- Provide audit trail of account connections in existing admin logs

## Performance Targets
- OAuth completion < 5 seconds for typical users
- Manual sync < 10 seconds for 30-day window with 3 accounts
- Cache hit rate > 80% for dashboard event queries
- API error rate < 1% during steady state

## Testing Strategy
- Unit: token refresh, schema validation, date grouping utilities
- Integration: OAuth callback handling, multi-account merge, incremental sync token reuse
- E2E: connect/disconnect accounts, manual sync, view events, create task from event
- Performance: load test sync pipeline with multiple concurrent cron triggers

## Success Criteria
- Calendar events and Google Tasks appear within queues with accurate grouping
- Sync automatically runs every 15 minutes and can be triggered manually
- Users can connect and disconnect multiple accounts without data leaks
- Errors surface gracefully with actionable messaging and retry guidance
- Documentation updated for any API or schema changes consumed by future plans

## Future Enhancements
- Two-way sync (create/update Google events from GTD)
- Additional providers (Microsoft 365, Apple)
- Webhook-based push sync for near real-time updates
- Event/task deduping powered by machine learning or heuristics
- Analytics on calendar usage to inform prioritization
