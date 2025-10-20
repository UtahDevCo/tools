# GTD Enhancement Plans - Comparison and Dependencies

## Side-by-Side Comparison

| Aspect | Plan 1: Durable Objects | Plan 2: Google Calendar |
|--------|-------------------------|------------------------|
| **Primary Goal** | Persistent data storage | Calendar integration |
| **Replaces** | Mock data in React state | N/A (new feature) |
| **Adds** | API endpoints for CRUD | Calendar event display |
| **Dependencies** | Auth service (existing) | Plan 1 + Google APIs |
| **Complexity** | Medium | High |
| **Lines of Code** | ~2,000-3,000 | ~3,000-4,000 |
| **New Durable Objects** | UserDO, QueueDO | GoogleAccountDO, CalendarSyncDO |
| **External APIs** | None | Google Calendar, Tasks |
| **OAuth Required** | No | Yes |
| **User-facing Changes** | Tasks persist (invisible) | New calendar features |
| **Breaking Changes** | None | None |
| **Can Deploy Independently** | Yes | No (requires Plan 1) |

## Technology Stack Comparison

| Technology | Plan 1 | Plan 2 |
|------------|--------|--------|
| **TanStack Query** | ✅ Core feature | ✅ Core feature |
| **TanStack Form** | ✅ 3 forms | ✅ 2 forms |
| **Zod Validation** | ✅ All schemas | ✅ All schemas |
| **Cloudflare Workers** | ✅ API layer | ✅ API layer |
| **Durable Objects** | ✅ UserDO, QueueDO | ✅ GoogleAccountDO, CalendarSyncDO |
| **SQLite** | ✅ Task/queue data | ✅ Calendar cache |
| **Shadcn UI** | ✅ 10+ components | ✅ 15+ components |
| **Google APIs** | ❌ Not needed | ✅ Calendar + Tasks |
| **OAuth 2.0** | ❌ Not needed | ✅ Multi-account |
| **Periodic Sync** | ❌ Not needed | ✅ Every 15 min |

## Web Pages Impact

| Page/Component | Current State | After Plan 1 | After Plan 2 |
|----------------|---------------|--------------|--------------|
| **Dashboard** | Mock data | API data | API + Calendar |
| **Task Drawer** | Component exists | Updated forms | No change |
| **Queue Settings** | Doesn't exist | New modal | No change |
| **Google Accounts** | Doesn't exist | N/A | New page |
| **Calendar Settings** | Doesn't exist | N/A | New page |
| **Calendar Section** | Doesn't exist | N/A | New in queues |

## Data Flow Comparison

### Plan 1: Task Management Flow
```
User Action (Create Task)
    ↓
TanStack Form (Validation)
    ↓
TanStack Query Mutation (Optimistic Update)
    ↓
POST /api/queues/:id/tasks
    ↓
Worker API Handler
    ↓
QueueDO.createTask()
    ↓
SQLite INSERT
    ↓
Response
    ↓
TanStack Query Cache Update
    ↓
UI Reflects Change
```

### Plan 2: Calendar Sync Flow
```
User Connects Google Account
    ↓
OAuth Flow (Google)
    ↓
Store Tokens in GoogleAccountDO
    ↓
Periodic Sync (Every 15 min)
    ↓
CalendarSyncDO.syncEvents()
    ↓
Google Calendar API (with token refresh)
    ↓
Cache Events in SQLite
    ↓
User Opens Dashboard
    ↓
TanStack Query Fetch
    ↓
GET /api/google/events
    ↓
Return Cached Events
    ↓
Display in Calendar Section
```

## Implementation Dependencies

### Plan 1 Dependencies
```
Plan 1 Implementation
├── Existing Auth Service ✅
├── Cloudflare Workers Infrastructure ✅
├── React + TanStack Router ✅
└── No blocking dependencies
```

### Plan 2 Dependencies
```
Plan 2 Implementation
├── Plan 1 Complete ⚠️ REQUIRED
│   ├── Durable Objects infrastructure
│   ├── API pattern established
│   └── Queue structure in place
├── Google Cloud Console Setup ❌ NEW
├── OAuth Client Credentials ❌ NEW
└── Google API Access ❌ NEW
```

## Development Timeline Estimate

| Phase | Plan 1 | Plan 2 |
|-------|--------|--------|
| **Setup** | 2 days | 3 days |
| **Durable Objects** | 4 days | 3 days |
| **API Endpoints** | 3 days | 4 days |
| **Frontend** | 5 days | 6 days |
| **Testing** | 3 days | 4 days |
| **Polish** | 2 days | 3 days |
| **Total** | ~3 weeks | ~3-4 weeks |

**Note:** These are estimates for one developer working full-time.

## Testing Complexity

### Plan 1 Testing
- **Unit Tests:** Medium complexity
  - Durable Object methods
  - Zod schema validation
  - API handlers
  
- **Integration Tests:** Medium complexity
  - Full CRUD flows
  - Optimistic updates
  - Error scenarios
  
