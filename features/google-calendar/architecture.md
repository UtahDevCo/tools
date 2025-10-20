# Google Calendar Integration Architecture

## Component Overview
```
┌────────────────────────────────────────────────────────────┐
│                    Cloudflare Workers                      │
│                                                            │
│  ┌──────────────────────────┐   ┌────────────────────────┐ │
│  │  GoogleAccountDO         │   │  CalendarSyncDO        │ │
│  │  (per Google account)    │   │  (per GTD user)        │ │
│  │                          │   │                        │ │
│  │  - Tokens (access/ref)   │   │  - Cached events/tasks │ │
│  │  - Account metadata      │   │  - Sync status         │ │
│  │  - Selected calendars    │   │  - Merge logic         │ │
│  └──────────────────────────┘   └────────────────────────┘ │
│            ▲                           ▲                   │
│            │                           │                   │
│            │                           │                   │
│   OAuth callback & refresh     Sync requests, cache reads  │
│            │                           │                   │
└────────────┼───────────────────────────┼────────────────────┘
             │                           │
             │                           │
             │                           │
      Google OAuth                GTD Frontend (Next.js)
             │                           │
             ▼                           ▼
      Google APIs (Calendar, Tasks)  TanStack Query Hooks
```

## OAuth Flow
```
User clicks "Connect Google Account"
      │
      ▼
`GET /api/google/auth/start` → generates state + PKCE, returns Google OAuth URL
      │
      ▼
User authenticates with Google → redirected to `/api/google/auth/callback`
      │
      ▼
Worker exchanges code for tokens → stores in GoogleAccountDO → issues short-lived session token
      │
      ▼
Frontend settings page polls `/api/google/accounts` and updates UI with new account
```

## Sync Flow
```
Manual Sync Button / Cron Trigger
      │
      ▼
`POST /api/google/sync`
      │
      ▼
CalendarSyncDO loads user config + account list
      │
      ▼
For each account:
  - Request valid access token from GoogleAccountDO
  - Fetch calendars/events/tasks (incremental via syncToken)
  - Normalize + store in SQLite
      │
      ▼
Update `sync_status` with success/error + timestamps
      │
      ▼
Invalidate cache → Dashboard `useCalendarEvents` refetches and re-renders
```

## Data Model Relationships
```
User (Durable Object from Plan 1)
  │
  ├── GoogleAccountDO (one per linked account)
  │      └── google_accounts (table rows per account)
  │
  └── CalendarSyncDO (one per user)
         ├── calendar_events (events aggregated across accounts)
         ├── google_tasks (Google Tasks per account/list)
         └── sync_status (single row per user)
```

## Deployment Requirements
- Update `wrangler.toml`:
  - `[[durable_objects.bindings]]` for `GoogleAccountDO`
  - `[[durable_objects.bindings]]` for `CalendarSyncDO`
  - `[[queues.producers]]` optional if manual sync is queued for async processing
  - `[[triggers.crons]]` for 15-minute sync cadence
- Secrets: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- Consider feature flag `GOOGLE_CALENDAR_ENABLED` to gate routes/UI

## Observability
- **Logs:** Structured JSON entries for OAuth attempts, sync start/finish, errors
- **Metrics:**
  - `google.sync.duration_ms`
  - `google.sync.events_count`
  - `google.sync.error` (counter)
  - `google.oauth.failures`
- **Tracing:** Tag sync operations with user ID hash, account count, API quota usage
- **Alerting:** Pager/notification when consecutive sync failures >5 or token refresh fails repeatedly

## Security Controls
- Encrypt refresh tokens with Worker `crypto.subtle` using per-account salt
- Never expose tokens to client; Worker-only access
- Rate-limit `/api/google/*` endpoints (e.g., 10 requests/minute per user)
- Store minimal metadata (email, display name) necessary for UX
- Provide admin audit logs when account is connected/disconnected

## Failure Modes & Mitigations
| Failure | Mitigation |
|---------|------------|
| Refresh token revoked | Mark account `error`, notify user to reconnect |
| Google API rate limit | Exponential backoff, surface warning, slow manual sync button |
| Sync token invalid | Fallback to full sync, reset `syncToken` |
| Worker crash mid-sync | Atomic writes inside DO; status flagged as `error` with retry option |
| Large event volume | Paginate Google API requests; stream into SQLite with transactions |

## Future Hooks
- Queue worker messages to offload long-running sync if DO execution time becomes a bottleneck
- Webhook ingestion (Google push notifications) to reduce polling
- Shared calendar support by storing ACL metadata in `calendar_events`
- Multi-region DO deployment if latency with Google APIs requires regional workers
