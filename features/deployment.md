# Deployment Guide

This guide covers deploying the GTD app and Auth service to Cloudflare Workers.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Service Bindings](#service-bindings)
- [Deployment Environments](#deployment-environments)
- [Deployment Commands](#deployment-commands)
- [API Routes](#api-routes)
- [Environment Configuration](#environment-configuration)
- [Monitoring and Logs](#monitoring-and-logs)
- [Troubleshooting](#troubleshooting)
- [Rollback Procedures](#rollback-procedures)

## Architecture Overview

### GTD App

The GTD app is deployed as a Cloudflare Worker with:
- **Static Assets**: Built React SPA (HTML, CSS, JS) served from the `dist/` directory
- **API Routes**: Handled by the Worker (`src/worker.ts`) which processes all requests
- **Environment Variables**: Configured via Cloudflare dashboard or wrangler CLI

**Project Structure:**
```
apps/gtd/
├── src/
│   ├── worker.ts              # Cloudflare Worker entrypoint (handles all API routes)
│   ├── index.tsx              # Bun development server (local only)
│   └── frontend.tsx           # React app
├── dist/                      # Build output (created by build script)
├── build.ts                   # Build script
├── package.json
└── wrangler.toml              # Cloudflare Workers configuration
```

### Auth Service

The Auth service handles authentication for the GTD app and other applications.

**Project Structure:**
```
apps/auth/
├── src/
│   ├── index.ts               # Cloudflare Worker entrypoint
│   ├── router.ts              # Hono router configuration
│   ├── handlers/              # Request handlers
│   ├── middleware/            # CORS, auth, rate-limiting
│   ├── durable-objects/       # Durable Object classes
│   └── lib/                   # Utilities (crypto, JWT, email)
├── test/                      # Test files
├── wrangler.toml              # Workers configuration
└── package.json
```

## Service Bindings

The GTD app communicates with the Auth service using Cloudflare Service Bindings rather than HTTP requests. This provides better performance and reliability.

### Development Environment

**wrangler.toml configuration:**
```toml
[[env.dev.services]]
binding = "AUTH_SERVICE"
service = "auth-service-dev"
```

This binds the `auth-service-dev` worker and makes it accessible as `env.AUTH_SERVICE` in the GTD app worker code.

### Production Environment

**wrangler.toml configuration:**
```toml
[[env.production.services]]
binding = "AUTH_SERVICE"
service = "auth-service-prod"
```

This binds the `auth-service-prod` worker and makes it accessible as `env.AUTH_SERVICE` in production.

### Why Service Bindings?

- **Lower latency**: Direct worker-to-worker communication without going through the public internet
- **Reliability**: No DNS resolution required
- **Security**: Requests never leave Cloudflare's network
- **Cost**: Doesn't count against API request quotas

## Deployment Environments

### Development Environment

**GTD App**: `gtd-app-dev`  
**Auth Service**: `auth-service-dev`

URLs:
- GTD App: https://gtd-app-dev.christopher-esplin.workers.dev
- Auth Service: https://auth-service-dev.christopher-esplin.workers.dev

### Production Environment

**GTD App**: `gtd-app-prod`  
**Auth Service**: `auth-service-prod`

URLs:
- GTD App: https://gtd-app-prod.christopher-esplin.workers.dev
- Auth Service: https://auth-service-prod.christopher-esplin.workers.dev

## Deployment Commands

### Prerequisites

1. **Cloudflare Account**: You need access to the Cloudflare account (Account ID: `cc4c7fdc635749de34e3fa649b321055`)
2. **Wrangler CLI**: Installed as a dev dependency in this project
3. **Authentication**: Run `wrangler login` to authenticate with Cloudflare

### Deploy GTD App to Development

```bash
# From the monorepo root
bun run deploy

# Or from the gtd app directory
cd apps/gtd && bun run deploy
```

This will:
1. Build the app with production settings
2. Build the Worker
3. Deploy to the `gtd-app-dev` Worker

### Deploy Auth Service to Development

```bash
# From the auth app directory
cd apps/auth && wrangler deploy --env=development
```

### Deploy GTD App to Production

```bash
# From the monorepo root
bun run deploy:prod

# Or from the gtd app directory
cd apps/gtd && bun run deploy:prod
```

### Deploy Auth Service to Production

```bash
# From the auth app directory
cd apps/auth && wrangler deploy --env=production
```

## API Routes

### GTD App Routes

All API routes in the GTD app are handled directly by the Worker (`src/worker.ts`):

#### `/api/auth/cookie-check` (GET)
- **Purpose**: Check if user has valid authentication cookie
- **Returns**: 
  - 200 if `access_token` cookie is present
  - 401 if not

#### `/api/auth/logout` (POST)
- **Purpose**: Clear authentication cookies
- **Returns**: 200 with Set-Cookie headers to clear tokens

#### `/api/auth/*` (ANY)
- **Purpose**: Proxy all other auth requests to the auth service
- **Behavior**:
  - Forwards requests to the auth service via service binding
  - Handles JSON responses with redirects and Set-Cookie headers
  - Sets authentication cookies from auth service responses

### Auth Service Routes

Core endpoints in the Auth service:

#### `POST /api/auth/request-magic-link`
Sends a magic link to the user's email.

**Request:**
```json
{
  "email": "user@example.com",
  "appId": "gtd",
  "redirectUri": "https://gtd-app.example.com/auth/callback"
}
```

**Response:**
```json
{
  "data": {
    "success": true,
    "message": "Magic link sent to your email"
  }
}
```

#### `GET /api/auth/verify?token=<token>`
Verifies the magic link token and creates a session.

**Response:**
```json
{
  "redirectUrl": "https://gtd-app.example.com/auth/callback",
  "accessToken": "<jwt_token>",
  "refreshToken": "<refresh_token>"
}
```

#### User Management Routes

- `GET /api/auth/user` - Get current user
- `PATCH /api/auth/user` - Update user profile
- `PATCH /api/auth/user/preferences` - Update user preferences
- `GET /api/auth/user/sessions` - List user sessions
- `DELETE /api/auth/user/sessions/:sessionId` - Revoke session

## Environment Configuration

### GTD App Environment Variables

#### Development

**wrangler.toml:**
```toml
[env.dev]
vars = { AUTH_URL = "https://auth-service-dev.christopher-esplin.workers.dev" }
```

The `AUTH_URL` is used as a fallback for local development when the service binding is not available.

#### Production

**wrangler.toml:**
```toml
[env.production]
vars = { AUTH_URL = "https://auth-service-prod.christopher-esplin.workers.dev" }
```

### Auth Service Environment Variables

#### Development

**wrangler.toml:**
```toml
[env.development]
vars = { 
  CLIENT_URL = "https://gtd-app-dev.christopher-esplin.workers.dev"
  ALLOWED_ORIGINS = "https://gtd-app-dev.christopher-esplin.workers.dev,http://localhost:3020,http://localhost:5173"
}
```

#### Production

**wrangler.toml:**
```toml
[env.production]
vars = {
  CLIENT_URL = "https://gtd-app-prod.christopher-esplin.workers.dev"
  ALLOWED_ORIGINS = "https://gtd-app-prod.christopher-esplin.workers.dev"
}
```

### Secrets

Set secrets via Wrangler CLI:

```bash
# Email service API key
wrangler secret put RESEND_API_KEY --env development

# JWT keys (generate with crypto)
wrangler secret put JWT_PRIVATE_KEY --env development
wrangler secret put JWT_PUBLIC_KEY --env development

# List all secrets
wrangler secret list --env development
```

## Monitoring and Logs

### View Logs

```bash
# Development logs
cd apps/gtd && wrangler tail --env dev
cd apps/auth && wrangler tail auth-service-dev --format pretty

# Production logs
cd apps/gtd && wrangler tail --env production
cd apps/auth && wrangler tail auth-service-prod --format pretty
```

### Performance Monitoring

Cloudflare provides performance insights in the dashboard:
1. Go to Cloudflare dashboard > Workers & Pages
2. Select the worker (e.g., `gtd-app-dev`)
3. View real-time metrics and error rates

## Troubleshooting

### Build Fails

**Symptoms**: `bun run deploy` fails during build

**Solutions**:
```bash
# Check dependencies
bun install

# Verify build works locally
bun run build

# Check build logs
bun run build --verbose
```

### API Routes Not Working

**Symptoms**: Auth requests return 404 or timeout

**Solutions**:
```bash
# Verify service binding is configured
cat wrangler.toml | grep -A 3 "services"

# Check auth service is deployed
wrangler deployments list auth-service-dev

# View auth service logs
wrangler tail auth-service-dev --format pretty
```

### Authentication Issues

**Symptoms**: Users can't log in or stay logged in

**Solutions**:
1. Verify CORS configuration in auth service
2. Check cookie settings (HttpOnly, Secure, SameSite)
3. Ensure ALLOWED_ORIGINS includes the GTD app URL
4. Check JWT key rotation hasn't caused token validation to fail

### Cold Start Issues

**Symptoms**: First request after deployment is slow

**Solutions**:
- This is normal for Cloudflare Workers
- Subsequent requests should be faster
- Monitor and optimize Worker code if possible
- Use service bindings for internal communication to reduce HTTP overhead

## Rollback Procedures

### Rollback via Dashboard

1. Go to Cloudflare dashboard > Workers & Pages
2. Select the worker (e.g., `gtd-app-dev`)
3. Navigate to the "Deployments" tab
4. Find the previous deployment you want to restore
5. Click the three-dot menu and select "Rollback"

### Rollback via CLI

```bash
# List deployments
wrangler deployments list --env dev

# Get the deployment ID you want to rollback to
# Then promote it
wrangler deployments rollback --env dev
```

## Related Documentation

- [Local Development Guide](./local-dev.md)
- [Architecture Summary](../ARCHITECTURE_SUMMARY.md)
- [Integration Guide](../INTEGRATION_GUIDE.md)
