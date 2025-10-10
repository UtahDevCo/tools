# GTD Application - Architecture Summary

## Overview

The GTD (Getting Things Done) task tracker is built using a modern microservices architecture on Cloudflare's edge platform, with a standalone authentication service and shared packages for code reuse across multiple applications.

## Key Changes from Original Plan

### 1. Authentication Extracted to Standalone Service

**Before:** Authentication was part of the GTD app  
**After:** Authentication is a separate service in `apps/auth/`

**Benefits:**
- Reusable across multiple applications in the monorepo
- Independent scaling and deployment
- Easier to maintain and test
- Better security isolation

### 2. Shared Package Architecture

**Before:** Code duplication between apps  
**After:** Shared packages in `packages/` directory

**Packages Created:**
- `@repo/auth-schemas` - Authentication Zod schemas
- `@repo/gtd-schemas` - GTD domain Zod schemas
- `@repo/api-client` - Type-safe API clients
- `@repo/cloudflare-utils` - Worker utilities
- `@repo/database` - Durable Object patterns
- `@repo/email-templates` - React Email templates

### 3. Multi-Service Architecture

```
apps/auth/         → Authentication service (magic links, JWT, users)
apps/gtd/api/      → GTD API service (queues, tasks)
apps/gtd/web/      → GTD frontend (React)
```

## Project Structure

```
tools/                              # Monorepo root
├── apps/
│   ├── auth/                      # Authentication Service
│   │   ├── src/
│   │   │   ├── durable-objects/
│   │   │   │   ├── authentication-do.ts
│   │   │   │   └── user-do.ts
│   │   │   ├── handlers/
│   │   │   └── index.ts
│   │   ├── wrangler.toml
│   │   ├── package.json
│   │   ├── README.md
│   │   └── AUTH_PLAN.md
│   │
│   └── gtd/                       # GTD Application
│       ├── api/                   # GTD API Service
│       │   ├── src/
│       │   │   ├── durable-objects/
│       │   │   │   ├── queue-do.ts
│       │   │   │   └── task-do.ts
│       │   │   ├── handlers/
│       │   │   └── index.ts
│       │   ├── wrangler.toml
│       │   └── package.json
│       │
│       ├── web/                   # React Frontend
│       │   ├── src/
│       │   │   ├── routes/
│       │   │   ├── components/
│       │   │   └── main.tsx
│       │   ├── vite.config.ts
│       │   └── package.json
│       │
│       ├── features/              # Feature documentation
│       ├── GTD_Plan.md
│       ├── REVIEW_FINDINGS.md
│       └── tweek.png
│
├── packages/                      # Shared Packages
│   ├── auth-schemas/
│   ├── gtd-schemas/
│   ├── api-client/
│   ├── cloudflare-utils/
│   ├── database/
│   ├── email-templates/
│   ├── ui/                        # Shared UI components
│   ├── eslint-config/
│   ├── typescript-config/
│   └── PACKAGES_GUIDE.md
│
├── package.json                   # Root package.json
├── turbo.json                     # Turborepo config
├── INTEGRATION_GUIDE.md           # Service integration guide
└── README.md
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
│                                                              │
│  Uses: @repo/api-client, @repo/auth-schemas,               │
│        @repo/gtd-schemas, @repo/ui                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Cloudflare Edge Network                     │
│                                                              │
│  ┌──────────────────────┐       ┌───────────────────────┐  │
│  │  Auth Service        │       │    GTD API Service     │  │
│  │                      │       │                        │  │
│  │  Uses:               │       │  Uses:                 │  │
│  │  - @repo/auth-schemas│       │  - @repo/gtd-schemas   │  │
│  │  - @repo/cloudflare- │       │  - @repo/cloudflare-   │  │
│  │    utils             │       │    utils               │  │
│  │  - @repo/database    │       │  - @repo/database      │  │
│  │  - @repo/email-      │       │                        │  │
│  │    templates         │       │                        │  │
│  │                      │       │                        │  │
│  │  Durable Objects:    │       │  Durable Objects:      │  │
│  │  - AuthenticationDO  │       │  - QueueDO             │  │
│  │  - UserDO            │       │  - TaskDO              │  │
│  └──────────────────────┘       └───────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### Authentication Flow

1. **User requests magic link** → Auth Service
2. **Auth Service** generates token → Sends email via Resend
3. **User clicks link** → Auth Service verifies → Issues JWT
4. **Frontend** stores JWT → Uses for API calls

### GTD Operations

1. **Frontend** makes request with JWT → GTD API Service
2. **GTD API** verifies JWT (using auth public key)
3. **GTD API** queries Durable Objects (QueueDO/TaskDO)
4. **GTD API** validates response with schemas → Returns data
5. **Frontend** renders data

## Technology Stack

### Backend
- **Cloudflare Workers** - Edge compute
- **Durable Objects** - Stateful storage (SQLite)
- **Zod** - Schema validation
- **TypeScript** - Type safety

### Frontend
- **React** - UI framework
- **TanStack Router** - Routing
- **TanStack Query** - Data fetching
- **Shadcn UI** - Component library
- **Tailwind CSS** - Styling

### Shared
- **Turborepo** - Monorepo build system
- **Bun** - Package manager
- **Vitest** - Testing
- **Playwright** - E2E testing

## Development Workflow

### Initial Setup

```bash
# Install dependencies
bun install

