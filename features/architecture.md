# Monorepo Architecture & Integration

This document provides a comprehensive overview of the project structure, service architecture, and integration patterns across the monorepo.

## Table of Contents

1. [Overview](#overview)
2. [Project Structure](#project-structure)
3. [Architecture Diagram](#architecture-diagram)
4. [Services](#services)
5. [Data Flow](#data-flow)
6. [Technology Stack](#technology-stack)
7. [Integration Patterns](#integration-patterns)
8. [Environment Configuration](#environment-configuration)
9. [Development Workflow](#development-workflow)
10. [Deployment](#deployment)
11. [Monitoring & Best Practices](#monitoring--best-practices)

## Overview

The GTD (Getting Things Done) task tracker is built using a modern microservices architecture on Cloudflare's edge platform. The system consists of:

- **Authentication Service** (`apps/auth/`) - Standalone passwordless auth with magic links
- **GTD API Service** (`apps/gtd/`) - Core task management API
- **Frontend Application** (`apps/gtd/web/`) - React-based user interface
- **Shared Packages** (`packages/`) - Reusable code, schemas, and utilities

### Key Architectural Improvements

1. **Extracted Authentication Service**
   - Originally part of GTD app
   - Now a standalone service reusable across multiple applications
   - Independent scaling and deployment
   - Better security isolation

2. **Monorepo with Shared Packages**
   - Code reuse via npm packages
   - Single source of truth for schemas and validation
   - Type-safe APIs across service boundaries

3. **Cloudflare Edge Computing**
   - Global distribution for low latency
   - Durable Objects for stateful operations
   - Service Bindings for inter-worker communication

## Project Structure

```
tools/                                          # Monorepo root
├── apps/
│   ├── auth/                                  # Authentication Service (Cloudflare Worker)
│   │   ├── src/
│   │   │   ├── index.ts                       # Main worker entry point
│   │   │   ├── router.ts                      # Hono route definitions
│   │   │   ├── durable-objects/
│   │   │   │   ├── authentication-do.ts       # Magic link & JWT tokens
│   │   │   │   ├── user-do.ts                 # User profiles & sessions
│   │   │   │   └── rate-limiter-do.ts         # Rate limiting
│   │   │   ├── handlers/                      # Endpoint handlers
│   │   │   ├── middleware/                    # CORS, auth, rate limiting
│   │   │   ├── lib/                           # Utilities (crypto, JWT, email)
│   │   │   └── types/                         # TypeScript definitions
│   │   ├── test/                              # Test suite
│   │   ├── wrangler.toml                      # Worker configuration
│   │   └── package.json
│   │
│   └── gtd/                                   # GTD Application
│       ├── src/
│       │   ├── index.tsx                      # React entry point
│       │   ├── app.tsx                        # Root app component
│       │   ├── worker.ts                      # Cloudflare Worker proxy
│       │   ├── components/                    # React components
│       │   ├── hooks/                         # React hooks
│       │   ├── lib/                           # Utilities and API clients
│       │   └── routes/                        # TanStack Router definitions
│       ├── styles/                            # Global CSS
│       ├── features/                          # Feature documentation
│       ├── wrangler.toml                      # Worker configuration
│       ├── vite.config.ts                     # Vite build config
│       └── package.json
│
├── packages/                                  # Shared Packages
│   ├── auth-schemas/                          # Authentication Zod schemas
│   ├── gtd-schemas/                           # GTD domain Zod schemas
│   ├── api-client/                            # Type-safe API clients
│   ├── cloudflare-utils/                      # Worker utilities
│   ├── database/                              # Durable Object patterns
│   ├── email-templates/                       # React Email templates
│   ├── ui/                                    # Shadcn UI components
│   ├── eslint-config/                         # ESLint configuration
│   ├── typescript-config/                     # TypeScript configuration
│   └── PACKAGES_GUIDE.md                      # Packages documentation
│
├── features/                                  # Centralized documentation
│   ├── 01_authentication.md                   # Authentication flow & setup
│   ├── 02_local-dev.md                        # Local development guide
│   ├── 03_deployment.md                       # Deployment procedures
│   ├── 04_auth-service-architecture.md        # Auth service design
│   └── 05_architecture.md                     # This file
│
├── AGENTS.md                                  # Development guidelines
├── package.json                               # Root package config
├── turbo.json                                 # Turborepo configuration
└── README.md                                  # Repository overview
```

## Architecture Diagram

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    User's Web Browser                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              GTD React Application                        │   │
│  │         (TanStack Router, TanStack Query)                │   │
│  │                                                           │   │
│  │  Uses: @repo/api-client, @repo/auth-schemas,            │   │
│  │        @repo/gtd-schemas, @repo/ui                       │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                           │
                    HTTP/HTTPS (TLS)
                           │
        ┌──────────────────┴──────────────────┐
        │                                     │
        ▼                                     ▼
┌──────────────────────┐          ┌──────────────────────┐
│ Auth Service Worker  │          │  GTD API Worker      │
│  (Hono Router)       │          │  (Proxy + API)       │
│                      │          │                      │
│ Endpoints:           │          │ Endpoints:           │
│ - Request magic link │          │ - Create queue       │
│ - Verify token       │          │ - Create task        │
│ - Refresh token      │          │ - Update task        │
│ - Get user           │          │ - Delete task        │
│ - Logout             │          │ - Get queues         │
│                      │          │                      │
│ Durable Objects:     │          │ Durable Objects:     │
│ - AuthenticationDO   │          │ - QueueDO            │
│ - UserDO             │          │ - TaskDO             │
│ - RateLimiterDO      │          │ - RateLimiterDO      │
└──────────────────────┘          └──────────────────────┘
        │                                  │
        │      Service Binding             │
        └──────────────────────────────────┘
                           │
        ┌──────────────────┴──────────────────┐
        │                                     │
        ▼                                     ▼
    ┌────────────┐                  ┌──────────────────┐
    │   Resend   │                  │  Cloudflare KV   │
    │   (Email)  │                  │  (Caching)       │
    └────────────┘                  └──────────────────┘
```

### Request Flow - Authentication

```
Frontend                Auth Service                    External
   │                         │                            │
   ├─ POST /api/auth/        │                            │
   │  request-magic-link ───>│                            │
   │  {email}                │                            │
   │                         ├─ Validate email           │
   │                         ├─ Check rate limit         │
   │                         ├─ Generate token           │
   │                         ├─ Store in AuthenticationDO│
   │                         │                            │
   │                         ├──────────── Send email ───>│
   │                         │         via Resend         │
   │                         │                            │
   │<───────── Response ──────┤                            │
   │  {success: true}        │                            │
   │                         │                            │
   │ [User clicks link]      │                            │
   │ GET /api/auth/verify    │                            │
   │?token=xxx ─────────────>│                            │
   │                         ├─ Validate token           │
   │                         ├─ Get/create user          │
   │                         ├─ Generate JWT tokens      │
   │                         ├─ Set HttpOnly cookies     │
   │<───────── Redirect ──────┤                            │
   │  (with cookies)         │                            │
```

### Request Flow - Task Creation

```
Frontend                GTD API              Auth Service
   │                      │                       │
   ├─ POST /api/          │                       │
   │  queues/Q1/tasks ───>│                       │
   │  {category, title}   │                       │
   │  (with access token) │                       │
   │                      ├─ Verify JWT ────────>│
   │                      │                       │
   │                      │<─ JWT valid ─────────┤
   │                      ├─ Get TaskDO          │
   │                      ├─ Create task         │
   │                      ├─ Return task         │
   │<───── Response ───────┤                       │
   │  {task}              │                       │
```

## Services

### 1. Authentication Service (`apps/auth/`)

**Purpose:** Provides passwordless authentication using magic links and JWT tokens.

**Key Features:**
- Magic link generation and verification
- JWT token creation and refresh
- User profile management
- Session management with tracking
- Rate limiting (3 magic links/hour per email)
- CORS configuration per environment

**API Endpoints:**
- `POST /api/auth/request-magic-link` - Request magic link
- `GET /api/auth/verify?token=xxx` - Verify and authenticate
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout and revoke session
- `GET /api/auth/user` - Get current user
- `PATCH /api/auth/user` - Update user profile

**Durable Objects:**
- **AuthenticationDO**: Manages magic link tokens, JWT creation, token blacklisting
- **UserDO**: Stores user profile and session data (one per user)
- **RateLimiterDO**: Enforces rate limits per endpoint

**Environment Variables:**
```
RESEND_API_KEY          # Email service API key
JWT_PRIVATE_KEY         # RS256 private key
JWT_PUBLIC_KEY          # RS256 public key (shared with GTD API)
ALLOWED_ORIGINS         # CORS allowed origins
APP_URLS                # Mapping of app IDs to URLs
AUTH_URL                # Auth service URL (for local dev)
DEFAULT_APP_URL         # Default redirect URL
```

### 2. GTD API Service (`apps/gtd/worker.ts`)

**Purpose:** Main API and proxy for GTD application, handling task management and auth proxying.

**Key Features:**
- Proxies authentication requests to auth service (via service binding)
- Serves GTD API endpoints
- Static asset serving
- CORS middleware
- JWT verification

**Proxy Behavior:**
```typescript
if (pathname.startsWith("/api/auth/")) {
  // Route to auth service via service binding
  response = await env.AUTH_SERVICE.fetch(authRequest);
} else {
  // Handle GTD API or static assets
}
```

**Service Binding Configuration (wrangler.toml):**
```toml
[[env.dev.services]]
binding = "AUTH_SERVICE"
service = "auth-service-dev"

[[env.production.services]]
binding = "AUTH_SERVICE"
service = "auth-service-prod"
```

**Environment Variables:**
```
AUTH_URL                # Auth service URL (HTTP fallback for local dev)
JWT_PUBLIC_KEY          # Public key for token verification
ALLOWED_ORIGINS         # CORS allowed origins
```

### 3. GTD Frontend (`apps/gtd/src/`)

**Purpose:** React-based UI for task management.

**Key Features:**
- TanStack Router for routing
- TanStack Query for data fetching
- Optimistic updates
- Drag-and-drop task management
- Real-time synchronization
- Responsive design (desktop and mobile)

**Component Structure:**
```
├── routes/              # Page components
│   ├── __root.tsx       # Root layout
│   ├── login/           # Authentication pages
│   ├── app/             # App layout
│   └── queues/          # Queue and task management
├── components/          # Reusable components
│   ├── dashboard.tsx
│   ├── queue-list.tsx
│   ├── task-card.tsx
│   └── ui/              # Shadcn UI components
├── hooks/               # React hooks
├── lib/                 # Utilities
│   ├── auth.tsx         # Auth context
│   ├── utils.ts         # Helper functions
│   └── login-email-store.ts
└── index.html           # HTML entry point
```

## Data Flow

### Complete Authentication Flow

1. **User requests magic link**
   - Frontend: `POST /api/auth/request-magic-link`
   - Auth Service validates email, generates token, sends email

2. **User clicks email link**
   - Navigates to: `/api/auth/verify?token=xxx`
   - Auth Service verifies token, creates session, sets cookies

3. **Frontend receives cookies**
   - HttpOnly cookies stored by browser
   - Access token: 1 hour expiry
   - Refresh token: 30 day expiry

4. **Frontend uses token for API calls**
   - Requests include `Authorization: Bearer <token>` or via cookie
   - GTD API verifies JWT with public key
   - Request proceeds if valid

5. **Token expiration handling**
   - Frontend detects expired token (401 response)
   - Automatically calls `POST /api/auth/refresh`
   - Retries original request with new token

### Task Creation Flow

1. **User submits task form**
   ```typescript
   POST /api/queues/:queueId/tasks
   Headers: Authorization: Bearer <token>
   Body: { category, title, description }
   ```

2. **GTD API validates request**
   - Verifies JWT signature
   - Extracts user ID from token
   - Validates request with Zod schema

3. **GTD API creates task**
   - Gets TaskDO instance
   - Inserts into SQLite
   - Returns created task

4. **Frontend receives response**
   - Updates local cache optimistically
   - UI reflects change immediately
   - Server response confirms or corrects

## Technology Stack

### Backend
- **Cloudflare Workers** - Serverless edge compute
- **Hono** - Lightweight web framework
- **Durable Objects** - Stateful storage with SQLite
- **Zod** - Runtime schema validation
- **TypeScript** - Type safety

### Frontend
- **React 19** - UI framework
- **TanStack Router** - Routing
- **TanStack Query** - Data fetching and caching
- **Shadcn UI** - Component library
- **Tailwind CSS** - Styling
- **Vite** - Build tool

### Development & Tooling
- **Turborepo** - Monorepo orchestration
- **Bun** - Package manager and runtime
- **Vitest** - Unit testing
- **Playwright** - E2E testing
- **Wrangler** - Cloudflare CLI

### Deployment & Infrastructure
- **Cloudflare Workers** - Serverless compute
- **Cloudflare Durable Objects** - State storage
- **Cloudflare KV** - Distributed cache
- **Cloudflare Pages** - Static site hosting
- **Resend** - Email delivery

## Integration Patterns

### Cross-Service Communication

#### Service Bindings (Production & Dev)

Direct worker-to-worker communication via service bindings:

```typescript
// GTD Worker requests auth service via binding
if (env.AUTH_SERVICE) {
  const authRequest = new Request(url, {
    method: 'POST',
    headers: selectHeaders(request.headers),
    body: request.body
  });
  response = await env.AUTH_SERVICE.fetch(authRequest);
}
```

**Benefits:**
- Low-latency edge communication
- No HTTP overhead
- More reliable than HTTP
- No internet routing

#### HTTP Fallback (Local Dev)

Fallback to HTTP for local development:

```typescript
else {
  const authUrl = env.AUTH_URL || 'http://localhost:8787';
  const redirectUrl = new URL(pathname + url.search, authUrl);
  response = await fetch(redirectUrl.toString(), fetchOptions);
}
```

### Shared Schema Validation

All services use shared Zod schemas for consistency:

**Auth Service:**
```typescript
import { UserSchema, RequestMagicLinkSchema } from '@repo/auth-schemas';

// Validate request
const { email } = RequestMagicLinkSchema.parse(requestBody);

// Validate response
const user = UserSchema.parse(dbRow);
```

**GTD API:**
```typescript
import { TaskSchema, CreateTaskSchema } from '@repo/gtd-schemas';

// Validate request
const taskData = CreateTaskSchema.parse(requestBody);

// Validate response
const task = TaskSchema.parse(dbRow);
```

### JWT Token Verification

Auth service signs tokens, GTD API verifies:

```typescript
// Auth Service (signs)
const token = jwt.sign(
  { sub: user.id, email: user.email, iat, exp },
  env.JWT_PRIVATE_KEY,
  { algorithm: 'RS256' }
);

// GTD API (verifies)
const payload = jwt.verify(
  token,
  env.JWT_PUBLIC_KEY,
  { algorithms: ['RS256'] }
);
```

### API Client Pattern

Frontend uses type-safe API clients:

```typescript
import { AuthClient, GTDClient } from '@repo/api-client';

const authClient = new AuthClient({
  apiUrl: 'https://auth.example.com/api',
  appId: 'gtd'
});

const gtdClient = new GTDClient({
  apiUrl: 'https://gtd.example.com/api',
  getAccessToken: () => authClient.getAccessToken()
});

// Requests are type-safe and validated
await gtdClient.createTask(queueId, { category, title });
```

## Environment Configuration

### Authentication Service

**Development (.dev.vars):**
```env
ENVIRONMENT=development
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxx
JWT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
JWT_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
APP_URLS={"gtd":"http://localhost:5173"}
AUTH_URL=http://localhost:8787
DEFAULT_APP_URL=http://localhost:5173
```

**Production:**
```env
ENVIRONMENT=production
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxx
JWT_PRIVATE_KEY=[SECRET]
JWT_PUBLIC_KEY=[PUBLIC KEY]
ALLOWED_ORIGINS=https://gtd.example.com
APP_URLS={"gtd":"https://gtd.example.com"}
AUTH_URL=https://auth.example.com
DEFAULT_APP_URL=https://gtd.example.com
```

### GTD API Service

**Development (.dev.vars):**
```env
ENVIRONMENT=development
JWT_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----
ALLOWED_ORIGINS=http://localhost:5173
```

**Production:**
```env
ENVIRONMENT=production
JWT_PUBLIC_KEY=[PUBLIC KEY FROM AUTH SERVICE]
ALLOWED_ORIGINS=https://gtd.example.com
```

### GTD Frontend

**Development (.env.local):**
```env
VITE_AUTH_API_URL=http://localhost:8787/api
VITE_GTD_API_URL=http://localhost:5173/api
VITE_APP_ID=gtd
VITE_ENVIRONMENT=development
```

**Production:**
```env
VITE_AUTH_API_URL=https://auth.example.com/api
VITE_GTD_API_URL=https://gtd.example.com/api
VITE_APP_ID=gtd
VITE_ENVIRONMENT=production
```

## Development Workflow

### Initial Setup

```bash
# Install dependencies
bun install

# Setup environment variables
cp apps/auth/.dev.vars.example apps/auth/.dev.vars
cp apps/gtd/.dev.vars.example apps/gtd/.dev.vars

# Create Durable Objects namespaces (one-time)
cd apps/auth && wrangler d1 database create auth-db
```

### Local Development

**Start all services:**
```bash
# Terminal 1: Auth service
cd apps/auth && bun run dev      # http://localhost:8787

# Terminal 2: GTD app
cd apps/gtd && bun run dev       # http://localhost:5173
```

**Run tests:**
```bash
bun test                          # Run all tests
bun test --filter=auth           # Run auth tests only
```

### Making Changes

1. **Update schema in shared package**
   ```bash
   cd packages/auth-schemas
   # Edit schema.ts
   bun run build
   ```

2. **Update service to use new schema**
   ```bash
   cd apps/auth
   # Update to import new schema version
   bun run dev
   ```

3. **Update frontend to match schema**
   ```bash
   cd apps/gtd
   # Update component or API client
   bun run dev
   ```

## Deployment

### Pre-Deployment Checklist

- [ ] All tests passing (`bun test`)
- [ ] No TypeScript errors (`bun run check-types`)
- [ ] No linting issues (`bun run lint`)
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Monitoring alerts configured

### Deployment Order

**Critical:** Services must be deployed in this order:

1. **Auth Service First**
   ```bash
   cd apps/auth
   wrangler deploy --env production
   ```

2. **GTD API Second** (after auth is live)
   ```bash
   cd apps/gtd
   wrangler deploy --env production
   ```

3. **Frontend Last** (after API is live)
   ```bash
   cd apps/gtd
   bun run build
   wrangler pages deploy dist
   ```

### Rollback Strategy

**If GTD API fails:**
```bash
cd apps/gtd
wrangler rollback
# Auth service continues to work (backwards compatible)
```

**If Auth Service fails:**
```bash
cd apps/auth
wrangler rollback
# GTD API continues with cached/old tokens
```

## Monitoring & Best Practices

### Health Checks

Each service exposes a health endpoint:

```bash
# Auth service health
curl https://auth.example.com/api/health

# GTD API health
curl https://gtd.example.com/api/health
```

### Distributed Tracing

Include correlation IDs in requests:

```typescript
const correlationId = crypto.randomUUID();

// Log at each service
console.log(JSON.stringify({
  correlationId,
  service: 'auth',
  action: 'request_magic_link'
}));
```

### Error Handling

**Auth Service Errors:**
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests",
    "retryAfter": 3600
  }
}
```

**GTD API Errors:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "details": { "field": "title", "error": "Required" }
  }
}
```

### Performance Targets

- **TTFB:** < 100ms globally
- **API Response:** < 50ms (p95)
- **Page Load:** < 1 second
- **Uptime:** 99.9%

### Best Practices

1. **Always validate with shared schemas** - Use `@repo/*-schemas`
2. **Include correlation IDs** - Track requests across services
3. **Handle auth errors gracefully** - Auto-refresh, redirect to login
4. **Cache appropriately** - Balance consistency with performance
5. **Monitor cross-service communication** - Alert on failures
6. **Test service integration** - Integration tests before deploy
7. **Plan for service downtime** - Graceful degradation
8. **Use service bindings in production** - Avoid HTTP between workers
9. **Rotate JWT keys carefully** - Grace period for key transitions
10. **Document API contracts** - Keep Zod schemas as source of truth

## Related Documentation

- [Authentication Setup & Configuration](./authentication.md)
- [Local Development Guide](./local-dev.md)
- [Deployment Procedures](./deployment.md)
- [Auth Service Architecture](./auth-service-architecture.md)
