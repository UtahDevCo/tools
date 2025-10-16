# Local Development Guide

This guide explains how to set up and run the GTD app and Auth service locally for development.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Development Modes](#development-modes)
- [Environment Setup](#environment-setup)
- [Available Commands](#available-commands)
- [Architecture](#architecture)
- [Testing Checklist](#testing-checklist)
- [Troubleshooting](#troubleshooting)

## Overview

The repository uses **Bun** for all development and package management. All services can run locally with either:
1. **Bun dev server** - Fast iteration for UI development
2. **Cloudflare Workers (Miniflare)** - Production parity testing

## Quick Start

### Prerequisites

- **Bun**: Install from https://bun.sh
- **Git**: For version control
- **Node.js** (optional): Bun can run most Node packages, but Node isn't required

### 1. Install Dependencies

```bash
# From monorepo root
bun install
```

### 2. Start Auth Service

```bash
cd apps/auth
bun run dev
```

The auth service starts at `http://localhost:8787`

### 3. Start GTD App (in another terminal)

```bash
cd apps/gtd
bun run dev
```

The GTD app starts at `http://localhost:3020`

### 4. Test the App

Open http://localhost:3020 in your browser. You should see the GTD app with a login screen.

## Development Modes

### Mode 1: Bun Dev Server (Fast UI Development)

**Best for**: Rapid UI iteration, component development

```bash
cd apps/gtd
bun run dev
```

**Features**:
- ⚡ Fast hot-reload with live code updates
- 🔥 Browser DevTools integration
- 🎯 API routes at `/api/*`
- 🔐 Auth proxy at `/api/auth/*` (proxies to auth service)
- 📄 Auto-refresh on file changes
- 💾 `.env.development` support

**How it works**:
- Runs `src/index.tsx` using Bun's HTTP server
- Automatically transpiles TypeScript and JSX
- Serves static assets from `src/`
- Proxies API requests to the backend

### Mode 2: Workers Dev (Production Parity)

**Best for**: Integration testing, pre-deployment validation

```bash
cd apps/gtd
bun run dev:worker
```

**Features**:
- ☁️ Cloudflare Workers runtime (Miniflare)
- 📦 Workers Static Assets for serving the SPA
- 🔗 Same API behavior as production
- 🌐 Local bindings simulation (Durable Objects, KV, etc.)
- 📊 Metrics similar to production

**How it works**:
- Builds the app and starts `wrangler dev`
- Runs the actual `src/worker.ts` code
- Simulates Cloudflare Workers environment locally
- Uses Miniflare for Workers simulation

## Environment Setup

### GTD App Environment Variables

Create `.env.development` in the `apps/gtd` directory:

```env
# Auth service URL for local development
AUTH_URL=http://localhost:8787

# Optional: Override default values
# VITE_API_URL=http://localhost:3020
```

### Auth Service Secrets

For local development, the auth service needs JWT keys and email credentials. These are configured via environment variables:

**Create `.env.development` in `apps/auth`:**

```env
# Email service (Resend)
RESEND_API_KEY=re_xxx...

# JWT keys (generate new ones or use test keys)
JWT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
JWT_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----
```

**To generate JWT keys:**

```bash
cd apps/auth

# Generate both keys
bun run generate-keys

# Or manually with openssl:
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem
```

### Using Environment Script

The auth service provides a script to set environment variables:

```bash
cd apps/auth

# Set keys for development
bash scripts/put-keys.sh

# Or for production
bash scripts/put-keys.sh --production
```

## Available Commands

### Monorepo Commands

From the root directory:

```bash
# Install dependencies for all apps
bun install

# Run all linters
bun run lint

# Type-check all apps
bun run check-types

# Deploy all apps to dev
bun run deploy

# Deploy all apps to production
bun run deploy:prod
```

### GTD App Commands

From `apps/gtd`:

```bash
# Fast development (Bun server)
bun run dev

# Production parity development (Workers)
bun run dev:worker

# Build for production
bun run build

# Deploy to dev environment
bun run deploy

# Deploy to production
bun run deploy:prod

# Generate TanStack Router types
bun run routes:generate

# Watch and regenerate routes
bun run routes:watch

# Type checking
bun run check-types

# Linting
bun run lint
```

### Auth Service Commands

From `apps/auth`:

```bash
# Local development
bun run dev

# Run tests
bun run test

# Run unit tests only
bun run test:unit

# Run integration tests only
bun run test:integration

# Run end-to-end tests
bun run test:e2e

# Watch mode for tests
bun run test:watch

# Type checking
bun run typecheck

# Generate and set JWT keys
bun run generate-keys

# Deploy to dev
wrangler deploy --env=development

# Deploy to production
wrangler deploy --env=production
```

## Architecture

### Request Flow in Bun Dev Mode

```
Browser
  ↓
Bun Server (src/index.tsx)
  ├─ API Routes (/api/*)
  │  ├─ /api/hello → Direct response
  │  ├─ /api/auth/* → Proxy to Auth Service
  │  └─ /api/auth/cookie-check → Direct response
  │
  └─ Static Assets
     ├─ index.html
     ├─ app.tsx (React)
     └─ CSS, images, etc.
```

### Request Flow in Workers Dev Mode

```
Browser
  ↓
Miniflare (Simulated Cloudflare Workers)
  ├─ src/worker.ts
  │  ├─ API Routes (/api/*)
  │  ├─ Service Binding to Auth Service
  │  └─ Static Assets (dist/)
  │
  └─ Static Assets via ASSETS binding
     ├─ Bundled HTML, CSS, JS
     └─ Optimized for production
```

### Service Bindings

In production, the GTD app uses service bindings to communicate with the auth service:

```typescript
// In src/worker.ts
if (env.AUTH_SERVICE) {
  response = await env.AUTH_SERVICE.fetch(authRequest);
} else {
  // Fallback to HTTP URL for local dev
  response = await fetch(authUrl.toString(), fetchOptions);
}
```

During local dev with Bun server, it falls back to HTTP requests.

## Testing Checklist

Before deploying, run through this checklist:

### Basic API Contract

- [ ] `GET /api/hello` returns `{ message: "Hello, world!", method: "GET" }`
- [ ] `PUT /api/hello` returns `{ message: "Hello, world!", method: "PUT" }`
- [ ] `GET /api/hello/test` returns `{ message: "Hello, test!" }`

### Auth Proxy and Cookies

- [ ] Proxy forwards requests to AUTH_URL
- [ ] Proxy preserves redirect behavior
- [ ] Proxy sets `Set-Cookie` headers correctly
- [ ] `GET /api/auth/cookie-check` returns 200 with access_token cookie
- [ ] `GET /api/auth/cookie-check` returns 401 without access_token cookie
- [ ] `POST /api/auth/logout` clears cookies (Max-Age=0)

### SPA Routing

- [ ] `/` returns index.html (200)
- [ ] `/tasks` returns index.html (200, SPA fallback)
- [ ] `/login` returns index.html (200, SPA fallback)
- [ ] Static assets (JS, CSS) return correct Content-Type
- [ ] React Router handles client-side navigation

### Authentication Flow

- [ ] User can request magic link at `/login`
- [ ] Email is received (check your email or Resend dashboard)
- [ ] Clicking magic link redirects to callback URL
- [ ] Cookies are set after verification
- [ ] User can logout
- [ ] Session is cleared

### Workers Development

Test the same checklist with `bun run dev:worker`:

- [ ] All routes work in Workers runtime
- [ ] Static assets load correctly
- [ ] API responses match Bun dev server
- [ ] Service binding to auth service works

## Troubleshooting

### Bun Dev Server Issues

**Problem**: Port 3020 already in use

```bash
# Find process using port
lsof -i :3020

# Kill process
kill -9 <PID>

# Or use different port
bun run dev --port 3030
```

**Problem**: Changes not hot-reloading

```bash
# Restart the dev server
# Bun should watch for file changes automatically
# If not, check .env.development is correct
```

### Workers Dev Issues

**Problem**: Wrangler dev fails to start

```bash
# Clear .wrangler cache
rm -rf .wrangler

# Rebuild and try again
bun run build
bun run dev:worker
```

**Problem**: Assets not updating in Workers dev

```bash
# Full rebuild
rm -rf dist
bun run build
bun run dev:worker
```

### Auth Service Issues

**Problem**: Auth service fails to start

```bash
# Check dependencies
bun install

# Check .env.development exists and has JWT keys
cat .env.development

# Generate keys if missing
bun run generate-keys
```

**Problem**: Magic link emails not received

```bash
# Check RESEND_API_KEY is set
echo $RESEND_API_KEY

# Check auth service logs for errors
# Should show "Magic link sent to your email"
```

### Cookie/Authentication Issues

**Problem**: Cookies not being set after login

1. Check browser DevTools (Application > Cookies)
2. Verify auth service is returning Set-Cookie headers
3. Ensure cookie domain/SameSite settings are correct
4. Check auth service logs for errors

**Problem**: Getting 401 on authenticated routes

1. Verify access_token cookie exists
2. Check token hasn't expired (max 1 hour)
3. Verify JWT keys haven't changed between requests
4. Check /api/auth/cookie-check returns 200

### Monorepo Commands Not Working

**Problem**: `bun run deploy` not found

```bash
# Check you're in the monorepo root
pwd

# Verify turbo.json exists
ls turbo.json

# Try with turbo explicitly
bun turbo run deploy --filter=gtd
```

## Next Steps

1. Start the auth service: `cd apps/auth && bun run dev`
2. Start the GTD app: `cd apps/gtd && bun run dev`
3. Open http://localhost:3020
4. Run through the testing checklist
5. When ready to test with Workers runtime: `bun run dev:worker`
6. Deploy to dev: `bun run deploy`

## Related Documentation

- [Deployment Guide](./deployment.md)
- [Authentication Setup](./authentication.md)
- [Architecture Summary](../ARCHITECTURE_SUMMARY.md)
