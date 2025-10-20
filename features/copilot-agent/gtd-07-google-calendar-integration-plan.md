# Plan 2: Google Calendar Integration for GTD Task Manager

## Goal
Create a Google Calendar integration that fetches events and tasks from multiple Google accounts and displays them alongside GTD lists, with each day's calendar items appearing as a separate list within each task queue.

## Overview
This plan adds Google Calendar integration to the GTD app, allowing users to:
- Connect multiple Google accounts (personal, work, etc.)
- Import calendar events and Google Tasks from all connected accounts
- Display calendar items for each day as a separate category/list within each queue
- Sync calendar data periodically to keep tasks up-to-date
- Optionally create Google Calendar events from GTD tasks

## Architecture

### Additional Durable Objects

1. **GoogleAccountDO** - One instance per connected Google account
   - Stores OAuth tokens (access token, refresh token)
   - Handles token refresh automatically
   - Stores account metadata (email, calendar list)
   - Rate limits API calls per account

2. **CalendarSyncDO** - One instance per user
   - Manages sync schedule and status
   - Coordinates fetching from multiple accounts
   - Caches calendar events and tasks
   - Handles sync conflicts and errors

### Data Flow
```
Google OAuth Flow:
Client → Google OAuth → Redirect → Worker API → GoogleAccountDO → Store tokens

Calendar Sync Flow:
Scheduled Worker/Manual Trigger → CalendarSyncDO → GoogleAccountDO → Google Calendar API → Cache events → Client refresh

Display Flow:
Client → TanStack Query → Worker API → CalendarSyncDO → Return cached events → Display in queue
```

## Implementation Steps

### Phase 1: Google OAuth Setup
- [ ] Register app in Google Cloud Console
- [ ] Configure OAuth consent screen
- [ ] Add Calendar and Tasks API scopes
- [ ] Store OAuth client ID/secret in Cloudflare secrets
- [ ] Create OAuth redirect endpoint in worker

### Phase 2: Durable Objects
- [ ] Create GoogleAccountDO with token storage and refresh logic
- [ ] Create CalendarSyncDO with event caching and sync scheduling
- [ ] Implement Google Calendar API client
- [ ] Implement Google Tasks API client

### Phase 3: API Endpoints
- [ ] `/api/google/auth/start` - Initiate OAuth flow
- [ ] `/api/google/auth/callback` - Handle OAuth redirect
- [ ] `/api/google/accounts` - GET (list), DELETE (disconnect account)
- [ ] `/api/google/sync` - POST (manual sync), GET (sync status)
- [ ] `/api/google/calendars` - GET (list calendars for all accounts)
- [ ] `/api/google/events` - GET (fetch events for date range)
- [ ] `/api/google/tasks` - GET (fetch Google Tasks)

### Phase 4: Frontend Integration
- [ ] Create Google account connection page
- [ ] Add "Calendar" category to each queue (alongside Next, Waiting, Someday)
- [ ] Display calendar events grouped by date
- [ ] Implement sync status indicator
- [ ] Add manual sync button
- [ ] Handle account disconnection

### Phase 5: Sync Logic
- [ ] Implement periodic sync (every 15 minutes)
- [ ] Handle token refresh automatically
- [ ] Merge events from multiple accounts
- [ ] Group events by date
- [ ] Filter all-day events vs timed events

### Phase 6: Testing
- [ ] Unit tests for OAuth flow
- [ ] Integration tests for Google API calls
- [ ] E2E tests for account connection and sync
- [ ] Test with multiple Google accounts

## Data Schemas

### Google Account Schema (SQLite in GoogleAccountDO)
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

### Calendar Event Cache Schema (SQLite in CalendarSyncDO)
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

### Sync Status Schema (SQLite in CalendarSyncDO)
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

## Web Pages Required

### 1. Google Account Connection Page (new - `/settings/google-accounts`)
**Purpose:** Manage connected Google accounts

**Forms (TanStack Form):**
- No traditional form - OAuth redirect flow
- Delete confirmation dialog (not a form, just confirmation)

**Shadcn Components:**
- `Card` - Account card showing connected accounts
- `Avatar` - Google account profile picture
- `Button` - Connect account, disconnect account, sync now
- `Badge` - Sync status indicator (synced, syncing, error)
- `AlertDialog` - Disconnect confirmation
- `Separator` - Between accounts
- `ScrollArea` - List of connected accounts

**Layout:**
```
┌─────────────────────────────────────────┐
│ Connected Google Accounts               │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 👤 user@gmail.com                   │ │
│ │ Last synced: 2 minutes ago          │ │
│ │ [Sync Now] [Disconnect]             │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 👤 work@company.com                 │ │
│ │ Last synced: 5 minutes ago          │ │
│ │ [Sync Now] [Disconnect]             │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [+ Connect Another Account]             │
└─────────────────────────────────────────┘
```

