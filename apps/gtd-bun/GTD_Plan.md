# GTD Task Tracker - Technical Specification

## Goal

Build a simple "to do" tracker in the style of Getting Things Done (GTD), leveraging modern serverless architecture and distributed systems.

## Overview

This is a multi-user GTD application with the following task categories:

1. **Next Actions** - Tasks ready to be worked on immediately
2. **Waiting On** - Tasks blocked by external dependencies
3. **Someday** - Tasks for future consideration
4. **Archive** - Completed or archived tasks

### Key Features

- **Multiple GTD Queues**: Users can create an unlimited number of queues (e.g., "Work", "Personal", "Side Project")
- **Responsive Layout**:
  - Desktop: Horizontal columns showing all queues side-by-side
  - Mobile: Tab-based navigation with single queue view
- **Drag & Drop**: Move tasks between categories and queues
- **Inline Editing**: Click queue titles to edit in place
- **Quick Add**: Click category headers to quickly add tasks
- **Detailed Editing**: Click tasks to open right-side drawer with full editing capabilities
- **Passwordless Auth**: Magic link authentication via email
- **Real-time Updates**: Optimistic UI updates with TanStack Query

## Feature Documentation

Detailed specifications are available in the `features/` directory:

1. **[Authentication](../auth/README.md)** - Standalone authentication service (see `apps/auth/`)
2. **[Data Model](./features/02_data_model.md)** - Database schemas, Durable Objects architecture, and data operations
3. **[UI/UX](./features/03_ui_ux.md)** - Component library, interactions, responsive design, and accessibility
4. **[API Endpoints](./features/04_api_endpoints.md)** - Complete REST API specification with request/response examples
5. **[Deployment & Infrastructure](./features/05_deployment_infrastructure.md)** - Cloudflare Workers setup, CI/CD, and production deployment

## Additional Documentation

- **[Shared Packages Guide](../../packages/PACKAGES_GUIDE.md)** - Shared code and utilities across all apps
- **[Review Findings](./REVIEW_FINDINGS.md)** - Identified gaps and recommendations

## Technology Stack

### Backend
- **Cloudflare Workers** - Serverless compute platform running at the edge
- **Cloudflare Durable Objects** - Stateful, strongly consistent storage with SQLite backend
  - QueueDO: Stores queue data and metadata
  - TaskDO: Stores individual tasks and handles task operations
- **Authentication Service** - Standalone auth service (see `apps/auth/`)
  - AuthenticationDO: Handles magic link tokens and JWT issuance
  - UserDO: Manages user profiles and preferences
- **Shared Packages** - Reusable code across apps (see `packages/`)
  - @repo/auth-schemas: Authentication Zod schemas
  - @repo/gtd-schemas: GTD domain Zod schemas
  - @repo/api-client: Type-safe API client
  - @repo/cloudflare-utils: Cloudflare Workers utilities
  - @repo/database: Durable Object patterns
  - @repo/email-templates: React Email templates
- **Zod** - Runtime type validation and schema validation throughout the stack

### Frontend
- **React** - UI framework
- **TanStack Router** - Type-safe routing with nested layouts
- **TanStack Query** - Server state management with optimistic updates
- **Shadcn UI** - High-quality, accessible component library built on Radix UI
- **Tailwind CSS** - Utility-first CSS framework
- **Inter Font** - Clean, modern typography from Google Fonts
- **@dnd-kit** - Drag-and-drop functionality for task management
- **Framer Motion** - Smooth animations and transitions

### Development & Testing
- **Wrangler** - Cloudflare CLI for local development and deployment
- **Vitest** - Unit testing framework
- **Playwright** - End-to-end testing
- **TypeScript** - Type safety throughout the entire application
- **Turborepo** - Monorepo build system

### Important Notes
- **Bun**: While Bun is preferred as a package manager and build tool, note that Cloudflare Workers uses the `workerd` runtime (not Bun runtime). Bun can be used during development and build processes.
- **Node.js Compatibility**: Cloudflare Workers has excellent Node.js API compatibility, making it easy to use existing Node.js libraries.

## Architecture Principles

Following Cloudflare's best practices for Durable Objects:

1. **Service Separation**: Authentication extracted to standalone service (`apps/auth/`)
2. **Shared Packages**: Common code in `packages/` for reuse across apps
3. **Control/Data Plane Separation**: User-level operations separated from task-level operations
4. **Data Sharding**: Each user, queue, and potentially task gets its own Durable Object instance
5. **Geographic Distribution**: Durable Objects automatically placed near users for low latency
6. **SQLite Backend**: All Durable Objects use SQLite storage with point-in-time recovery
7. **Strong Consistency**: ACID guarantees within each Durable Object
8. **Eventual Consistency**: Between different Durable Objects when needed

