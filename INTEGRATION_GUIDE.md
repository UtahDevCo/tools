# Service Integration Guide

## Overview

This guide explains how the GTD application integrates with the authentication service and shared packages in the monorepo architecture.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         User's Browser                       │
│  ┌────────────────────────────────────────────────────────┐ │
│  │           GTD React App (apps/gtd/web)                  │ │
│  │                                                          │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │        @repo/api-client                          │  │ │
│  │  │  ┌─────────────┐      ┌──────────────┐          │  │ │
│  │  │  │ AuthClient  │      │  GTDClient   │          │  │ │
│  │  │  └─────────────┘      └──────────────┘          │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Workers                        │
│                                                              │
│  ┌──────────────────────┐       ┌───────────────────────┐  │
│  │  Auth Service        │       │    GTD API Service     │  │
│  │  (apps/auth)         │       │    (apps/gtd/api)      │  │
│  │                      │       │                        │  │
│  │  ┌────────────────┐ │       │  ┌──────────────────┐  │  │
│  │  │ AuthenticationDO│ │       │  │    QueueDO       │  │  │
│  │  └────────────────┘ │       │  └──────────────────┘  │  │
│  │  ┌────────────────┐ │       │  ┌──────────────────┐  │  │
│  │  │    UserDO      │ │       │  │    TaskDO        │  │  │
│  │  └────────────────┘ │       │  └──────────────────┘  │  │
│  └──────────────────────┘       └───────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Shared Packages (packages/)              │  │
│  │                                                        │  │
│  │  @repo/auth-schemas  @repo/gtd-schemas                │  │
│  │  @repo/cloudflare-utils  @repo/database               │  │
│  │  @repo/email-templates                                │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │
                            ▼
                     ┌─────────────┐
                     │   Resend    │
                     │   (Email)   │
                     └─────────────┘
```

## Authentication Flow

### 1. User Login Request

**Frontend (GTD App):**
```typescript
import { AuthClient } from '@repo/api-client';

const authClient = new AuthClient({
  apiUrl: 'https://auth.your-domain.com/api',
  appId: 'gtd'
});

// User requests magic link
await authClient.requestMagicLink('user@example.com');
```

**Auth Service:**
1. Validates email with `@repo/auth-schemas`
2. Generates magic link token in AuthenticationDO
3. Sends email via Resend with `@repo/email-templates`

### 2. Magic Link Verification

**User clicks link** → `https://auth.your-domain.com/api/auth/verify?token=xxx`

**Auth Service:**
1. Verifies token in AuthenticationDO
2. Gets/creates user in UserDO
3. Generates JWT access and refresh tokens
4. Sets httpOnly cookies
5. Redirects to GTD app with tokens

### 3. Accessing Protected GTD Resources

**Frontend (GTD App):**
```typescript
import { GTDClient } from '@repo/api-client';

const gtdClient = new GTDClient({
  apiUrl: 'https://gtd.your-domain.com/api',
  getAccessToken: () => authClient.getAccessToken()
});

// Fetch queues (automatically includes access token)
const queues = await gtdClient.getQueues();
```

**GTD API Service:**
1. Receives request with `Authorization: Bearer <token>` header
2. Verifies JWT with auth service's public key
3. Extracts user ID from token
4. Fetches data from QueueDO/TaskDO for that user
5. Returns response

### 4. Token Refresh

**Frontend (automatic):**
```typescript
// TanStack Query interceptor automatically refreshes expired tokens
// When access token expires (1 hour):
const newAccessToken = await authClient.refresh();
// Retries failed request with new token
```

**Auth Service:**
1. Validates refresh token from httpOnly cookie
2. Checks if token is revoked in AuthenticationDO
3. Validates session in UserDO
4. Issues new access token
5. Returns new token to client

## Data Flow Examples

### Creating a Task

