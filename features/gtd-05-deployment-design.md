# Deployment & Infrastructure

## Overview

The GTD application is deployed entirely on Cloudflare's platform, leveraging Workers, Durable Objects, and related services for a globally distributed, serverless architecture.

## Technology Stack

### Backend
- **Cloudflare Workers**: Serverless compute platform
- **Durable Objects**: Stateful, strongly consistent data storage
- **Workers KV**: Optional for caching static data (future)
- **R2**: Optional for file storage (future user uploads)

### Frontend
- **Cloudflare Pages**: Static site hosting with automatic deployments
- **React**: UI framework
- **TanStack Router**: Client-side routing
- **TanStack Query**: Data fetching and caching

### External Services
- **Resend**: Transactional email delivery
- **Sentry**: Error tracking and monitoring (optional)

### Development Tools
- **Wrangler**: Cloudflare CLI for development and deployment
- **Vitest**: Unit testing framework
- **Playwright**: End-to-end testing
- **TypeScript**: Type safety throughout

## Project Structure

```
apps/gtd/
├── packages/
│   ├── api/                    # Cloudflare Worker
│   │   ├── src/
│   │   │   ├── index.ts        # Worker entry point
│   │   │   ├── router.ts       # API routing
│   │   │   ├── middleware/     # Auth, CORS, rate limiting
│   │   │   ├── handlers/       # Route handlers
│   │   │   ├── durable-objects/
│   │   │   │   ├── auth.ts     # AuthenticationDO
│   │   │   │   ├── user.ts     # UserDO
│   │   │   │   ├── queue.ts    # QueueDO
│   │   │   │   └── task.ts     # TaskDO
│   │   │   ├── lib/            # Utilities
│   │   │   └── types/          # TypeScript types
│   │   ├── test/
│   │   ├── wrangler.toml       # Worker configuration
│   │   └── package.json
│   │
│   ├── web/                    # React frontend
│   │   ├── src/
│   │   │   ├── main.tsx        # Entry point
│   │   │   ├── routes/         # TanStack Router routes
│   │   │   ├── components/     # React components
│   │   │   ├── hooks/          # Custom hooks
│   │   │   ├── lib/            # Utilities
│   │   │   ├── api/            # API client
│   │   │   └── styles/         # Global styles
│   │   ├── public/
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   └── shared/                 # Shared code
│       ├── src/
│       │   ├── schemas/        # Zod schemas
│       │   ├── types/          # Shared types
│       │   └── constants/      # Shared constants
│       └── package.json
│
├── package.json                # Root package.json
├── turbo.json                  # Turborepo config
├── tsconfig.json               # Root TypeScript config
└── GTD_Plan.md                 # This document
```

## Environment Variables

### Worker (API)

**Development (.dev.vars)**:
```env
ENVIRONMENT=development
RESEND_API_KEY=re_xxxxxxxxxxxxx
JWT_SECRET=your-secret-key-min-32-chars
ALLOWED_ORIGINS=http://localhost:5173
```

**Production (Cloudflare Dashboard > Workers > Settings > Variables)**:
```env
ENVIRONMENT=production
RESEND_API_KEY=re_xxxxxxxxxxxxx  # Secret
JWT_SECRET=xxx                    # Secret
ALLOWED_ORIGINS=https://gtd.your-domain.com
```

### Frontend (Pages)

**Development (.env.local)**:
```env
VITE_API_URL=http://localhost:8787/api
VITE_ENVIRONMENT=development
```

**Production (Cloudflare Dashboard > Pages > Settings > Environment Variables)**:
```env
VITE_API_URL=https://gtd.your-domain.com/api
VITE_ENVIRONMENT=production
```

## Wrangler Configuration

### wrangler.toml (API)

```toml
name = "gtd-api"
main = "src/index.ts"
compatibility_date = "2025-01-10"
compatibility_flags = ["nodejs_compat"]

# Account details
account_id = "your-account-id"
workers_dev = true

# Durable Objects bindings
[[durable_objects.bindings]]
name = "AUTH_DO"
class_name = "AuthenticationDO"
script_name = "gtd-api"

[[durable_objects.bindings]]
name = "USER_DO"
class_name = "UserDO"
script_name = "gtd-api"

[[durable_objects.bindings]]
name = "QUEUE_DO"
class_name = "QueueDO"
script_name = "gtd-api"

[[durable_objects.bindings]]
name = "TASK_DO"
class_name = "TaskDO"
script_name = "gtd-api"

# Migrations for Durable Objects
[[migrations]]
tag = "v1"
new_sqlite_classes = ["AuthenticationDO", "UserDO", "QueueDO", "TaskDO"]

# Development configuration
[env.development]
name = "gtd-api-dev"
vars = { ENVIRONMENT = "development" }

# Production configuration
[env.production]
name = "gtd-api-prod"
vars = { ENVIRONMENT = "production" }

# Build configuration
[build]
command = "npm run build"

[build.upload]
format = "service-worker"
```