## Authentication

**Note:** Authentication is now a standalone service in `apps/auth/`. The GTD app integrates with this service.

Custom JWT-based authentication with passwordless magic links:

- **Magic Link Flow**: User enters email → receives link → clicks link → authenticated
- **Token Types**:
  - Magic link tokens (15 min expiry)
  - Access tokens (1 hour expiry, JWT)
  - Refresh tokens (30 days expiry, JWT)
- **Security**: RS256 signing, httpOnly cookies, automatic token rotation
- **Rate Limiting**: 3 magic link requests per hour, 5 verification attempts per token
- **Multi-App Support**: Single auth service supports multiple applications

See [Authentication Service Documentation](../auth/README.md) for complete details.

### GTD Integration

The GTD app uses the auth service via shared packages:

```typescript
import { AuthClient, useAuth } from '@repo/api-client';

const authClient = new AuthClient({
  apiUrl: import.meta.env.VITE_AUTH_API_URL,
  appId: 'gtd'
});

// In React components
function App() {
  const { user, isAuthenticated } = useAuth();
  // ...
}
```

## Design System

### Visual Design
- **Inspiration**: Tweek.so aesthetic (see `tweek.png`)
- **Design Language**: Minimal, clean, content-focused
- **Component Library**: Shadcn UI components (Radix UI primitives)
- **Typography**: Inter font family from Google Fonts
- **CSS Framework**: Tailwind CSS with custom design tokens
- **Color Scheme**: Light and dark mode support with neutral palette

### Responsive Breakpoints
- **Mobile**: < 1024px (single column, tab navigation)
- **Desktop**: ≥ 1024px (multi-column horizontal layout)

See [UI/UX Documentation](./features/03_ui_ux.md) for complete design specifications.

## Data Model

### Core Entities

**User** (Managed by Auth Service)
- Profile information (email, display name)
- Preferences (theme, notifications)
- Authentication sessions

**Queue** (Managed by GTD API)
- User-owned collections of tasks
- Title and display order
- Soft-delete support (archive)

**Task** (Managed by GTD API)
- Belongs to a queue and category
- Title, description, completion status
- Position within category
- Soft-delete support (archive)

### Storage Strategy

- **SQLite Backend**: All Durable Objects use SQLite for durability
- **Service Isolation**: Auth and GTD data stored in separate services
- **Shared Schemas**: Validated using Zod schemas from `@repo/auth-schemas` and `@repo/gtd-schemas`
- **Indexes**: Optimized for common query patterns
- **Transactions**: ACID guarantees for multi-row operations
- **Point-in-Time Recovery**: 30-day recovery window

### Schema Packages

The application uses shared Zod schema packages for type safety:

- **@repo/auth-schemas**: User, Session, Preferences schemas
- **@repo/gtd-schemas**: Queue, Task schemas

See [Data Model Documentation](./features/02_data_model.md) for complete schemas and operations.

## API Design

RESTful API with JSON payloads, hosted on Cloudflare Workers:

### Architecture

The GTD application now uses a **microservices architecture** with two separate services:

1. **Authentication Service** (`apps/auth/`) - Handles all auth operations
   - Base URL: `https://auth.your-domain.com/api`
   - Endpoints: `/auth/request-magic-link`, `/auth/verify`, `/auth/refresh`, `/auth/logout`, `/auth/me`

2. **GTD API Service** (`apps/gtd/api/`) - Handles queue and task operations  
   - Base URL: `https://gtd.your-domain.com/api`
   - Endpoints: `/queues`, `/tasks`, batch operations

### Core GTD Endpoints

- **Queues**: `/api/queues` - CRUD operations on queues
- **Tasks**: `/api/queues/:id/tasks` - CRUD operations on tasks
- **Batch Operations**: `/api/tasks/batch` - Bulk task operations

### Authentication Integration

GTD API endpoints require authentication via JWT tokens issued by the auth service:

```
Authorization: Bearer <access_token>
```

The GTD API verifies tokens using the auth service's public key.

### Key Features

- **Validation**: All inputs validated with Zod schemas from `@repo/gtd-schemas`
- **Rate Limiting**: Per-endpoint rate limits enforced by Durable Objects
- **Error Handling**: Consistent error response format
- **Pagination**: Cursor-based pagination for large result sets
- **Optimistic Updates**: Client-side optimistic updates with TanStack Query

See [API Documentation](./features/04_api_endpoints.md) for complete endpoint specifications.

## Project Structure

