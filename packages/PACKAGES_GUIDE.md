# Shared Packages - Architecture Guide

## Overview

This document outlines the shared packages structure that enables code reuse across multiple applications in the monorepo. These packages provide common schemas, utilities, and clients that all apps can use.

## Package Structure

```
packages/
├── auth-schemas/          # Authentication Zod schemas
├── gtd-schemas/          # GTD domain Zod schemas  
├── api-client/           # Typed API client for all services
├── cloudflare-utils/     # Cloudflare Workers utilities
├── database/             # Durable Object patterns and utilities
├── email-templates/      # React Email templates
├── ui/                   # Shared UI components (existing)
├── eslint-config/        # ESLint configurations (existing)
└── typescript-config/    # TypeScript configurations (existing)
```

## Package Details

### @repo/auth-schemas

Shared Zod schemas for authentication.

**Location:** `packages/auth-schemas/`

**Exports:**
```typescript
// User schemas
export { UserSchema, type User } from './user';
export { SessionSchema, type Session } from './session';
export { UserPreferencesSchema, type UserPreferences } from './preferences';

// Token schemas
export { MagicLinkTokenSchema, type MagicLinkToken } from './magic-link';
export { AccessTokenPayloadSchema, type AccessTokenPayload } from './jwt';
export { RefreshTokenPayloadSchema, type RefreshTokenPayload } from './jwt';

// Request/Response schemas
export { RequestMagicLinkSchema } from './requests';
export { VerifyMagicLinkSchema } from './requests';
export { UpdateUserSchema } from './requests';
```

**Usage:**
```typescript
import { UserSchema, RequestMagicLinkSchema } from '@repo/auth-schemas';

// Validate request
const data = RequestMagicLinkSchema.parse(req.body);

// Validate database result
const user = UserSchema.parse(dbResult);
```

**package.json:**
```json
{
  "name": "@repo/auth-schemas",
  "version": "0.0.0",
  "private": true,
  "exports": {
    ".": "./src/index.ts"
  },
  "dependencies": {
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@repo/typescript-config": "workspace:*",
    "typescript": "5.9.2"
  }
}
```

---

### @repo/gtd-schemas

Shared Zod schemas for GTD domain.

**Location:** `packages/gtd-schemas/`

**Exports:**
```typescript
// Domain schemas
export { QueueSchema, type Queue } from './queue';
export { TaskSchema, type Task, TaskCategorySchema } from './task';

// Request/Response schemas
export { CreateQueueSchema } from './requests';
export { UpdateQueueSchema } from './requests';
export { CreateTaskSchema } from './requests';
export { UpdateTaskSchema } from './requests';
export { MoveTaskSchema } from './requests';
export { ReorderTasksSchema } from './requests';
export { BatchTaskOperationSchema } from './requests';
```

**Usage:**
```typescript
import { TaskSchema, CreateTaskSchema } from '@repo/gtd-schemas';

// Validate request
const taskData = CreateTaskSchema.parse(req.body);

// Validate response
const task = TaskSchema.parse(dbResult);
```

---

### @repo/api-client

Type-safe API client for all services.

**Location:** `packages/api-client/`

**Exports:**
```typescript
// Auth client
export { AuthClient } from './auth-client';
export { useAuth } from './hooks/use-auth';

// GTD client
export { GTDClient } from './gtd-client';
export { useQueues, useTasks, useCreateTask } from './hooks/use-gtd';

// Base client
export { BaseClient, type RequestConfig } from './base-client';
export { ApiError } from './errors';
```

**Usage (Frontend):**
```typescript
import { AuthClient, GTDClient } from '@repo/api-client';

// Initialize clients
const authClient = new AuthClient({
  apiUrl: import.meta.env.VITE_AUTH_API_URL,
  appId: 'gtd'
});

const gtdClient = new GTDClient({
  apiUrl: import.meta.env.VITE_GTD_API_URL,
  getAccessToken: () => authClient.getAccessToken()
});

// Use in React
import { useAuth, useQueues } from '@repo/api-client';

function App() {
  const { user, isAuthenticated } = useAuth();
  const { data: queues } = useQueues();
  
  // ...
}
```