## Deployment Process

### Initial Setup

1. **Install Wrangler**:
```bash
npm install -g wrangler
wrangler login
```

2. **Configure Cloudflare Account**:
```bash
# Set account ID in wrangler.toml
wrangler whoami
```

3. **Create Durable Object Namespaces**:
```bash
cd packages/api
wrangler durable-objects namespace create AUTH_DO
wrangler durable-objects namespace create USER_DO
wrangler durable-objects namespace create QUEUE_DO
wrangler durable-objects namespace create TASK_DO
```

4. **Set Secrets**:
```bash
wrangler secret put RESEND_API_KEY
wrangler secret put JWT_SECRET
```

### Development Workflow

```bash
# Install dependencies
npm install

# Start development servers (both API and web)
npm run dev

# Run tests
npm run test

# Type check
npm run type-check

# Lint
npm run lint
```

**Package Scripts (root package.json)**:
```json
{
  "scripts": {
    "dev": "turbo run dev --parallel",
    "build": "turbo run build",
    "test": "turbo run test",
    "type-check": "turbo run type-check",
    "lint": "turbo run lint",
    "deploy": "turbo run deploy"
  }
}
```

### API Development

```bash
cd packages/api

# Start local worker
npm run dev
# or
wrangler dev

# Run tests
npm run test

# Deploy to development
wrangler deploy --env development

# Deploy to production
wrangler deploy --env production
```

### Frontend Development

```bash
cd packages/web

# Start Vite dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### CI/CD Pipeline

#### GitHub Actions Workflow

**.github/workflows/deploy.yml**:
```yaml
name: Deploy

on:
  push:
    branches:
      - main
      - develop

jobs:
  deploy-api:
    runs-on: ubuntu-latest
    name: Deploy API
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm run test -w packages/api

      - name: Deploy to Cloudflare Workers
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          workingDirectory: packages/api
          command: deploy --env ${{ github.ref == 'refs/heads/main' && 'production' || 'development' }}

  deploy-web:
    runs-on: ubuntu-latest
    name: Deploy Frontend
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Build frontend
        run: npm run build -w packages/web
        env:
          VITE_API_URL: ${{ github.ref == 'refs/heads/main' && 'https://gtd.your-domain.com/api' || 'https://gtd-dev.your-domain.com/api' }}

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          accountId: ${{ secrets.CF_ACCOUNT_ID }}
          projectName: gtd-web
          directory: packages/web/dist
          branch: ${{ github.ref == 'refs/heads/main' && 'production' || 'preview' }}
```

## Monitoring & Observability

### Cloudflare Analytics

Monitor via Cloudflare Dashboard:
- Request volume and latency
- Error rates
- Durable Object usage
- Geographic distribution
- Cache hit rates

### Custom Metrics

Emit custom metrics from Workers:

```typescript
// In worker code
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const start = Date.now();

    try {
      const response = await handleRequest(request, env);

      // Log successful request
      console.info(JSON.stringify({
        timestamp: Date.now(),
        duration: Date.now() - start,
        method: request.method,
        url: request.url,
        status: response.status,
      }));

      return response;
    } catch (error) {
      // Log error
      console.error(JSON.stringify({
        timestamp: Date.now(),
        duration: Date.now() - start,
        method: request.method,
        url: request.url,
        error: error.message,
        stack: error.stack,
      }));

      throw error;
    }
  }
};
```

### Error Tracking (Optional)

Integrate Sentry for detailed error tracking:

```typescript
import * as Sentry from '@sentry/cloudflare';

Sentry.init({
  dsn: 'https://xxx@xxx.ingest.sentry.io/xxx',
  environment: env.ENVIRONMENT,
  tracesSampleRate: 0.1,
});