```typescript
// 1. Frontend component
import { useCreateTask } from '@repo/api-client';
import { CreateTaskSchema } from '@repo/gtd-schemas';

function AddTaskForm({ queueId }: { queueId: string }) {
  const { mutate: createTask } = useCreateTask();

  const handleSubmit = (data: unknown) => {
    // Validate on client
    const validated = CreateTaskSchema.parse(data);
    
    // Send to API (optimistic update)
    createTask({
      queueId,
      ...validated
    });
  };

  // ...
}

// 2. API Client (packages/api-client)
export async function createTask(data: CreateTaskInput) {
  // Validate with schema
  const validated = CreateTaskSchema.parse(data);
  
  // Send authenticated request
  const response = await fetch(`${apiUrl}/queues/${data.queueId}/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAccessToken()}`
    },
    body: JSON.stringify(validated)
  });

  return TaskSchema.parse(response.data);
}

// 3. GTD API Handler (apps/gtd/api)
import { CreateTaskSchema, TaskSchema } from '@repo/gtd-schemas';
import { authMiddleware } from '@repo/cloudflare-utils';

export async function handleCreateTask(
  request: Request,
  env: Env
): Promise<Response> {
  // Verify authentication
  const { user } = await authMiddleware(request, env);
  
  // Validate request
  const data = CreateTaskSchema.parse(await request.json());
  
  // Get TaskDO
  const taskDO = env.TASK_DO.get(env.TASK_DO.idFromName(data.queueId));
  
  // Create task
  const task = await taskDO.createTask({
    ...data,
    userId: user.id
  });
  
  // Validate response
  return new Response(
    JSON.stringify({ data: TaskSchema.parse(task) }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}

// 4. TaskDO (apps/gtd/api/durable-objects)
import { BaseDurableObject } from '@repo/database';
import { TaskSchema } from '@repo/gtd-schemas';

export class TaskDO extends BaseDurableObject {
  async createTask(data: CreateTaskInput): Promise<Task> {
    const task = {
      id: crypto.randomUUID(),
      ...data,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await this.sql.run(
      'INSERT INTO tasks (...) VALUES (...)',
      [...]
    );

    return TaskSchema.parse(task);
  }
}
```

## Shared Package Usage

### Schema Validation

All services use shared schemas for consistency:

**Auth Service:**
```typescript
import { UserSchema, RequestMagicLinkSchema } from '@repo/auth-schemas';

// Validate request
const { email } = RequestMagicLinkSchema.parse(requestBody);

// Validate database result
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

### Utilities

**CORS Handling:**
```typescript
import { handleCors, corsHeaders } from '@repo/cloudflare-utils';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return handleCors(request, env.ALLOWED_ORIGINS);
    }

    const response = await handleRequest(request, env);
    
    return new Response(response.body, {
      ...response,
      headers: {
        ...response.headers,
        ...corsHeaders(env.ALLOWED_ORIGINS)
      }
    });
  }
};
```

**JWT Verification:**
```typescript
import { verifyJWT } from '@repo/cloudflare-utils';

export async function authMiddleware(
  request: Request,
  env: Env
): Promise<{ user: User }> {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    throw new Error('Missing authorization');
  }

  const payload = await verifyJWT(env.JWT_PUBLIC_KEY, token);
  
  // Get user from auth service or cache
  const user = await getUserById(payload.sub, env);
  
  return { user };
}
```

**Durable Object Patterns:**
```typescript
import { BaseDurableObject, withTransaction } from '@repo/database';