```
# Root monorepo structure
tools/
├── apps/
│   ├── auth/                   # Authentication service (standalone)
│   │   ├── src/
│   │   │   ├── index.ts        # Worker entry point
│   │   │   ├── router.ts       # API routing
│   │   │   ├── middleware/     # CORS, rate limiting
│   │   │   ├── handlers/       # Auth handlers
│   │   │   ├── durable-objects/
│   │   │   │   ├── authentication-do.ts
│   │   │   │   └── user-do.ts
│   │   │   └── lib/            # Utilities
│   │   ├── wrangler.toml
│   │   ├── package.json
│   │   ├── README.md
│   │   └── AUTH_PLAN.md
│   │
│   └── gtd/                    # GTD application
│       ├── api/                # GTD API Worker
│       │   ├── src/
│       │   │   ├── index.ts    # Worker entry point
│       │   │   ├── router.ts   # API routing
│       │   │   ├── middleware/ # Auth middleware, CORS
│       │   │   ├── handlers/   # Queue & task handlers
│       │   │   ├── durable-objects/
│       │   │   │   ├── queue-do.ts
│       │   │   │   └── task-do.ts
│       │   │   └── lib/        # Utilities
│       │   ├── wrangler.toml
│       │   └── package.json
│       │
│       ├── web/                # React frontend
│       │   ├── src/
│       │   │   ├── main.tsx    # Entry point
│       │   │   ├── routes/     # TanStack Router routes
│       │   │   ├── components/ # React components
│       │   │   ├── hooks/      # Custom hooks
│       │   │   └── lib/        # Utilities
│       │   ├── public/
│       │   ├── vite.config.ts
│       │   └── package.json
│       │
│       ├── features/           # Feature documentation
│       ├── GTD_Plan.md         # This document
│       ├── REVIEW_FINDINGS.md  # Gap analysis
│       └── tweek.png           # Design reference
│
├── packages/                   # Shared packages
│   ├── auth-schemas/          # Auth Zod schemas
│   ├── gtd-schemas/           # GTD Zod schemas
│   ├── api-client/            # Typed API clients
│   ├── cloudflare-utils/      # Worker utilities
│   ├── database/              # Durable Object patterns
│   ├── email-templates/       # React Email templates
│   ├── ui/                    # Shared UI components
│   ├── eslint-config/         # ESLint configs
│   ├── typescript-config/     # TypeScript configs
│   └── PACKAGES_GUIDE.md      # Package documentation
│
├── package.json                # Root package.json
├── turbo.json                  # Turborepo config
└── tsconfig.json               # Root TypeScript config
```

## Development Workflow

### Initial Setup

```bash
# Install dependencies
bun install

# Set up environment variables for auth service
cp apps/auth/.dev.vars.example apps/auth/.dev.vars

# Set up environment variables for GTD API
cp apps/gtd/api/.dev.vars.example apps/gtd/api/.dev.vars

# Set up environment variables for GTD web
cp apps/gtd/web/.env.example apps/gtd/web/.env.local

# Login to Cloudflare
wrangler login

# Create Durable Object namespaces for auth service
cd apps/auth
wrangler durable-objects namespace create AUTH_DO
wrangler durable-objects namespace create USER_DO

# Create Durable Object namespaces for GTD API
cd ../gtd/api
wrangler durable-objects namespace create QUEUE_DO
wrangler durable-objects namespace create TASK_DO
```

### Development Commands

```bash
# Start all services in parallel (auth, GTD API, GTD web)
bun run dev

# Or start individually
cd apps/auth && bun run dev          # Auth service on :8787
cd apps/gtd/api && bun run dev       # GTD API on :8788
cd apps/gtd/web && bun run dev       # GTD web on :5173

# Run tests
bun run test

# Type checking
bun run check-types

# Linting
bun run lint

# Build all packages
bun run build
```

### Deployment

```bash
# Deploy auth service
cd apps/auth
wrangler deploy --env development    # To development
wrangler deploy --env production     # To production

# Deploy GTD API
cd apps/gtd/api
wrangler deploy --env development
wrangler deploy --env production

# Deploy GTD frontend (automatic via Cloudflare Pages)
git push origin main
```

See [Deployment Documentation](./features/05_deployment_infrastructure.md) for complete CI/CD setup.

## Testing Strategy

### Unit Tests (Vitest)
- Zod schema validation
- Durable Object methods
- Utility functions
- React components
- API handlers

### Integration Tests
- Complete user flows
- API endpoint testing
- Durable Object interactions
- Authentication flows

### End-to-End Tests (Playwright)
- User authentication flow
- Queue creation and management
- Task CRUD operations
- Drag-and-drop interactions
- Mobile responsive behavior

### Load Testing
- Concurrent Durable Object operations
- Large dataset queries
- Rate limiting behavior
- Geographic distribution

## Security Considerations

### Authentication & Authorization
- Magic link tokens expire after 15 minutes
- JWT access tokens expire after 1 hour
- JWT refresh tokens expire after 30 days
- HttpOnly cookies prevent XSS attacks
- CSRF protection via SameSite cookies