### 2. Calendar Settings Page (new - `/settings/calendar`)
**Purpose:** Configure calendar sync preferences

**Forms (TanStack Form):**
- Calendar sync settings form:
  - Auto-sync enabled (toggle)
  - Sync interval (select: 5min, 15min, 30min, 1hr)
  - Default view (select: today, week, all)
  - Show all-day events (toggle)
  - Show declined events (toggle)
  - Date range (select: 7 days, 14 days, 30 days)

**Shadcn Components:**
- `Form` - Settings form wrapper
- `Switch` - Toggle controls
- `Select` - Dropdown selections
- `Label` - Form labels
- `Button` - Save settings
- `Separator` - Section dividers

### 3. Calendar Selection Dialog (new - modal in dashboard)
**Purpose:** Select which calendars to display

**Forms (TanStack Form):**
- Calendar filter form with checkboxes for each calendar from each account

**Shadcn Components:**
- `Dialog` - Modal container
- `Checkbox` - Calendar selection
- `ScrollArea` - List of calendars
- `Collapsible` - Group calendars by account
- `Button` - Apply, cancel

**Layout:**
```
┌─────────────────────────────────────────┐
│ Select Calendars                        │
│                                         │
│ ▼ user@gmail.com                        │
│   ☑ Personal                            │
│   ☑ Work                                │
│   ☐ Birthdays                           │
│                                         │
│ ▼ work@company.com                      │
│   ☑ Team Calendar                       │
│   ☑ Project Deadlines                   │
│   ☐ Holidays                            │
│                                         │
│ [Cancel] [Apply]                        │
└─────────────────────────────────────────┘
```

### 4. Dashboard Updates (existing - `/`)
**Updates needed:**
- Add "Calendar" category section to each queue
- Display calendar events grouped by date within the category
- Each date becomes a subsection: "Today", "Tomorrow", "Wed Dec 18", etc.
- Show event time, title, and calendar source
- Click event to see details (non-editable, read-only)
- Optional: Click to create GTD task from calendar event

**New Components:**
- `CalendarCategorySection` - Special category for calendar events
- `CalendarEventCard` - Display calendar event (similar to TaskCard but read-only)
- `DateGroup` - Group events by date
- `EventDetailDrawer` - View event details

**Shadcn Components:**
- `Card` - Event card
- `Badge` - Event type (meeting, reminder, all-day)
- `Sheet` - Event detail drawer
- `Separator` - Between date groups
- `Button` - Create task from event

**Layout in Queue:**
```
┌─────────────────────────────────────────┐
│ Work Queue                              │
│                                         │
│ Next Actions                            │
│ ├─ Task 1                               │
│ └─ Task 2                               │
│                                         │
│ Calendar [Last synced: 2m ago] [Sync]   │
│ ├─ Today, Dec 17                        │
│ │  ├─ 9:00 AM - Team Standup            │
│ │  ├─ 10:30 AM - Client Call            │
│ │  └─ 2:00 PM - Project Review          │
│ │                                        │
│ ├─ Tomorrow, Dec 18                     │
│ │  ├─ All Day - Company Holiday         │
│ │  └─ 1:00 PM - Weekly Sync             │
│ │                                        │
│ └─ Thu, Dec 19                          │
│    └─ 11:00 AM - Design Meeting         │
│                                         │
│ Waiting On                              │
│ └─ Task 3                               │
└─────────────────────────────────────────┘
```

### 5. Event Detail Drawer (new - component)
**Purpose:** View full calendar event details (read-only)

**No form** - Display only, with optional "Create Task" button

**Shadcn Components:**
- `Sheet` - Drawer container
- `ScrollArea` - Event details
- `Badge` - Attendee status, event type
- `Button` - Close, create task from event, open in Google Calendar
- `Separator` - Section dividers

**Content:**
- Event title
- Date and time
- Calendar name and account
- Location (if present)
- Description (if present)
- Attendees (if present)
- Link to open in Google Calendar

## Zod Schemas (for validation)

```typescript
// Google Account
const GoogleAccountSchema = z.object({
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

// Calendar Event
const CalendarEventSchema = z.object({
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

// Google Task
const GoogleTaskSchema = z.object({
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

// API Request Schemas
const CalendarSyncRequestSchema = z.object({
  startDate: z.number().int().positive().optional(),
  endDate: z.number().int().positive().optional(),
  calendarIds: z.array(z.string()).optional(),
  forceRefresh: z.boolean().optional(),
});

const CalendarSettingsSchema = z.object({
  autoSyncEnabled: z.boolean(),
  syncIntervalMinutes: z.number().int().min(5).max(60),
  defaultView: z.enum(['today', 'week', 'all']),
  showAllDayEvents: z.boolean(),
  showDeclinedEvents: z.boolean(),
  dateRangeDays: z.number().int().min(1).max(90),
});

const CreateTaskFromEventSchema = z.object({
  eventId: z.string(),
  queueId: z.string().uuid(),
  category: z.enum(['next', 'waiting', 'someday']),
  includeEventDetails: z.boolean().optional(),
});
```