**Implementation:**
```typescript
// auth-client.ts
import { z } from 'zod';
import { UserSchema, RequestMagicLinkSchema } from '@repo/auth-schemas';
import { BaseClient } from './base-client';

export class AuthClient extends BaseClient {
  constructor(config: { apiUrl: string; appId?: string }) {
    super(config.apiUrl);
    this.appId = config.appId;
  }

  async requestMagicLink(email: string): Promise<void> {
    const validated = RequestMagicLinkSchema.parse({ 
      email, 
      appId: this.appId 
    });
    
    await this.post('/auth/request-magic-link', validated);
  }

  async getMe(): Promise<User> {
    const response = await this.get('/auth/me');
    return UserSchema.parse(response.data);
  }

  async updateMe(data: Partial<User>): Promise<User> {
    const response = await this.patch('/auth/me', data);
    return UserSchema.parse(response.data);
  }

  async logout(): Promise<void> {
    await this.post('/auth/logout');
  }

  async refresh(): Promise<{ access_token: string; expires_in: number }> {
    const response = await this.post('/auth/refresh');
    return response.data;
  }
}
```

**package.json:**
```json
{
  "name": "@repo/api-client",
  "version": "0.0.0",
  "private": true,
  "exports": {
    ".": "./src/index.ts"
  },
  "dependencies": {
    "@repo/auth-schemas": "workspace:*",
    "@repo/gtd-schemas": "workspace:*",
    "@tanstack/react-query": "^5.62.15",
    "zod": "^3.23.8"
  },
  "peerDependencies": {
    "react": "^18.3.1"
  },
  "devDependencies": {
    "@repo/typescript-config": "workspace:*",
    "@types/react": "^18.3.18",
    "typescript": "5.9.2"
  }
}
```

---

### @repo/cloudflare-utils

Shared Cloudflare Workers utilities.

**Location:** `packages/cloudflare-utils/`

**Exports:**
```typescript
// CORS utilities
export { corsHeaders, handleCors } from './cors';

// Rate limiting
export { RateLimiter } from './rate-limiter';

// JWT utilities
export { generateJWT, verifyJWT, JWTError } from './jwt';

// Cookie utilities
export { parseCookies, serializeCookie } from './cookies';

// Response helpers
export { jsonResponse, errorResponse } from './responses';

// Validation helpers
export { validateRequest } from './validation';
```

**Usage:**
```typescript
import { handleCors, jsonResponse, validateRequest } from '@repo/cloudflare-utils';
import { CreateTaskSchema } from '@repo/gtd-schemas';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS
    if (request.method === 'OPTIONS') {
      return handleCors(request);
    }

    // Validate request
    const { data, error } = await validateRequest(request, CreateTaskSchema);
    
    if (error) {
      return errorResponse(error, 400);
    }

    // Process request
    const result = await processTask(data);

    // Return JSON response
    return jsonResponse(result);
  }
};
```

**package.json:**
```json
{
  "name": "@repo/cloudflare-utils",
  "version": "0.0.0",
  "private": true,
  "exports": {
    ".": "./src/index.ts"
  },
  "dependencies": {
    "@tsndr/cloudflare-worker-jwt": "^2.5.5",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20250115.0",
    "@repo/typescript-config": "workspace:*",
    "typescript": "5.9.2"
  }
}
```

---

### @repo/database

Shared Durable Object patterns and utilities.

**Location:** `packages/database/`

**Exports:**
```typescript
// Base Durable Object class
export { BaseDurableObject } from './base-do';

// SQLite utilities
export { executeSql, executeSqlBatch } from './sqlite';
export { createMigration, runMigrations } from './migrations';

// Schema versioning
export { SchemaVersion, getSchemaVersion, setSchemaVersion } from './versioning';

// Common patterns
export { withTransaction } from './transactions';
export { cleanupExpired } from './cleanup';
```

**Usage:**
```typescript
import { BaseDurableObject, withTransaction } from '@repo/database';

export class TaskDO extends BaseDurableObject {
  async createTask(data: CreateTaskInput): Promise<Task> {
    return await withTransaction(this.sql, async (tx) => {
      const task = {
        id: crypto.randomUUID(),
        ...data,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await tx.run(
        'INSERT INTO tasks (id, queue_id, title, ...) VALUES (?, ?, ?, ...)',
        [task.id, task.queueId, task.title, ...]
      );

      return task;
    });
  }
}
```

