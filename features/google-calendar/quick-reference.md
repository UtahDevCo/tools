# Google Calendar Integration — Quick Reference

## Key Durable Objects
| DO | Purpose | Notes |
|----|---------|-------|
| `GoogleAccountDO` | Stores OAuth tokens, account metadata, calendar selections | One per Google account; encrypt refresh tokens; refresh tokens 5 min before expiry |
| `CalendarSyncDO` | Coordinates sync, caches events/tasks, tracks status | One per user; owns SQLite tables `calendar_events`, `google_tasks`, `sync_status` |

## Core Worker Endpoints
| Method & Path | Description | Auth |
|---------------|-------------|------|
| `GET /api/google/auth/start` | Returns OAuth URL + PKCE verifier | JWT required |
| `GET /api/google/auth/callback` | Exchanges code for tokens and stores in DO | Public (validates state/PKCE before issuing JWT session) |
| `GET /api/google/accounts` | List connected accounts, last sync timestamps | JWT |
| `DELETE /api/google/accounts/:id` | Disconnect account and purge cached data | JWT + ownership check |
| `POST /api/google/sync` | Manual sync trigger | JWT |
| `GET /api/google/sync` | Latest sync status | JWT |
| `GET /api/google/calendars` | Calendars grouped by account with visibility flag | JWT |
| `GET /api/google/events?start=iso&end=iso` | Calendar events (merged + grouped) | JWT |
| `GET /api/google/tasks` | Google Tasks grouped by task list | JWT |

## OAuth Configuration
- Redirect URI: `https://<worker-domain>/api/google/auth/callback`
- Required scopes:
  - `https://www.googleapis.com/auth/calendar.readonly`
  - `https://www.googleapis.com/auth/tasks.readonly`
  - `https://www.googleapis.com/auth/userinfo.email`
  - `https://www.googleapis.com/auth/userinfo.profile`
- Optional future scopes:
  - `https://www.googleapis.com/auth/calendar.events`
  - `https://www.googleapis.com/auth/tasks`
- Use PKCE (`S256`), state nonce, and short-lived session cookie after callback

## Sync Defaults
| Setting | Value |
|---------|-------|
| Auto sync interval | 15 minutes (cron trigger) |
| Manual sync cooldown | 60 seconds per user |
| Event window | Today -3 days to +14 days |
| Incremental updates | Google `syncToken`, fallback to full sync |
| Retry/backoff | 1s → 2s → 4s → 8s (max 5 attempts) |
| Cache eviction | Events older than 30 days removed nightly |

## Frontend Hooks (TanStack Query)
```typescript
export const useGoogleAccounts = () =>
  useQuery({
    queryKey: ['google', 'accounts'],
    queryFn: fetchAccounts,
    staleTime: 60_000,
  });

export const useCalendarEvents = (range: DateRange) =>
  useQuery({
    queryKey: ['google', 'events', range],
    queryFn: () => fetchEvents(range),
    staleTime: 5 * 60_000,
    refetchInterval: 15 * 60_000,
  });

export const useManualSync = () =>
  useMutation({
    mutationFn: triggerSync,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google', 'events'] });
      queryClient.invalidateQueries({ queryKey: ['google', 'accounts'] });
    },
  });
```

## UI Components (Shadcn)
| Component | Usage |
|-----------|-------|
| `Card` | Connected account entries, event cards |
| `Badge` | Sync status (`success`, `error`, `in-progress`) and calendar type |
| `Avatar` | Google profile image when available |
| `Button` | Connect account, manual sync, open in Google Calendar |
| `Dialog` / `Sheet` | Calendar selector modal, event detail drawer |
| `Switch` / `Select` | Calendar settings toggles |
| `ScrollArea` | Long lists of calendars or events |

## Event Presentation Guidelines
- Group events by date; headings `Today`, `Tomorrow`, `<Day>, <Mon> <DD>`
- Sort events by start time within each day; all-day events pinned to top
- Show `HH:MM` in user’s locale; all-day shows `All day`
- Include calendar badge (color + account email tooltip)
- Provide `Open in Google Calendar` button and optional `Create GTD Task` CTA
- Read-only display; editing occurs in Google until two-way sync is implemented

## Error Handling
- OAuth failure → redirect to settings with toast `Failed to connect Google account`
- Token refresh failure → mark account status as `error`, require reconnect
- Rate limit → show non-blocking warning, disable manual sync button for cooldown
- Sync failure → keep last successful cache, show timestamp + error banner

## Observability To-Dos
- Metrics: `google.sync.duration_ms`, `google.sync.events_count`, `google.sync.failures`
- Logs: include user ID, account ID (hashed), error codes from Google APIs
- Alerts: trigger on consecutive sync failures (>5 in 1 hour) or token refresh failures

## Deployment Notes
- Wrangler secrets: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- Cron schedule example: `*/15 * * * *`
- Feature flag recommended (`GOOGLE_CALENDAR_ENABLED`) for staged rollout
- Ensure Workers bindings for both DOs available in preview (dev) and production environments