## Google OAuth Scopes Required

```typescript
const REQUIRED_SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/tasks.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

// Optional scopes for future enhancements:
const OPTIONAL_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events', // Create/edit events
  'https://www.googleapis.com/auth/tasks', // Create/edit tasks
];
```

## TanStack Packages Usage

### TanStack Query for Calendar Data

```typescript
// Fetch connected accounts
const accountsQuery = useQuery({
  queryKey: ['google', 'accounts'],
  queryFn: async () => {
    const response = await fetch('/api/google/accounts');
    return response.json();
  },
  staleTime: 60000, // 1 minute
});

// Fetch calendar events with date range
const eventsQuery = useQuery({
  queryKey: ['google', 'events', { startDate, endDate }],
  queryFn: async () => {
    const response = await fetch(
      `/api/google/events?start=${startDate}&end=${endDate}`
    );
    return response.json();
  },
  staleTime: 300000, // 5 minutes
  refetchInterval: 900000, // Auto-refetch every 15 minutes
});

// Manual sync mutation
const syncMutation = useMutation({
  mutationFn: async () => {
    const response = await fetch('/api/google/sync', {
      method: 'POST',
    });
    return response.json();
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['google', 'events'] });
    toast.success('Calendar synced successfully');
  },
  onError: (error) => {
    toast.error('Failed to sync calendar');
  },
});

// Disconnect account mutation
const disconnectMutation = useMutation({
  mutationFn: async (accountId: string) => {
    const response = await fetch(`/api/google/accounts/${accountId}`, {
      method: 'DELETE',
    });
    return response.json();
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['google', 'accounts'] });
    queryClient.invalidateQueries({ queryKey: ['google', 'events'] });
    toast.success('Account disconnected');
  },
});
```

### TanStack Form for Settings

```typescript
import { useForm } from '@tanstack/react-form';

function CalendarSettingsForm() {
  const form = useForm({
    defaultValues: {
      autoSyncEnabled: true,
      syncIntervalMinutes: 15,
      defaultView: 'week' as const,
      showAllDayEvents: true,
      showDeclinedEvents: false,
      dateRangeDays: 14,
    },
    onSubmit: async (values) => {
      await fetch('/api/settings/calendar', {
        method: 'PUT',
        body: JSON.stringify(values),
      });
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      <form.Field
        name="autoSyncEnabled"
        children={(field) => (
          <div className="flex items-center space-x-2">
            <Switch
              checked={field.state.value}
              onCheckedChange={(checked) => field.handleChange(checked)}
            />
            <Label>Auto-sync enabled</Label>
          </div>
        )}
      />
      
      <form.Field
        name="syncIntervalMinutes"
        children={(field) => (
          <Select
            value={String(field.state.value)}
            onValueChange={(value) => field.handleChange(Number(value))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">Every 5 minutes</SelectItem>
              <SelectItem value="15">Every 15 minutes</SelectItem>
              <SelectItem value="30">Every 30 minutes</SelectItem>
              <SelectItem value="60">Every hour</SelectItem>
            </SelectContent>
          </Select>
        )}
      />

      <Button type="submit">Save Settings</Button>
    </form>
  );
}
```

## Google Calendar API Integration

### Token Refresh Logic (in GoogleAccountDO)

```typescript
class GoogleAccountDO {
  async refreshAccessToken(refreshToken: string): Promise<string> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.env.GOOGLE_CLIENT_ID,
        client_secret: this.env.GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    const data = await response.json();
    
    // Update stored token
    await this.updateAccessToken(data.access_token, data.expires_in);
    
    return data.access_token;
  }

  async getValidAccessToken(): Promise<string> {
    const account = await this.getAccount();
    
    // Check if token is expired or about to expire (5 min buffer)
    const now = Date.now() / 1000;
    if (account.tokenExpiresAt - now < 300) {
      return await this.refreshAccessToken(account.refreshToken);
    }
    
    return account.accessToken;
  }
}
```

### Calendar Events Fetch (in CalendarSyncDO)

