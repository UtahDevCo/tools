# GTD Enhancement Plans - Quick Reference Card

## 📋 Two Plans Overview

### Plan 1: Durable Objects (Foundation) 🗄️
**Goal:** Persistent storage for tasks and queues

**What Changes:**
- Replace React state with API calls
- Store data in Cloudflare Durable Objects
- SQLite backend for durability

**Key Technologies:**
- TanStack Query for data fetching
- TanStack Form for all forms
- Zod for validation

### Plan 2: Google Calendar (Enhancement) 📅
**Goal:** Sync calendar events from multiple Google accounts

**What's New:**
- Connect multiple Google accounts
- Display calendar events in each queue
- Events grouped by date (Today, Tomorrow, etc.)
- Read-only calendar events alongside tasks

**Key Technologies:**
- Google OAuth 2.0
- Google Calendar API
- Google Tasks API
- TanStack Query for calendar data

---

## 🎯 Implementation Order

```
1. Plan 1 First (Foundation)
   ├─ Durable Objects setup
   ├─ API endpoints
   └─ Frontend integration
   
2. Plan 2 Second (Enhancement)
   ├─ Google OAuth
   ├─ Calendar sync
   └─ Display in queues
```

**Why this order?** Plan 2 requires Plan 1's infrastructure.

---

## 📝 Forms Using TanStack Form

### Plan 1 Forms
1. **Quick Add Task** (inline)
   - Title input
   
2. **Task Detail** (drawer)
   - Title, description, category, queue, completed
   
3. **Queue Settings** (modal)
   - Name, color, position

### Plan 2 Forms
1. **Calendar Settings** (page)
   - Auto-sync toggle, interval, view options, date range
   
2. **Calendar Selection** (modal)
   - Checkbox list of calendars

---

## 🎨 Shadcn Components Used

### Common (Both Plans)
- `Button` - Actions and CTAs
- `Input` - Text fields
- `Label` - Form labels
- `Dialog` - Modal dialogs
- `Sheet` - Side drawers
- `Card` - Content containers

### Plan 1 Specific
- `Checkbox` - Task completion
- `Textarea` - Task description
- `Select` - Category/queue selection
- `Skeleton` - Loading states

### Plan 2 Specific
- `Switch` - Toggle settings
- `Badge` - Sync status
- `Avatar` - Google account
- `Collapsible` - Calendar groups
- `ScrollArea` - Long lists

---

## 🔌 API Endpoints

### Plan 1: Task Management
```
GET    /api/queues              List queues
POST   /api/queues              Create queue
GET    /api/queues/:id          Get queue + tasks
PUT    /api/queues/:id          Update queue
DELETE /api/queues/:id          Delete queue
POST   /api/queues/:id/tasks    Create task
PUT    /api/tasks/:id           Update task
DELETE /api/tasks/:id           Delete task
POST   /api/tasks/batch         Bulk operations
```

### Plan 2: Calendar Integration
```
GET    /api/google/auth/start       Start OAuth
GET    /api/google/auth/callback    OAuth redirect
GET    /api/google/accounts         List accounts
DELETE /api/google/accounts/:id     Disconnect
POST   /api/google/sync             Manual sync
GET    /api/google/events           Get events
GET    /api/google/calendars        List calendars
```

---

## 🗂️ Durable Objects

### Plan 1
- **UserDO** - User data and queue list
- **QueueDO** - Queue + all its tasks

### Plan 2
- **GoogleAccountDO** - OAuth tokens per account
- **CalendarSyncDO** - Event cache and sync status

---

## 📄 New Web Pages

### Plan 1
- Dashboard (existing - updated)
- Task Detail Drawer (existing - updated)
- Queue Settings Modal (new)

### Plan 2
- `/settings/google-accounts` (new)
- `/settings/calendar` (new)
- Calendar Selection Modal (new)
- Event Detail Drawer (new)
- Dashboard Calendar Section (new)

---

## ✅ Success Criteria

### Plan 1
- ✅ Tasks persist across sessions
- ✅ API < 50ms response time
- ✅ Optimistic updates work
- ✅ Zero data loss

### Plan 2
- ✅ OAuth flow < 5 seconds
- ✅ Sync completes < 10 seconds
- ✅ Support 5 Google accounts
- ✅ 80%+ cache hit rate

---

## 🚀 Getting Started

1. Read the summary: `features/gtd-enhancement-plans-summary.md`
2. Deep dive Plan 1: `features/copilot-agent/cloudflare-do/plan.md`
3. Deep dive Plan 2: `features/copilot-agent/google-calendar/plan.md`
4. Start implementation with Plan 1

---

## 📚 Key Concepts

### Optimistic Updates
- UI updates immediately
- API call happens in background
- Rollback if API fails
- Provided by TanStack Query

### Durable Objects
- One instance per entity (user, queue)
- SQLite backend for persistence
- Strong consistency within object
- Geographic distribution

### Google OAuth
- Multi-account support
- Automatic token refresh
- Scoped access (read-only)
- Secure token storage

---

## 🔐 Security Highlights

### Plan 1
- JWT authentication required
- Zod validation on all inputs
- User can only access own data
- Rate limiting per user

### Plan 2
- OAuth tokens encrypted
- Never expose tokens to client
- Respect API rate limits
- GDPR compliant data handling

---

## 💡 Pro Tips

1. **Plan 1 before Plan 2** - Foundation first
2. **Use TanStack Query** - Built-in caching and optimistic updates
3. **Validate with Zod** - Type-safe validation everywhere
4. **Test incrementally** - Unit → Integration → E2E
5. **Start with read-only** - For calendar integration

---

## 📞 Quick Links

- **Summary:** [gtd-enhancement-plans-summary.md](./gtd-enhancement-plans-summary.md)
- **Plan 1 Detail:** [cloudflare-do/plan.md](./cloudflare-do/plan.md)
- **Plan 2 Detail:** [google-calendar/plan.md](./google-calendar/plan.md)
- **Features Index:** [README.md](./README.md)

---

**Last Updated:** 2025-10-18
**Status:** Planning Complete, Ready for Implementation