# Setup environment variables
cp apps/auth/.dev.vars.example apps/auth/.dev.vars
cp apps/gtd/api/.dev.vars.example apps/gtd/api/.dev.vars
cp apps/gtd/web/.env.example apps/gtd/web/.env.local

# Create Durable Object namespaces
cd apps/auth && wrangler durable-objects namespace create AUTH_DO
cd apps/auth && wrangler durable-objects namespace create USER_DO
cd apps/gtd/api && wrangler durable-objects namespace create QUEUE_DO
cd apps/gtd/api && wrangler durable-objects namespace create TASK_DO
```

### Development

```bash
# Start all services
bun run dev

# Or individually
cd apps/auth && bun run dev          # Port 8787
cd apps/gtd/api && bun run dev       # Port 8788
cd apps/gtd/web && bun run dev       # Port 5173

# Run tests
bun run test

# Type checking
bun run check-types
```

### Deployment

```bash
# Deploy services (in order)
cd apps/auth && wrangler deploy --env production
cd apps/gtd/api && wrangler deploy --env production
cd apps/gtd/web && wrangler pages deploy dist
```

## Key Features

### Authentication (apps/auth)
- Passwordless magic link authentication
- JWT access tokens (1 hour) and refresh tokens (30 days)
- User profile management
- Session management
- Rate limiting

### GTD Application (apps/gtd)
- Multiple GTD queues per user
- Four task categories: Next Actions, Waiting On, Someday, Archive
- Drag-and-drop task management
- Inline editing
- Responsive design (desktop and mobile)
- Real-time updates with optimistic UI

### Shared Packages (packages/)
- Type-safe API clients
- Shared Zod schemas
- Cloudflare utilities
- Durable Object patterns
- Email templates
- UI components

## Documentation

### Main Documents
- **[GTD Plan](apps/gtd/GTD_Plan.md)** - Overall GTD application plan
- **[Review Findings](apps/gtd/REVIEW_FINDINGS.md)** - Gap analysis and recommendations
- **[Auth README](apps/auth/README.md)** - Authentication service documentation
- **[Auth Plan](apps/auth/AUTH_PLAN.md)** - Detailed auth implementation
- **[Packages Guide](packages/PACKAGES_GUIDE.md)** - Shared packages documentation
- **[Integration Guide](INTEGRATION_GUIDE.md)** - Service integration patterns

### Feature Documents (apps/gtd/features/)
1. **01_authentication.md** - ⚠️ Now references `apps/auth/`
2. **02_data_model.md** - Data schemas and Durable Objects
3. **03_ui_ux.md** - UI components and design
4. **04_api_endpoints.md** - API specifications
5. **05_deployment_infrastructure.md** - Deployment and ops

## Security

### Authentication
- RS256 JWT signing
- HttpOnly cookies
- Automatic token refresh
- Rate limiting (3 magic links/hour)
- Session revocation

### API Security
- JWT verification on all endpoints
- Input validation with Zod
- CORS configuration
- Rate limiting per endpoint
- SQL injection prevention (prepared statements)

## Performance

### Targets
- **TTFB:** < 100ms (globally)
- **Page Load:** < 1 second
- **API Response:** < 50ms (p95)
- **Optimistic Updates:** Immediate UI feedback

### Optimization
- Edge computing (Cloudflare Workers)
- Geographic DO placement
- Optimistic updates (TanStack Query)
- Code splitting
- SQLite indexes

## Cost Estimate

For 1,000 active users:

| Service | Cost |
|---------|------|
| Cloudflare Workers (Paid) | $5/month |
| Durable Objects Storage | ~$0.10/month |
| Cloudflare Pages | Free |
| Resend (Growth Plan) | $20/month |
| **Total** | **~$25/month** |

## Implementation Phases

### Phase 1: MVP ✅ (Planning Complete)
- [x] Architecture design
- [x] Documentation
- [x] Gap analysis
- [ ] Auth service implementation
- [ ] GTD API implementation
- [ ] Frontend implementation
- [ ] Testing setup
- [ ] Deployment

### Phase 2: Enhancement
- [ ] Drag-and-drop
- [ ] Mobile optimization
- [ ] Dark mode
- [ ] Animations
- [ ] Accessibility audit

### Phase 3: Advanced Features
- [ ] WebSocket real-time updates
- [ ] Task recurrence
- [ ] Email notifications
- [ ] Rich text editor
- [ ] File attachments (R2)

## Next Steps

1. **Create Auth Service** (`apps/auth/`)
   - Implement Durable Objects
   - Create API handlers
   - Setup email templates
   - Write tests

2. **Create GTD API** (`apps/gtd/api/`)
   - Implement Durable Objects
   - Create API handlers
   - Setup auth middleware
   - Write tests

3. **Create Shared Packages**
   - `@repo/auth-schemas`
   - `@repo/gtd-schemas`
   - `@repo/api-client`
   - Other utilities

4. **Build Frontend** (`apps/gtd/web/`)
   - Setup TanStack Router
   - Create components
   - Integrate with APIs
   - Add E2E tests

5. **Deploy to Production**
   - Setup CI/CD
   - Configure monitoring
   - Launch!

## Success Criteria

### Technical
- [ ] All endpoints < 100ms (p95)
- [ ] 99.9% uptime
- [ ] Zero data loss
- [ ] Security audit passed
- [ ] 90+ Lighthouse score

### User Experience
- [ ] Intuitive interface
- [ ] Smooth interactions
- [ ] Mobile-friendly
- [ ] Accessible (WCAG 2.1 AA)
- [ ] Works offline

### Business
- [ ] Deploy within 2 months
- [ ] Support 1,000+ users
- [ ] < $30/month costs
- [ ] Positive user feedback

## Resources

### Documentation
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Durable Objects](https://developers.cloudflare.com/durable-objects/)
- [TanStack Router](https://tanstack.com/router/latest)
- [TanStack Query](https://tanstack.com/query/latest)
- [Shadcn UI](https://ui.shadcn.com/)

### Tools
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/) - Cloudflare CLI
- [Vitest](https://vitest.dev/) - Testing framework
- [Playwright](https://playwright.dev/) - E2E testing
- [Resend](https://resend.com/) - Email delivery

## Contributing

This is a private project. For questions or discussions, refer to the documentation in:
- `apps/gtd/` - GTD application
- `apps/auth/` - Authentication service
- `packages/` - Shared packages
- `INTEGRATION_GUIDE.md` - Integration patterns