**Base Durable Object:**
```typescript
import { DurableObject } from 'cloudflare:workers';

export abstract class BaseDurableObject extends DurableObject {
  protected sql: SqlStorage;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
  }

  async initializeSchema(): Promise<void> {
    // To be implemented by subclasses
  }

  async cleanupExpired(): Promise<void> {
    // Common cleanup logic
  }
}
```

**package.json:**
```json
{
  "name": "@repo/database",
  "version": "0.0.0",
  "private": true,
  "exports": {
    ".": "./src/index.ts"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20250115.0",
    "@repo/typescript-config": "workspace:*",
    "typescript": "5.9.2"
  }
}
```

---

### @repo/email-templates

Shared React Email templates.

**Location:** `packages/email-templates/`

**Exports:**
```typescript
// Auth templates
export { MagicLinkEmail } from './magic-link';
export { WelcomeEmail } from './welcome';

// GTD templates  
export { TaskReminderEmail } from './task-reminder';
export { WeeklySummaryEmail } from './weekly-summary';

// Common components
export { Button } from './components/button';
export { Layout } from './components/layout';
```

**Usage:**
```typescript
import { MagicLinkEmail } from '@repo/email-templates';
import { Resend } from 'resend';

const resend = new Resend(env.RESEND_API_KEY);

await resend.emails.send({
  from: 'noreply@chrisesplin.com',
  to: email,
  subject: 'Sign in to GTD',
  react: MagicLinkEmail({ 
    magicLink, 
    appName: 'GTD Task Tracker' 
  })
});
```

**Magic Link Template:**
```typescript
import {
  Html,
  Head,
  Body,
  Container,
  Text,
  Button,
  Link
} from '@react-email/components';

export interface MagicLinkEmailProps {
  magicLink: string;
  appName: string;
}

export function MagicLinkEmail({ magicLink, appName }: MagicLinkEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Text style={heading}>Sign in to {appName}</Text>
          <Text style={paragraph}>
            Click the button below to sign in to your account.
            This link will expire in 15 minutes.
          </Text>
          <Button href={magicLink} style={button}>
            Sign In
          </Button>
          <Text style={paragraph}>
            Or copy this link: <Link href={magicLink}>{magicLink}</Link>
          </Text>
          <Text style={footer}>
            If you didn't request this email, you can safely ignore it.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const heading = {
  fontSize: '32px',
  lineHeight: '1.3',
  fontWeight: '700',
  color: '#484848',
  padding: '17px 0 0',
};

const paragraph = {
  fontSize: '18px',
  lineHeight: '1.4',
  color: '#484848',
};

const button = {
  backgroundColor: '#000000',
  borderRadius: '5px',
  color: '#fff',
  fontSize: '18px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  width: '100%',
  padding: '15px 0',
};

const footer = {
  color: '#9ca299',
  fontSize: '14px',
  marginTop: '60px',
};
```

**package.json:**
```json
{
  "name": "@repo/email-templates",
  "version": "0.0.0",
  "private": true,
  "exports": {
    ".": "./src/index.ts"
  },
  "dependencies": {
    "@react-email/components": "^0.0.25",
    "react": "^18.3.1"
  },
  "devDependencies": {
    "@repo/typescript-config": "workspace:*",
    "@types/react": "^18.3.18",
    "typescript": "5.9.2"
  },
  "scripts": {
    "dev": "email dev",
    "export": "email export"
  }
}
```

---

## Package Development

### Creating a New Package

1. **Create package directory:**
   ```bash
   mkdir -p packages/my-package/src
   cd packages/my-package
   ```

2. **Initialize package.json:**
   ```bash
   bun init -y
   ```

3. **Update package.json:**
   ```json
   {
     "name": "@repo/my-package",
     "version": "0.0.0",
     "private": true,
     "exports": {
       ".": "./src/index.ts"
     },
     "devDependencies": {
       "@repo/typescript-config": "workspace:*",
       "typescript": "5.9.2"
     }
   }
   ```