// Wrap handler
export default Sentry.wrap({
  async fetch(request, env, ctx) {
    return handleRequest(request, env, ctx);
  }
});
```

### Health Check Endpoint

```typescript
// GET /api/health
async function handleHealthCheck(env: Env): Promise<Response> {
  const checks = {
    timestamp: Date.now(),
    status: 'healthy',
    services: {
      worker: 'ok',
      durableObjects: await checkDurableObjects(env),
      resend: await checkResend(env),
    }
  };

  return new Response(JSON.stringify(checks), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

## Scaling Considerations

### Durable Objects Limits

- **CPU Time**: 30 seconds per request (auto-scales)
- **Memory**: 128 MB per instance
- **Storage**: 128 MB per instance (SQLite)
- **Requests**: Serialized per instance, unlimited global

### Scaling Strategy

1. **User-based sharding**: Each UserDO handles one user
2. **Queue-based sharding**: Each QueueDO handles one queue
3. **Task-based sharding**: Each TaskDO handles one task (if needed)
4. **Geographic distribution**: DOs automatically placed near users

### Performance Optimization

- Use SQLite indexes for common queries
- Implement caching in Workers (in-memory)
- Batch operations where possible
- Use connection pooling for external services
- Minimize cold starts with keep-alive patterns

## Backup & Disaster Recovery

### Durable Objects Backup

Cloudflare provides:
- Automatic replication across regions
- Point-in-time recovery (30 days)
- SQLite transaction logs

### Manual Backup Strategy

```typescript
// Export endpoint for user data
// GET /api/export
async function exportUserData(userId: string, env: Env): Promise<Response> {
  const userDO = env.USER_DO.get(env.USER_DO.idFromName(userId));
  const data = await userDO.exportData();

  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="gtd-backup-${Date.now()}.json"`
    }
  });
}
```

### Recovery Procedures

1. **Durable Object corruption**: Use point-in-time recovery
2. **Worker deployment failure**: Automatic rollback via Wrangler
3. **Data loss**: Restore from user exports or PITR
4. **Regional outage**: Automatic failover to other regions

## Security

### Secrets Management

- Store sensitive data in Cloudflare Secrets (encrypted at rest)
- Rotate secrets regularly (quarterly)
- Use different secrets for dev/prod
- Never commit secrets to Git

### Network Security

- Enable HTTPS only (automatic with Cloudflare)
- Configure CORS properly
- Implement rate limiting per IP
- Use CSP headers in frontend

### Application Security

- Validate all inputs with Zod
- Sanitize user-generated content
- Implement JWT token rotation
- Use httpOnly cookies for sensitive tokens
- Regular security audits

## Cost Estimation

### Cloudflare Workers (as of 2025)

**Free Tier**:
- 100,000 requests/day
- Suitable for development and small deployments

**Paid Plan ($5/month)**:
- 10 million requests/month included
- $0.50 per additional million requests
- Unlimited Durable Objects requests
- $0.20/GB-month for Durable Objects storage

### Resend (Email)

**Free Tier**:
- 3,000 emails/month
- 100 emails/day

**Growth Plan ($20/month)**:
- 50,000 emails/month included
- $1 per additional 1,000 emails

### Estimated Monthly Cost (1,000 active users)

| Service | Usage | Cost |
|---------|-------|------|
| Cloudflare Workers | ~5M requests | $5 |
| Durable Objects | ~500MB storage | $0.10 |
| Resend | ~10k emails | $20 |
| Cloudflare Pages | Unlimited | Free |
| **Total** | | **~$25/month** |

## Production Checklist

- [ ] Configure custom domain
- [ ] Set up SSL/TLS (automatic with CF)
- [ ] Configure all environment variables
- [ ] Set up monitoring and alerts
- [ ] Configure error tracking (Sentry)
- [ ] Set up CI/CD pipeline
- [ ] Test backup/recovery procedures
- [ ] Configure rate limiting
- [ ] Set up CORS properly
- [ ] Enable security headers
- [ ] Configure CSP
- [ ] Test magic link emails
- [ ] Verify JWT token expiration
- [ ] Load test Durable Objects
- [ ] Test mobile responsiveness
- [ ] Run accessibility audit
- [ ] Configure analytics
- [ ] Set up status page (optional)
- [ ] Document runbook for common issues
- [ ] Train team on deployment process
- [ ] Schedule regular security reviews

## Useful Commands

```bash
# View logs (real-time)
wrangler tail

# List Durable Objects
wrangler durable-objects list USER_DO

# View specific Durable Object
wrangler durable-objects get USER_DO <id>

# Rollback deployment
wrangler rollback

# View deployment history
wrangler deployments list

# Publish with custom name
wrangler deploy --name gtd-api-v2

# Delete Worker
wrangler delete

# View KV namespaces (if used)
wrangler kv:namespace list
```