```typescript
class CalendarSyncDO {
  async fetchCalendarEvents(
    accountId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CalendarEvent[]> {
    const accountDO = this.env.GOOGLE_ACCOUNT_DO.get(
      this.env.GOOGLE_ACCOUNT_DO.idFromString(accountId)
    );
    
    const accessToken = await accountDO.getValidAccessToken();
    
    // Fetch from all calendars for this account
    const calendars = await this.getCalendarList(accountId);
    const allEvents: CalendarEvent[] = [];
    
    for (const calendar of calendars) {
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.id)}/events?` +
        new URLSearchParams({
          timeMin: startDate.toISOString(),
          timeMax: endDate.toISOString(),
          singleEvents: 'true',
          orderBy: 'startTime',
        }),
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      
      const data = await response.json();
      const events = data.items.map(item => this.parseCalendarEvent(item, accountId, calendar.id));
      allEvents.push(...events);
    }
    
    // Cache events in SQLite
    await this.cacheEvents(allEvents);
    
    return allEvents;
  }

  parseCalendarEvent(googleEvent: any, accountId: string, calendarId: string): CalendarEvent {
    return {
      id: googleEvent.id,
      accountId,
      calendarId,
      title: googleEvent.summary || '(No title)',
      description: googleEvent.description,
      startTime: new Date(googleEvent.start.dateTime || googleEvent.start.date).getTime(),
      endTime: new Date(googleEvent.end.dateTime || googleEvent.end.date).getTime(),
      allDay: !googleEvent.start.dateTime,
      location: googleEvent.location,
      attendees: googleEvent.attendees?.map(a => a.email),
      eventUrl: googleEvent.htmlLink,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }
}
```

## Security Considerations

### OAuth Token Storage
- Store refresh tokens encrypted in Durable Objects
- Access tokens kept in memory with short expiry
- Never expose tokens to client
- Rotate tokens on each use

### API Rate Limiting
- Respect Google Calendar API quotas (10,000 requests/day default)
- Implement exponential backoff for failed requests
- Cache aggressively to minimize API calls
- Use conditional requests (If-None-Match) when possible

### Data Privacy
- Only fetch calendars user explicitly enables
- Don't store event attendee emails unless necessary
- Provide clear disconnect/delete data option
- GDPR compliance for EU users

## Performance Optimizations

### Caching Strategy
- Cache events in CalendarSyncDO SQLite for 15 minutes
- Use TanStack Query client-side cache (5 min stale time)
- Implement incremental sync (only fetch changed events)
- Background refresh without blocking UI

### Sync Optimization
- Fetch events in parallel from multiple accounts
- Batch API requests when possible
- Use pagination for large calendar lists
- Implement webhook notifications for instant updates (future)

### UI Performance
- Virtual scrolling for long event lists
- Lazy load event details (only fetch on drawer open)
- Debounce sync button to prevent spam
- Show skeleton loaders during initial fetch

## Error Handling

### OAuth Errors
- Expired refresh token → Prompt user to reconnect account
- Invalid scope → Show clear error message
- User denied access → Remove account connection attempt

### API Errors
- Network timeout → Retry with exponential backoff
- Rate limit → Show user-friendly message, pause sync
- Invalid calendar ID → Skip calendar, log error
- Token expired → Auto-refresh and retry

### Sync Errors
- Partial sync failure → Show which accounts failed, allow retry
- Complete sync failure → Fall back to cached data, show error
- Conflict errors → Log and continue with next account

## Testing Strategy

### Unit Tests
- Token refresh logic
- Event parsing and transformation
- Date grouping logic
- Zod schema validation

### Integration Tests
- OAuth flow end-to-end
- Calendar API calls with mock responses
- Multi-account sync coordination
- Cache invalidation scenarios

### E2E Tests (Playwright)
- Connect Google account
- View synced events in dashboard
- Disconnect account
- Manual sync trigger
- Settings configuration

## Migration Path

### Phase 1: Foundation
1. Deploy GoogleAccountDO and CalendarSyncDO
2. Implement OAuth flow
3. Basic event fetching
4. Display in new "Calendar" category

### Phase 2: Enhancement
1. Add multi-account support
2. Implement settings page
3. Add calendar selection filters
4. Optimize sync performance

### Phase 3: Polish
1. Create task from calendar event
2. Event detail drawer
3. Sync status indicators
4. Error handling and retry logic

## Success Metrics

### Technical
- [ ] OAuth flow completes in < 5 seconds
- [ ] Sync completes in < 10 seconds for 30 days of events
- [ ] Support up to 5 connected accounts per user
- [ ] Cache hit rate > 80%
- [ ] API error rate < 1%

### User Experience
- [ ] Clear indication of sync status
- [ ] Events grouped intuitively by date
- [ ] Easy to connect/disconnect accounts
- [ ] Settings are discoverable and clear
- [ ] Calendar events visually distinct from GTD tasks

## Future Enhancements
- Two-way sync: Create Google Calendar events from GTD tasks
- Edit calendar events from GTD app
- Task completion syncs to Google Tasks
- Calendar event reminders integrated with GTD notifications
- Filter events by calendar, attendees, keywords
- Smart suggestions: Create GTD tasks from event descriptions
- Recurring event handling
- Shared calendar support
- Integration with other calendar providers (Outlook, Apple)