4. **Create tsconfig.json:**
   ```json
   {
     "extends": "@repo/typescript-config/base.json",
     "compilerOptions": {
       "outDir": "dist"
     },
     "include": ["src"],
     "exclude": ["node_modules", "dist"]
   }
   ```

5. **Create src/index.ts:**
   ```typescript
   export * from './my-module';
   ```

### Using Packages

In consuming apps/packages:

```json
{
  "dependencies": {
    "@repo/auth-schemas": "workspace:*",
    "@repo/api-client": "workspace:*"
  }
}
```

In code:
```typescript
import { UserSchema } from '@repo/auth-schemas';
import { AuthClient } from '@repo/api-client';
```

### Building Packages

Add build scripts to package.json:

```json
{
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "check-types": "tsc --noEmit"
  }
}
```

Build all packages:
```bash
# From root
bun run build

# Or with turbo
turbo run build
```

## Testing Packages

### Unit Tests

```typescript
// packages/auth-schemas/src/user.test.ts
import { describe, it, expect } from 'vitest';
import { UserSchema } from './user';

describe('UserSchema', () => {
  it('should validate valid user', () => {
    const user = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
      displayName: 'Test User',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      preferences: {
        theme: 'dark',
        emailNotifications: true
      }
    };

    const result = UserSchema.parse(user);
    expect(result).toEqual(user);
  });

  it('should reject invalid email', () => {
    const user = {
      email: 'invalid-email',
      // ...
    };

    expect(() => UserSchema.parse(user)).toThrow();
  });
});
```

### Integration Tests

Test packages together:

```typescript
// packages/api-client/src/auth-client.test.ts
import { describe, it, expect, vi } from 'vitest';
import { AuthClient } from './auth-client';

describe('AuthClient', () => {
  it('should request magic link', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { success: true } })
    });

    global.fetch = mockFetch;

    const client = new AuthClient({
      apiUrl: 'http://localhost:8787/api',
      appId: 'test'
    });

    await client.requestMagicLink('test@example.com');

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8787/api/auth/request-magic-link',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          appId: 'test'
        })
      })
    );
  });
});
```

## Package Dependencies

### Dependency Graph

```
apps/auth
  ├── @repo/auth-schemas
  ├── @repo/cloudflare-utils
  ├── @repo/database
  └── @repo/email-templates

apps/gtd  
  ├── @repo/auth-schemas
  ├── @repo/gtd-schemas
  ├── @repo/api-client
  │   ├── @repo/auth-schemas
  │   └── @repo/gtd-schemas
  ├── @repo/ui
  └── @repo/typescript-config

packages/api-client
  ├── @repo/auth-schemas
  └── @repo/gtd-schemas
```

### Circular Dependency Prevention

- Never import from apps in packages
- Packages can depend on other packages
- Keep dependency graph acyclic
- Use TypeScript project references for better builds

## Versioning Strategy

All packages use `0.0.0` version while in monorepo.

For external publishing (future):
- Use semantic versioning
- Automated releases with changesets
- Publish to npm or private registry

## Best Practices

1. **Keep packages focused**: One clear responsibility per package
2. **Export only public API**: Use `exports` field in package.json
3. **Document exports**: Add JSDoc comments to exported items
4. **Test thoroughly**: Unit and integration tests for all packages
5. **Version together**: All packages version bump together
6. **TypeScript strict mode**: Enable strict type checking
7. **No side effects**: Packages should be pure imports
8. **Tree-shakeable**: Structure code for tree-shaking

## Migration Guide

### Moving Code to Shared Packages

1. **Identify common code** in apps
2. **Extract to appropriate package**
3. **Update imports in apps**
4. **Add tests for extracted code**
5. **Verify apps still work**

Example:

```typescript
// Before (in apps/gtd/src/lib/schemas/task.ts)
export const TaskSchema = z.object({ ... });

// After (in packages/gtd-schemas/src/task.ts)
export const TaskSchema = z.object({ ... });

// Update in apps/gtd
import { TaskSchema } from '@repo/gtd-schemas';
```

## Future Packages

Potential packages to add:

- `@repo/testing-utils` - Shared test utilities
- `@repo/logger` - Structured logging
- `@repo/analytics` - Analytics tracking
- `@repo/feature-flags` - Feature flag client
- `@repo/monitoring` - Error tracking and metrics