- **E2E Tests:** Low-Medium complexity
  - Create/edit/delete tasks
  - Move tasks between queues
  - Drag and drop

### Plan 2 Testing
- **Unit Tests:** High complexity
  - OAuth flow logic
  - Token refresh logic
  - Event parsing
  - Date grouping
  
- **Integration Tests:** High complexity
  - OAuth end-to-end
  - Multi-account sync
  - API rate limiting
  - Cache invalidation
  
- **E2E Tests:** Medium-High complexity
  - Connect account
  - Sync events
  - Display in queues
  - Disconnect account

## Risk Assessment

### Plan 1 Risks
| Risk | Severity | Mitigation |
|------|----------|------------|
| Data loss during migration | Low | No existing data to migrate |
| Performance issues | Low | Durable Objects are fast |
| Breaking existing UI | Medium | Incremental integration |
| API design flaws | Medium | Follow existing patterns |

### Plan 2 Risks
| Risk | Severity | Mitigation |
|------|----------|------------|
| Google API rate limits | Medium | Aggressive caching |
| OAuth flow complexity | Medium | Use proven libraries |
| Token refresh failures | Medium | Robust error handling |
| Multi-account conflicts | Medium | Clear account isolation |
| Sync performance | High | Parallel fetching, pagination |

## Cost Implications

### Plan 1 Costs
- **Durable Objects:** ~$0.10/month for 1,000 users
- **Workers Requests:** Included in paid plan
- **Storage:** Minimal (tasks are small)
- **Total:** ~$0.10/month incremental

### Plan 2 Costs
- **Durable Objects:** ~$0.05/month additional
- **Google API Calls:** Free (within limits)
- **Storage:** ~$0.05/month for event cache
- **Workers Requests:** Minimal increase
- **Total:** ~$0.10/month incremental

**Combined Total:** ~$0.20/month for 1,000 users

## Feature Overlap

| Feature | Plan 1 | Plan 2 | Notes |
|---------|--------|--------|-------|
| **User Authentication** | Uses existing | Uses existing | No overlap |
| **Durable Objects** | UserDO, QueueDO | GoogleAccountDO, CalendarSyncDO | Different objects |
| **TanStack Query** | Task data | Calendar data | Different query keys |
| **TanStack Form** | Task forms | Settings forms | Different forms |
| **Dashboard** | Task lists | Calendar section | Different areas |
| **API Endpoints** | `/api/queues/*`, `/api/tasks/*` | `/api/google/*` | No overlap |

**Conclusion:** Minimal overlap, clean separation of concerns.

## Migration Strategy

### Plan 1 Migration
1. **Phase 1:** Deploy Durable Objects infrastructure
2. **Phase 2:** Deploy API endpoints (parallel to mock data)
3. **Phase 3:** Switch frontend to use API (feature flag)
4. **Phase 4:** Remove mock data code
5. **Rollback:** Feature flag can revert to mock data

### Plan 2 Migration
1. **Phase 1:** Deploy Google OAuth and Durable Objects
2. **Phase 2:** Deploy calendar sync (no UI yet)
3. **Phase 3:** Add calendar section to dashboard (opt-in)
4. **Phase 4:** Promote calendar feature to all users
5. **Rollback:** Remove calendar section, keep data

## Success Metrics

### Plan 1 Metrics
- ✅ 100% of tasks persisted
- ✅ <50ms API response time (p95)
- ✅ 0% data loss rate
- ✅ 100% test coverage for CRUD operations
- ✅ <1% error rate on mutations

### Plan 2 Metrics
- ✅ <5s OAuth flow completion
- ✅ <10s sync time for 30 days of events
- ✅ 5 Google accounts supported
- ✅ >80% cache hit rate
- ✅ <5% sync failure rate
- ✅ <1% token refresh failure rate

## When to Start Plan 2

**Start Plan 2 ONLY when:**
1. ✅ Plan 1 is fully implemented
2. ✅ Plan 1 is tested and deployed to production
3. ✅ Plan 1 has been stable for at least 1 week
4. ✅ All Plan 1 bugs are resolved
5. ✅ Users are successfully using persistent tasks
6. ✅ Team has bandwidth for another major feature

**Why wait?**
- Plan 2 builds on Plan 1's infrastructure
- Rushing could lead to instability
- Better to have one solid feature than two buggy ones
- Allows team to learn from Plan 1 deployment

## Recommendation

**Recommended Approach:**
1. ✅ **Implement Plan 1 first** (3 weeks)
2. ✅ **Deploy to production and monitor** (1 week)
3. ✅ **Fix any issues found** (ongoing)
4. ✅ **Start Plan 2 implementation** (3-4 weeks)
5. ✅ **Deploy Plan 2 as opt-in feature** (1 week)
6. ✅ **Promote to all users after validation** (ongoing)

**Total Timeline:** 8-10 weeks for both plans

---

**Last Updated:** 2025-10-18
**Status:** Planning Complete