### Data Protection
- Input validation with Zod on all endpoints
- SQL injection prevention via SQLite prepared statements
- XSS prevention via React's automatic escaping
- Rate limiting prevents abuse
- User data isolation via Durable Objects

### Infrastructure Security
- HTTPS only (enforced by Cloudflare)
- CORS configuration restricts origins
- Security headers (CSP, X-Frame-Options, etc.)
- Secrets management via Cloudflare
- Point-in-time recovery for data loss

## Performance Goals

### Target Metrics
- **Time to First Byte**: < 100ms (globally)
- **Page Load Time**: < 1 second (initial load)
- **Time to Interactive**: < 2 seconds
- **API Response Time**: < 50ms (p95)
- **Optimistic Update**: Immediate UI feedback

### Optimization Strategies
- Edge computing via Cloudflare Workers
- Geographic distribution of Durable Objects
- Optimistic updates with TanStack Query
- Code splitting and lazy loading
- Image optimization
- SQLite query optimization with proper indexes

## Scalability

### Current Architecture Supports
- **Users**: Millions (each gets own UserDO)
- **Queues per User**: Unlimited (practical limit ~100s)
- **Tasks per Queue**: Unlimited (practical limit ~1000s)
- **Concurrent Operations**: Auto-scales with Durable Objects
- **Geographic Distribution**: Automatic worldwide placement

### Future Scaling Considerations
- WebSocket support for real-time collaboration
- Task-level Durable Objects for very large queues
- Caching layer with Workers KV
- CDN for static assets (automatic with Pages)
- Background job processing

## Cost Estimation

### Cloudflare (1,000 active users, ~5M requests/month)
- Workers Paid Plan: $5/month
- Durable Objects Storage (~500MB): ~$0.10/month
- Pages: Free

### Resend (~10k emails/month)
- Growth Plan: $20/month

### Total Estimated Monthly Cost
**~$25/month** for 1,000 active users

See [Deployment Documentation](./features/05_deployment_infrastructure.md) for detailed cost breakdown.

## Implementation Phases

### Phase 1: MVP (Core Functionality)
- [ ] Set up monorepo structure
- [ ] Implement authentication system
- [ ] Create Durable Objects for User, Queue, Task
- [ ] Build core API endpoints
- [ ] Implement basic UI with queue and task management
- [ ] Deploy to staging environment

### Phase 2: Enhanced UX
- [ ] Implement drag-and-drop
- [ ] Add keyboard shortcuts
- [ ] Mobile responsive design
- [ ] Dark mode support
- [ ] Loading states and error handling
- [ ] Animations and transitions

### Phase 3: Polish & Testing
- [ ] Comprehensive test suite
- [ ] Performance optimization
- [ ] Accessibility audit
- [ ] Security review
- [ ] Documentation
- [ ] Production deployment

### Phase 4: Future Enhancements
- [ ] WebSocket real-time updates
- [ ] Task sharing and collaboration
- [ ] Rich text editor for descriptions
- [ ] Task attachments (using R2)
- [ ] Recurring tasks
- [ ] Email reminders
- [ ] Mobile app (React Native)
- [ ] Public API with rate limiting
- [ ] Third-party integrations

## Success Criteria

### Technical
- [ ] All endpoints respond in < 100ms (p95)
- [ ] 99.9% uptime
- [ ] Zero data loss incidents
- [ ] Pass security audit
- [ ] 90+ Lighthouse score

### User Experience
- [ ] Intuitive onboarding flow
- [ ] Smooth animations and transitions
- [ ] Works offline (with service worker)
- [ ] Accessible (WCAG 2.1 AA compliant)
- [ ] Mobile-friendly (responsive design)

### Business
- [ ] Deploy within 2 months
- [ ] Support 1,000+ users on MVP budget
- [ ] Positive user feedback
- [ ] < $30/month operating costs

## Resources & References

### Documentation
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Durable Objects](https://developers.cloudflare.com/durable-objects/)
- [TanStack Router](https://tanstack.com/router/latest)
- [TanStack Query](https://tanstack.com/query/latest)
- [Shadcn UI](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Resend](https://resend.com/docs)

### Design
- [Tweek.so](https://tweek.so) - Visual inspiration
- [Inter Font](https://fonts.google.com/specimen/Inter)
- [Radix UI](https://www.radix-ui.com/) - Component primitives

### Learning Resources
- [Getting Things Done](https://gettingthingsdone.com/) - GTD methodology
- [Cloudflare Blog](https://blog.cloudflare.com/) - Best practices and updates

## Contributing

This is a private project. For questions or discussions, refer to the feature documentation in the `features/` directory.

## License

TBD
