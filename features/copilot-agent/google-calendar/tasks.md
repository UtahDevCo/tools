# Plan 2 Task Checklist — Google Calendar Integration

Keep this checklist up to date as work progresses. When a task is complete, change `[ ]` to `[x]` and add context (PR link, date) as needed.

## 0. Foundations & Alignment
- [ ] Confirm Plan 1 Durable Object APIs are deployed and stable
- [ ] Review `plan.md` with engineering + product stakeholders
- [ ] Create staging Google Cloud project and configure consent screen
- [ ] Document secrets management steps (Wrangler, 1Password entry)

## 1. OAuth Enablement
- [ ] Enable Google Calendar, Tasks, People APIs in Google Cloud
- [ ] Capture client ID and secret as Wrangler secrets (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)
- [ ] Implement `/api/google/auth/start` (PKCE, scopes, redirect URL)
- [ ] Implement `/api/google/auth/callback` (token exchange, error handling)
- [ ] Store tokens + metadata in `GoogleAccountDO`
- [ ] Return short-lived success indicator to UI for post-redirect state
- [ ] Write unit tests for OAuth helpers and PKCE utilities

## 2. Durable Object & Storage Layer
- [ ] Scaffold `GoogleAccountDO` with encrypted storage helpers
- [ ] Scaffold `CalendarSyncDO` with SQLite initialization
- [ ] Add tables: `google_accounts`, `calendar_events`, `google_tasks`, `sync_status`
- [ ] Implement token refresh logic with expiry buffer
- [ ] Expose diagnostic method (e.g., `GET /api/google/debug`) gated by admin auth
- [ ] Update `wrangler.toml` with DO bindings + migrations
- [ ] Add Bun script to run schema migrations locally (if needed)

## 3. Worker APIs
- [ ] `/api/google/accounts` GET — return account list with last sync info
- [ ] `/api/google/accounts/:id` DELETE — revoke tokens and purge cached data
- [ ] `/api/google/sync` POST — manual sync trigger (queue job + immediate response)
- [ ] `/api/google/sync` GET — expose latest sync status
- [ ] `/api/google/calendars` GET — list calendars grouped by account
- [ ] `/api/google/events` GET — return events for date range (merge accounts + calendars)
- [ ] `/api/google/tasks` GET — surface Google Tasks data
- [ ] Harden auth middleware for `/api/google/*` routes and add rate limits
- [ ] Add integration tests covering happy path + error responses

## 4. Sync Engine
- [ ] Implement incremental sync with Google `syncToken`
- [ ] Build merge/deduplication logic for multi-account events
- [ ] Normalize all-day vs timed events + timezone handling
- [ ] Cache sync metrics (duration, fetched counts, errors) in `sync_status`
- [ ] Implement cron-triggered sync (every 15 minutes) with configurable interval
- [ ] Add exponential backoff + retry on API errors and rate limits
- [ ] Emit Cloudflare Logs (or analytics) for sync outcomes

## 5. Frontend Surfaces
### Settings
- [ ] `/settings/google-accounts` page listing accounts + connect/disconnect actions
- [ ] Manual sync button with optimistic UI feedback
- [ ] Sync status badges (success, in progress, error)

### Preferences
- [ ] `/settings/calendar` page using TanStack Form + Shadcn controls
- [ ] Persist settings to CalendarSyncDO (or user preferences DO)
- [ ] Calendar selection dialog to choose visible calendars per account

### Dashboard Integration
- [ ] Update queue rendering to include `Calendar` category with last sync timestamp
- [ ] Implement `DateGroup` headings (Today, Tomorrow, explicit date)
- [ ] Render `CalendarEventCard` with time, title, calendar badge, account hints
- [ ] Support link to open event in Google Calendar (new tab)
- [ ] Provide CTA to create GTD task from calendar event
- [ ] Add `EventDetailDrawer` for expanded view (description, attendees, location)
- [ ] Wrap TanStack Query hooks for accounts, events, sync status (with polling)

## 6. Quality Engineering
- [ ] Unit tests: token refresh, date utilities, data shapers
- [ ] Integration tests: OAuth callback, manual sync pipeline, multi-account dedupe
- [ ] Playwright flows: connect/disconnect, manual sync, event display, settings persistence
- [ ] Smoke tests for cron sync (trigger via Wrangler dev or staging)
- [ ] Accessibility review for new UI (keyboard, screen reader focus)

## 7. Observability & Ops
- [ ] Add metrics counters/ timers (sync duration, events fetched, failures)
- [ ] Add structured logging for OAuth attempts and sync outcomes
- [ ] Create runbook entry (failure modes, manual retry steps)
- [ ] Update monitoring/alerting rules for sync failures or token refresh errors

## 8. Release Management
- [ ] Confirm quota usage within Google Cloud project vs expected traffic
- [ ] Prepare feature flag or gradual rollout toggle
- [ ] Coordinate staging verification with product/support
- [ ] Document user-facing release notes and internal FAQ
- [ ] Enable production cron trigger after staged smoke test passes
- [ ] Post-release monitoring window (daily checks for first week)

## 9. Done Criteria Validation
- [ ] All above tasks checked
- [ ] Dashboard shows multi-account events grouped by day
- [ ] Automatic sync runs successfully for 7 consecutive days in staging
- [ ] Disconnecting an account removes cached data and revokes all tokens
- [ ] Docs updated with lessons learned + any new endpoints referenced by future work