export class QueueDO extends BaseDurableObject {
  async updateQueue(id: string, data: UpdateQueueInput): Promise<Queue> {
    return await withTransaction(this.sql, async (tx) => {
      await tx.run(
        'UPDATE queues SET ... WHERE id = ?',
        [...]
      );

      const result = await tx.get(
        'SELECT * FROM queues WHERE id = ?',
        [id]
      );

      return QueueSchema.parse(result);
    });
  }
}
```

## Environment Configuration

### Auth Service

**Development (.dev.vars):**
```env
ENVIRONMENT=development
RESEND_API_KEY=re_xxxxxxxxxxxxx
JWT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----...
JWT_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----...
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
APP_URLS={"gtd":"http://localhost:5173"}
AUTH_URL=http://localhost:8787
DEFAULT_APP_URL=http://localhost:5173
```

**Production:**
```env
ENVIRONMENT=production
RESEND_API_KEY=re_xxxxxxxxxxxxx  # Secret
JWT_PRIVATE_KEY=...              # Secret
JWT_PUBLIC_KEY=...               # Public key (also shared with GTD API)
ALLOWED_ORIGINS=https://gtd.your-domain.com
APP_URLS={"gtd":"https://gtd.your-domain.com"}
AUTH_URL=https://auth.your-domain.com
DEFAULT_APP_URL=https://gtd.your-domain.com
```

### GTD API Service

**Development (.dev.vars):**
```env
ENVIRONMENT=development
JWT_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----...  # Same as auth service
AUTH_API_URL=http://localhost:8787/api
ALLOWED_ORIGINS=http://localhost:5173
```

**Production:**
```env
ENVIRONMENT=production
JWT_PUBLIC_KEY=...                            # Same as auth service
AUTH_API_URL=https://auth.your-domain.com/api
ALLOWED_ORIGINS=https://gtd.your-domain.com
```

### GTD Frontend

**Development (.env.local):**
```env
VITE_AUTH_API_URL=http://localhost:8787/api
VITE_GTD_API_URL=http://localhost:8788/api
VITE_APP_ID=gtd
VITE_ENVIRONMENT=development
```

**Production:**
```env
VITE_AUTH_API_URL=https://auth.your-domain.com/api
VITE_GTD_API_URL=https://gtd.your-domain.com/api
VITE_APP_ID=gtd
VITE_ENVIRONMENT=production
```

## Cross-Service Communication

### JWT Public Key Distribution

The auth service generates JWT tokens with its private key. The GTD API verifies tokens with the public key.

**Setup:**
1. Generate RS256 key pair in auth service
2. Store private key as secret in auth service
3. Store public key as secret in auth service
4. Copy public key to GTD API environment variables
5. Both services can now verify tokens

**Key Rotation:**
1. Generate new key pair
2. Update auth service with new private key
3. Keep old public key active for 1 hour (grace period)
4. Distribute new public key to GTD API
5. Remove old public key after grace period

### User Data Consistency

**Problem:** User profile is in auth service, but GTD API needs user info.

**Solution 1: Include in JWT (Current)**
```typescript
// JWT payload includes user info
{
  sub: 'user-id',
  email: 'user@example.com',
  displayName: 'John Doe', // User info in token
  iat: 1234567890,
  exp: 1234571490
}

// GTD API extracts from token
const { sub, email, displayName } = verifyJWT(token);
```

**Solution 2: User Service Cache (Future)**
```typescript
// GTD API caches user data
const user = await getUserFromCache(userId, env);

async function getUserFromCache(userId: string, env: Env) {
  // Check cache
  const cached = await env.USER_CACHE.get(userId);
  if (cached) return JSON.parse(cached);

  // Fetch from auth service
  const response = await fetch(`${env.AUTH_API_URL}/users/${userId}`, {
    headers: { 'X-Internal-Token': env.INTERNAL_SERVICE_TOKEN }
  });
  
  const user = await response.json();

  // Cache for 5 minutes
  await env.USER_CACHE.put(userId, JSON.stringify(user), {
    expirationTtl: 300
  });

  return user;
}
```

## Error Handling

### Auth Errors

**Auth service errors:**
```typescript
// 401 Unauthorized
{
  "error": {
    "code": "INVALID_TOKEN",
    "message": "Token is invalid or expired"
  }
}

// 429 Rate Limited
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "details": {
      "retryAfter": 3600
    }
  }
}
```

**Frontend handling:**
```typescript
import { AuthClient } from '@repo/api-client';

try {
  await authClient.requestMagicLink(email);
} catch (error) {
  if (error.code === 'RATE_LIMIT_EXCEEDED') {
    toast.error(`Too many attempts. Try again in ${error.retryAfter} seconds`);
  } else {
    toast.error(error.message);
  }
}
```

### GTD API Errors

**Validation errors:**
```typescript
// 400 Bad Request
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": {
      "field": "title",
      "error": "String must contain at least 1 character(s)"
    }
  }
}
```

**Frontend handling:**
```typescript
import { useCreateTask } from '@repo/api-client';

const { mutate: createTask } = useCreateTask({
  onError: (error) => {
    if (error.code === 'VALIDATION_ERROR') {
      setFieldError(error.details.field, error.details.error);
    } else {
      toast.error(error.message);
    }
  }
});
```

## Testing Integration

### Unit Tests

Test individual components with mocked dependencies:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { AuthClient } from '@repo/api-client';

describe('AuthClient', () => {
  it('should request magic link', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { success: true } })
    });

    global.fetch = mockFetch;

    const client = new AuthClient({
      apiUrl: 'http://localhost:8787/api',
      appId: 'gtd'
    });

    await client.requestMagicLink('test@example.com');

    expect(mockFetch).toHaveBeenCalled();
  });
});
```

### Integration Tests

Test services together using Miniflare:

