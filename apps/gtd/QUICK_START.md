# GTD App - Quick Start Deployment Guide

## Prerequisites

Ensure you're authenticated with Cloudflare:
```bash
wrangler login
```

## First-Time Setup

### 1. Set Environment Variables

**Development:**
```bash
wrangler pages secret put AUTH_URL --project-name=gtd-app-dev
# Enter: https://auth-service-development.christopher-esplin.workers.dev
```

**Production:**
```bash
wrangler pages secret put AUTH_URL --project-name=gtd-app-prod
# Enter: https://auth-service-prod.christopher-esplin.workers.dev
```

## Deploy

### Development Environment
```bash
bun run deploy
```

### Production Environment
```bash
bun run deploy:prod
```

## What Gets Deployed?

- **Static Assets**: React SPA from `dist/` folder
- **API Functions**: Serverless functions from `_functions/` folder
  - `/api/auth/cookie-check` - Cookie validation
  - `/api/auth/logout` - Clear auth cookies
  - `/api/auth/*` - Proxy to auth service

## After Deployment

1. **Get Your URL**: Check the deployment output for the Pages URL
2. **Update Auth Service**: Add the GTD app URL to the auth service's `ALLOWED_ORIGINS`
3. **Configure Custom Domain** (Production only): Add via Cloudflare dashboard

## Troubleshooting

**View logs:**
```bash
wrangler pages deployment tail --project-name=gtd-app-dev
```

**Check deployments:**
```bash
wrangler pages deployment list --project-name=gtd-app-dev
```

For detailed documentation, see [DEPLOYMENT.md](DEPLOYMENT.md).
