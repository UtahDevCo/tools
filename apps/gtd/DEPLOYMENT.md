# GTD App - Cloudflare Pages Deployment Guide

This guide covers deploying the GTD app to Cloudflare Pages.

## Architecture

The GTD app is deployed as a Cloudflare Pages project with:
- **Static Assets**: Built React SPA (HTML, CSS, JS) served from the `dist/` directory
- **Pages Functions**: Serverless functions in the `_functions/` directory for API routes
- **Environment Variables**: Configured via Cloudflare dashboard or wrangler CLI

## Prerequisites

1. **Cloudflare Account**: You need access to the Cloudflare account (Account ID: `cc4c7fdc635749de34e3fa649b321055`)
2. **Wrangler CLI**: Installed as a dev dependency in this project
3. **Authentication**: Run `wrangler login` to authenticate with Cloudflare

## Project Structure

```
apps/gtd/
├── _functions/              # Cloudflare Pages Functions
│   ├── api/
│   │   └── auth/
│   │       ├── [[path]].ts        # Auth proxy (catch-all)
│   │       ├── cookie-check.ts    # Cookie validation
│   │       └── logout.ts          # Logout handler
│   └── types.d.ts
├── dist/                    # Build output (created by build script)
├── src/                     # Source code
├── build.ts                 # Build script
├── package.json
└── wrangler.toml            # Cloudflare configuration
```

## Environment Configuration

### Development Environment

**Project Name**: `gtd-app-dev`

Set environment variables:
```bash
# Set AUTH_URL for development
wrangler pages secret put AUTH_URL --project-name=gtd-app-dev
# Enter: https://auth-service-development.christopher-esplin.workers.dev
```

### Production Environment

**Project Name**: `gtd-app-prod`

Set environment variables:
```bash
# Set AUTH_URL for production
wrangler pages secret put AUTH_URL --project-name=gtd-app-prod
# Enter: https://auth-service-prod.christopher-esplin.workers.dev
```

## Deployment Commands

### Deploy to Development

```bash
# From the root of the monorepo
bun run deploy

# Or from the gtd app directory
cd apps/gtd
bun run deploy
```

This will:
1. Build the app with production settings
2. Deploy to the `gtd-app-dev` Pages project

### Deploy to Production

```bash
# From the root of the monorepo
bun run deploy:prod

# Or from the gtd app directory
cd apps/gtd
bun run deploy:prod
```

This will:
1. Build the app with production settings
2. Deploy to the `gtd-app-prod` Pages project

## First-Time Setup

If deploying for the first time, you may need to create the Pages projects:

```bash
# Create development project
wrangler pages project create gtd-app-dev

# Create production project
wrangler pages project create gtd-app-prod
```

Then set the environment variables as described above.

## API Routes

The following API routes are handled by Pages Functions:

### `/api/auth/cookie-check` (GET)
- **Purpose**: Check if user has valid authentication cookie
- **Implementation**: [_functions/api/auth/cookie-check.ts](_functions/api/auth/cookie-check.ts)
- **Returns**: 200 if valid, 401 if not

### `/api/auth/logout` (ANY)
- **Purpose**: Clear authentication cookies
- **Implementation**: [_functions/api/auth/logout.ts](_functions/api/auth/logout.ts)
- **Returns**: 200 with Set-Cookie headers to clear tokens

### `/api/auth/*` (ANY)
- **Purpose**: Proxy all other auth requests to the auth service
- **Implementation**: [_functions/api/auth/[[path]].ts](_functions/api/auth/[[path]].ts)
- **Behavior**:
  - Forwards requests to `AUTH_URL`
  - Handles JSON responses with redirects
  - Sets authentication cookies from auth service responses

## Monitoring and Logs

View logs for your deployment:

```bash
# Development logs
wrangler pages deployment tail --project-name=gtd-app-dev

# Production logs
wrangler pages deployment tail --project-name=gtd-app-prod
```

## Rollback

To rollback to a previous deployment:

1. Visit the Cloudflare dashboard
2. Navigate to Workers & Pages > gtd-app-[env]
3. Go to the Deployments tab
4. Find the previous deployment and click "Rollback"

Or use the CLI:

```bash
# List deployments
wrangler pages deployment list --project-name=gtd-app-dev

# Promote a specific deployment
wrangler pages deployment promote <DEPLOYMENT_ID> --project-name=gtd-app-dev
```

## Custom Domains

To add a custom domain:

1. Go to Cloudflare dashboard > Workers & Pages > gtd-app-[env]
2. Click on "Custom domains"
3. Add your domain (e.g., `gtd.chrisesplin.com` for production)
4. Follow DNS configuration instructions

## Troubleshooting

### Build Fails
- Check that all dependencies are installed: `bun install`
- Verify the build works locally: `bun run build`
- Check [build.ts](build.ts:1) for any environment-specific issues

### API Routes Not Working
- Verify environment variables are set correctly
- Check AUTH_URL is accessible from Cloudflare network
- View function logs: `wrangler pages deployment tail`

### Authentication Issues
- Ensure auth service is deployed and accessible
- Verify AUTH_URL environment variable matches deployed auth service
- Check cookie settings (HttpOnly, Secure, SameSite)

## Local Development

For local development, the app uses Bun's serve API (not Cloudflare):

```bash
bun run dev
```

This runs on `http://localhost:3020` and proxies auth requests to the auth service specified in `.env.development`.

## Integration with Monorepo

The deployment is integrated with Turborepo:

- Root [turbo.json](../../turbo.json:1) includes `deploy` and `deploy:prod` tasks
- Run from monorepo root: `bun run deploy` or `turbo run deploy --filter=gtd`
- Build dependencies are automatically handled by Turborepo

## Next Steps

After deployment:

1. **Set Environment Variables**: Configure AUTH_URL for each environment
2. **Configure Custom Domain**: Add production domain in Cloudflare dashboard
3. **Update Auth Service**: Add GTD app URL to allowed origins in auth service
4. **Test Authentication Flow**: Verify login/logout works end-to-end
5. **Monitor Performance**: Check Web Vitals and Core Web Vitals in dashboard