```typescript
import { env, createExecutionContext } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';

describe('GTD API with Auth', () => {
  it('should create task with valid token', async () => {
    // 1. Create user in auth service
    const authResponse = await env.AUTH_WORKER.fetch(
      'http://localhost/api/auth/request-magic-link',
      {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com' })
      }
    );

    // 2. Get magic link token (from mock email)
    const token = await getMockMagicLinkToken();

    // 3. Verify and get JWT
    const verifyResponse = await env.AUTH_WORKER.fetch(
      `http://localhost/api/auth/verify?token=${token}`
    );
    
    const cookies = verifyResponse.headers.get('Set-Cookie');
    const accessToken = extractTokenFromCookie(cookies);

    // 4. Create task with JWT
    const taskResponse = await env.GTD_WORKER.fetch(
      'http://localhost/api/queues/queue-1/tasks',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          category: 'next_actions',
          title: 'Test task'
        })
      }
    );

    expect(taskResponse.ok).toBe(true);
    const { data } = await taskResponse.json();
    expect(data.title).toBe('Test task');
  });
});
```

### E2E Tests

Test complete user flows with Playwright:

```typescript
import { test, expect } from '@playwright/test';

test('complete GTD flow with auth', async ({ page }) => {
  // 1. Login
  await page.goto('http://localhost:5173/login');
  await page.fill('input[type="email"]', 'test@example.com');
  await page.click('button[type="submit"]');
  
  await expect(page.locator('text=Check your email')).toBeVisible();

  // 2. Click magic link (get from test email)
  const magicLink = await getTestMagicLink();
  await page.goto(magicLink);

  // 3. Should be authenticated and redirected
  await expect(page).toHaveURL('http://localhost:5173/app');

  // 4. Create queue
  await page.click('button:has-text("New Queue")');
  await page.fill('input[name="title"]', 'Work');
  await page.click('button:has-text("Create")');

  // 5. Create task
  await page.click('text=Next Actions');
  await page.fill('input[placeholder="Add task"]', 'Complete project');
  await page.press('input[placeholder="Add task"]', 'Enter');

  // 6. Verify task created
  await expect(page.locator('text=Complete project')).toBeVisible();
});
```

## Deployment

### Service Deployment Order

1. **Deploy shared packages** (if changed)
   ```bash
   bun run build
   ```

2. **Deploy auth service**
   ```bash
   cd apps/auth
   wrangler deploy --env production
   ```

3. **Deploy GTD API** (after auth is live)
   ```bash
   cd apps/gtd/api
   wrangler deploy --env production
   ```

4. **Deploy GTD frontend** (after API is live)
   ```bash
   cd apps/gtd/web
   bun run build
   wrangler pages deploy dist --project-name gtd-web
   ```

### Rollback Strategy

If GTD API deployment fails:

1. Rollback GTD API:
   ```bash
   wrangler rollback
   ```

2. Auth service remains unchanged (backwards compatible)

If auth service deployment fails:

1. Rollback auth service:
   ```bash
   wrangler rollback
   ```

2. GTD API continues to work with old auth tokens (grace period)

## Monitoring

### Distributed Tracing

Add correlation IDs to track requests across services:

```typescript
// Frontend
const correlationId = crypto.randomUUID();

await fetch(authUrl, {
  headers: {
    'X-Correlation-Id': correlationId
  }
});

await fetch(gtdApiUrl, {
  headers: {
    'X-Correlation-Id': correlationId
  }
});

// Services log with correlation ID
console.info(JSON.stringify({
  correlationId,
  service: 'auth',
  action: 'request_magic_link',
  // ...
}));
```

### Health Checks

Each service exposes health endpoint:

```typescript
// GET /api/health
{
  "status": "healthy",
  "service": "auth",
  "timestamp": 1234567890,
  "checks": {
    "database": "ok",
    "resend": "ok"
  }
}

// GET /api/health
{
  "status": "healthy",
  "service": "gtd-api",
  "timestamp": 1234567890,
  "checks": {
    "database": "ok",
    "auth": "ok"  // Can reach auth service
  }
}
```

## Best Practices

1. **Always validate with shared schemas** - Use `@repo/*-schemas` packages
2. **Include correlation IDs** - Track requests across services
3. **Handle auth errors gracefully** - Auto-refresh tokens, redirect to login
4. **Cache user data** - Reduce calls to auth service
5. **Monitor cross-service errors** - Alert on auth service failures
6. **Test service integration** - Integration tests for service boundaries
7. **Version APIs carefully** - Breaking changes need coordination
8. **Document service contracts** - Clear API specifications
9. **Use circuit breakers** - Fail gracefully when services are down
10. **Plan for auth service downtime** - Cache tokens, queue operations
