# GTD App Development Guide

## Quick Start

### Bun Development Server (Fast UI Development)

For rapid UI development with hot-reload:

```bash
bun run dev
```

This starts the Bun server at http://localhost:3020 with:
- ⚡ Fast hot-reload
- 🔥 Browser console logging
- 🎯 API routes at `/api/*`
- 🔐 Auth proxy at `/api/auth/*`

**Use this for:** Quick UI iteration, component development

### Workers Development (Production Parity)

For testing with the same runtime as production:

```bash
bun run dev:worker
```

This builds the app and starts Wrangler dev server with:
- ☁️ Cloudflare Workers runtime (Miniflare)
- 📦 Workers Static Assets for serving the SPA
- 🔗 Same API behavior as production
- 🌐 Local bindings simulation

**Use this for:** Integration testing, final validation before deployment

### Remote Development (Testing with Production Resources)

To test against production bindings (KV, D1, Durable Objects):

```bash
bun run dev:worker:remote
```

⚠️ **Warning:** This runs against production resources. Changes are not reversible.

## Build & Deploy

### Build for Production

```bash
bun run build
```

Outputs optimized static assets to `dist/`:
- Minified JavaScript and CSS
- Source maps
- Bundled assets (images, fonts, etc.)

### Deploy to Development Environment

```bash
bun run deploy
```

Deploys to `gtd-app-dev` with:
- Worker code from `src/worker.ts`
- Static assets from `dist/`
- Environment: dev
- AUTH_URL: https://auth-service-dev.christopher-esplin.workers.dev

### Deploy to Production

```bash
bun run deploy:prod
```

Deploys to `gtd-app-prod` with:
- Worker code from `src/worker.ts`
- Static assets from `dist/`
- Environment: production
- AUTH_URL: (must be set via `wrangler secret put AUTH_URL --env production`)

## Environment Configuration

### Local Development (.env.development)

Create `.env.development` for local Bun server:

```env
AUTH_URL=http://localhost:8787
```

### Wrangler Configuration (wrangler.toml)

Environment variables are configured in `wrangler.toml`:

- **Default (local):** `AUTH_URL = "http://localhost:8787"`
- **Dev:** `AUTH_URL = "https://auth-service-dev.christopher-esplin.workers.dev"`
- **Production:** Set via secrets (see below)

### Setting Production Secrets

```bash
# Set AUTH_URL for production
wrangler secret put AUTH_URL --env production

# List all secrets
wrangler secret list --env production
```

## Architecture

### Two Development Modes

1. **Bun Server (src/index.tsx)**
   - Fast local dev with hot-reload
   - Uses Bun's `serve()` API
   - Direct file watching
   - Good for UI development

2. **Workers Runtime (src/worker.ts)**
   - Production parity via Miniflare
   - Same runtime as Cloudflare Workers
   - Workers Static Assets for SPA
   - Good for integration testing

### API Routes

Both modes handle the same API routes:

- `/api/hello` - GET/PUT test endpoint
- `/api/hello/:name` - Personalized greeting
- `/api/auth/*` - Proxy to auth service
- `/api/auth/cookie-check` - Check authentication
- `/api/auth/logout` - Clear auth cookies

### Static Assets

- **Development:** Bun imports and serves `src/index.html`
- **Production:** Workers Static Assets serves from `dist/`
- **SPA Routing:** Unmatched routes return `index.html` (React Router handles client-side routing)

## Testing Checklist

Before deploying, verify:

### Basic API Contract
- [ ] `/api/hello` GET returns JSON { message, method }
- [ ] `/api/hello` PUT returns JSON { message, method }
- [ ] `/api/hello/:name` returns personalized greeting

### Auth Proxy and Cookies
- [ ] Auth proxy forwards requests to AUTH_URL
- [ ] Proxy preserves redirect behavior
- [ ] Proxy sets `Set-Cookie` headers correctly
- [ ] `/api/auth/cookie-check` returns 200 with access_token
- [ ] `/api/auth/cookie-check` returns 401 without access_token
- [ ] `/api/auth/logout` clears cookies (Max-Age=0)

### SPA Routing
- [ ] Root path `/` returns index.html
- [ ] Unmatched routes (e.g., `/tasks`) return index.html (200)
- [ ] Static assets (JS, CSS) return correct Content-Type
- [ ] React Router handles client-side navigation

## Troubleshooting

### Wrangler dev fails to start

```bash
# Clear .wrangler cache
rm -rf .wrangler

# Rebuild and try again
bun run build
bun run dev:worker
```

### Assets not updating

```bash
# Clean and rebuild
rm -rf dist
bun run build
```

### Auth proxy not working

1. Check AUTH_URL is set correctly
2. Verify auth service is running
3. Check network connectivity
4. Review wrangler dev logs for errors

### Production deployment issues

```bash
# Verify wrangler authentication
wrangler whoami

# Check deployment logs
wrangler tail --env production

# Verify environment variables
wrangler secret list --env production
```

## Project Structure

```
apps/gtd/
├── src/
│   ├── index.tsx          # Bun development server
│   ├── worker.ts          # Cloudflare Worker entrypoint
│   ├── index.html         # HTML template
│   ├── app.tsx            # React app root
│   └── routes/            # React Router routes
├── dist/                  # Build output (gitignored)
├── build.ts               # Build script
├── wrangler.toml          # Workers configuration
├── package.json           # Scripts and dependencies
└── DEV.md                 # This file
```

## Additional Scripts

### Router Code Generation

```bash
# Generate TanStack Router types
bun run routes:generate

# Watch and regenerate on changes
bun run routes:watch
```

### Type Checking

```bash
# Run TypeScript compiler
bun run check-types
```

## Next Steps

1. Start local development: `bun run dev`
2. Make your changes
3. Test with Workers runtime: `bun run dev:worker`
4. Deploy to dev: `bun run deploy`
5. Verify in dev environment
6. Deploy to production: `bun run deploy:prod`

## Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
- [TanStack Router](https://tanstack.com/router/)
