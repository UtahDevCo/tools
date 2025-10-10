# Authentication Service - Technical Plan

## Overview

This document details the technical implementation of the standalone authentication service that will be used across all applications in the monorepo.

## Project Structure

```
apps/auth/
├── src/
│   ├── index.ts                    # Worker entry point
│   ├── router.ts                   # API routing
│   ├── middleware/
│   │   ├── cors.ts                # CORS handling
│   │   ├── rate-limit.ts          # Rate limiting
│   │   └── auth.ts                # JWT verification middleware
│   ├── handlers/
│   │   ├── request-magic-link.ts  # Magic link request handler
│   │   ├── verify.ts              # Token verification handler
│   │   ├── refresh.ts             # Token refresh handler
│   │   ├── logout.ts              # Logout handler
│   │   └── user.ts                # User profile handlers
│   ├── durable-objects/
│   │   ├── authentication-do.ts   # AuthenticationDO
│   │   └── user-do.ts             # UserDO
│   ├── lib/
│   │   ├── jwt.ts                 # JWT utilities
│   │   ├── email.ts               # Email sending utilities
│   │   └── crypto.ts              # Cryptographic utilities
│   └── types/
│       ├── env.ts                 # Environment types
│       └── auth.ts                # Authentication types
├── test/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── wrangler.toml                   # Cloudflare configuration
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

## Data Schemas

### User Schema

```typescript
import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().toLowerCase(),
  displayName: z.string().min(1).max(100),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
  preferences: z.object({
    theme: z.enum(['light', 'dark', 'system']).default('system'),
    emailNotifications: z.boolean().default(true),
  }).default({})
});

export type User = z.infer<typeof UserSchema>;
```

### Session Schema

```typescript
export const SessionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  refreshTokenId: z.string(),
  appId: z.string().optional(),
  createdAt: z.number().int().positive(),
  lastAccessedAt: z.number().int().positive(),
  expiresAt: z.number().int().positive(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
});

export type Session = z.infer<typeof SessionSchema>;
```

### Magic Link Token Schema

```typescript
export const MagicLinkTokenSchema = z.object({
  token: z.string().min(32),
  email: z.string().email(),
  appId: z.string().optional(),
  redirectUri: z.string().url().optional(),
  createdAt: z.number().int().positive(),
  expiresAt: z.number().int().positive(),
  attempts: z.number().int().min(0).default(0),
});

export type MagicLinkToken = z.infer<typeof MagicLinkTokenSchema>;
```

### JWT Payload Schemas

```typescript
export const AccessTokenPayloadSchema = z.object({
  sub: z.string().uuid(),          // User ID
  email: z.string().email(),
  type: z.literal('access'),
  appId: z.string().optional(),
  iat: z.number().int().positive(),
  exp: z.number().int().positive(),
});

export const RefreshTokenPayloadSchema = z.object({
  sub: z.string().uuid(),          // User ID
  type: z.literal('refresh'),
  jti: z.string(),                 // Token ID (for revocation)
  appId: z.string().optional(),
  iat: z.number().int().positive(),
  exp: z.number().int().positive(),
});
```

## Durable Objects Implementation

### AuthenticationDO

Manages global authentication state and token operations.

**SQLite Schema:**
```sql
-- Magic link tokens
CREATE TABLE magic_link_tokens (
  token TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  app_id TEXT,
  redirect_uri TEXT,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  attempts INTEGER DEFAULT 0,
  used_at INTEGER
);

CREATE INDEX idx_magic_link_email ON magic_link_tokens(email);
CREATE INDEX idx_magic_link_expires ON magic_link_tokens(expires_at);

-- Token blacklist (for revoked tokens)
CREATE TABLE token_blacklist (
  jti TEXT PRIMARY KEY,
  revoked_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX idx_blacklist_expires ON token_blacklist(expires_at);
```

**Methods:**
- `generateMagicLink(email: string, appId?: string): Promise<string>`
- `verifyMagicLink(token: string): Promise<{ email: string, appId?: string, redirectUri?: string }>`
- `revokeToken(jti: string): Promise<void>`
- `isTokenRevoked(jti: string): Promise<boolean>`
- `cleanupExpired(): Promise<void>`

### UserDO

Manages user-specific data and sessions. One instance per user (keyed by user ID).

**SQLite Schema:**
```sql
-- User profile
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- User preferences
CREATE TABLE user_preferences (
  user_id TEXT PRIMARY KEY,
  theme TEXT NOT NULL DEFAULT 'system',
  email_notifications INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- User sessions
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  refresh_token_id TEXT UNIQUE NOT NULL,
  app_id TEXT,
  created_at INTEGER NOT NULL,
  last_accessed_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_sessions_refresh_token ON sessions(refresh_token_id);
```

**Methods:**
- `getUser(): Promise<User | null>`
- `createUser(email: string, displayName: string): Promise<User>`
- `updateUser(data: Partial<User>): Promise<User>`
- `updatePreferences(prefs: Partial<UserPreferences>): Promise<User>`
- `createSession(refreshTokenId: string, appId?: string): Promise<Session>`
- `getSession(refreshTokenId: string): Promise<Session | null>`
- `listSessions(): Promise<Session[]>`
- `revokeSession(sessionId: string): Promise<void>`
- `revokeAllSessions(): Promise<void>`
- `cleanupExpiredSessions(): Promise<void>`

## API Implementation

### Request Magic Link

**Endpoint:** `POST /api/auth/request-magic-link`

**Handler Implementation:**
```typescript
import { z } from 'zod';

const RequestSchema = z.object({
  email: z.string().email().toLowerCase(),
  appId: z.string().optional(),
});

export async function handleRequestMagicLink(
  request: Request,
  env: Env
): Promise<Response> {
  // Parse and validate request
  const body = await request.json();
  const { email, appId } = RequestSchema.parse(body);

  // Check rate limit
  const rateLimitKey = `magic-link:${email}`;
  const rateLimited = await checkRateLimit(env, rateLimitKey, 3, 3600);
  
  if (rateLimited) {
    return new Response(JSON.stringify({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many magic link requests. Please try again later.',
      }
    }), { status: 429 });
  }

  // Get or create user
  const userId = await getOrCreateUserId(env, email);
  const userDO = env.USER_DO.get(env.USER_DO.idFromName(userId));
  await userDO.getUser() || await userDO.createUser(email, email.split('@')[0]);

  // Generate magic link
  const authDO = env.AUTH_DO.get(env.AUTH_DO.idFromName('global'));
  const token = await authDO.generateMagicLink(email, appId);

  // Build magic link URL
  const appUrl = appId && env.APP_URLS ? JSON.parse(env.APP_URLS)[appId] : env.DEFAULT_APP_URL;
  const magicLink = `${env.AUTH_URL}/api/auth/verify?token=${token}`;

  // Send email
  await sendMagicLinkEmail(env, email, magicLink, appId);

  return new Response(JSON.stringify({
    data: {
      success: true,
      message: 'Magic link sent to your email'
    }
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

### Verify Magic Link

**Endpoint:** `GET /api/auth/verify?token=xxx`

**Handler Implementation:**
```typescript
export async function handleVerify(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return new Response('Missing token', { status: 400 });
  }

  // Check rate limit
  const rateLimitKey = `verify:${token}`;
  const rateLimited = await checkRateLimit(env, rateLimitKey, 5, 900);
  
  if (rateLimited) {
    return new Response('Too many attempts', { status: 429 });
  }

  // Verify token
  const authDO = env.AUTH_DO.get(env.AUTH_DO.idFromName('global'));
  const { email, appId, redirectUri } = await authDO.verifyMagicLink(token);

  // Get user
  const userId = await getUserIdByEmail(env, email);
  const userDO = env.USER_DO.get(env.USER_DO.idFromName(userId));
  const user = await userDO.getUser();

  // Create session
  const refreshTokenId = crypto.randomUUID();
  await userDO.createSession(refreshTokenId, appId);

  // Generate JWT tokens
  const accessToken = await generateAccessToken(env, user, appId);
  const refreshToken = await generateRefreshToken(env, user, refreshTokenId, appId);

  // Set cookies
  const cookies = [
    `access_token=${accessToken}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=3600`,
    `refresh_token=${refreshToken}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`
  ];

  // Redirect to app
  const redirect = redirectUri || getDefaultAppUrl(env, appId);

  return new Response(null, {
    status: 302,
    headers: {
      'Location': redirect,
      'Set-Cookie': cookies.join(', ')
    }
  });
}
```

### Refresh Token

**Endpoint:** `POST /api/auth/refresh`

**Handler Implementation:**
```typescript
export async function handleRefresh(
  request: Request,
  env: Env
): Promise<Response> {
  // Get refresh token from cookie
  const cookies = parseCookies(request.headers.get('Cookie') || '');
  const refreshToken = cookies.refresh_token;

  if (!refreshToken) {
    return new Response('Missing refresh token', { status: 401 });
  }

  // Verify refresh token
  const payload = await verifyJWT(env.JWT_PUBLIC_KEY, refreshToken);
  const { sub: userId, jti, appId } = RefreshTokenPayloadSchema.parse(payload);

  // Check if token is revoked
  const authDO = env.AUTH_DO.get(env.AUTH_DO.idFromName('global'));
  const isRevoked = await authDO.isTokenRevoked(jti);

  if (isRevoked) {
    return new Response('Token revoked', { status: 401 });
  }

  // Check rate limit
  const rateLimitKey = `refresh:${userId}`;
  const rateLimited = await checkRateLimit(env, rateLimitKey, 10, 3600);
  
  if (rateLimited) {
    return new Response('Too many refresh attempts', { status: 429 });
  }

  // Get user and update session
  const userDO = env.USER_DO.get(env.USER_DO.idFromName(userId));
  const user = await userDO.getUser();
  const session = await userDO.getSession(jti);

  if (!session) {
    return new Response('Invalid session', { status: 401 });
  }

  // Update session last accessed
  await userDO.updateSession(session.id, {
    lastAccessedAt: Date.now()
  });

  // Generate new access token
  const accessToken = await generateAccessToken(env, user, appId);

  return new Response(JSON.stringify({
    data: {
      access_token: accessToken,
      expires_in: 3600
    }
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

### Logout

**Endpoint:** `POST /api/auth/logout`

**Handler Implementation:**
```typescript
export async function handleLogout(
  request: Request,
  env: Env
): Promise<Response> {
  // Get tokens
  const accessToken = request.headers.get('Authorization')?.replace('Bearer ', '');
  const cookies = parseCookies(request.headers.get('Cookie') || '');
  const refreshToken = cookies.refresh_token;

  if (!accessToken || !refreshToken) {
    return new Response('Missing tokens', { status: 401 });
  }

  // Verify access token
  const payload = await verifyJWT(env.JWT_PUBLIC_KEY, accessToken);
  const { sub: userId } = AccessTokenPayloadSchema.parse(payload);

  // Verify refresh token
  const refreshPayload = await verifyJWT(env.JWT_PUBLIC_KEY, refreshToken);
  const { jti } = RefreshTokenPayloadSchema.parse(refreshPayload);

  // Revoke refresh token
  const authDO = env.AUTH_DO.get(env.AUTH_DO.idFromName('global'));
  await authDO.revokeToken(jti);

  // Revoke session
  const userDO = env.USER_DO.get(env.USER_DO.idFromName(userId));
  const session = await userDO.getSession(jti);
  
  if (session) {
    await userDO.revokeSession(session.id);
  }

  // Clear cookies
  const clearCookies = [
    'access_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0',
    'refresh_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0'
  ];

  return new Response(JSON.stringify({
    data: { success: true }
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': clearCookies.join(', ')
    }
  });
}
```

## JWT Implementation

### Token Generation

```typescript
import jwt from '@tsndr/cloudflare-worker-jwt';

export async function generateAccessToken(
  env: Env,
  user: User,
  appId?: string
): Promise<string> {
  const payload = {
    sub: user.id,
    email: user.email,
    type: 'access',
    appId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
  };

  return await jwt.sign(payload, env.JWT_PRIVATE_KEY, { algorithm: 'RS256' });
}

export async function generateRefreshToken(
  env: Env,
  user: User,
  refreshTokenId: string,
  appId?: string
): Promise<string> {
  const payload = {
    sub: user.id,
    type: 'refresh',
    jti: refreshTokenId,
    appId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 2592000, // 30 days
  };

  return await jwt.sign(payload, env.JWT_PRIVATE_KEY, { algorithm: 'RS256' });
}

export async function verifyJWT(
  publicKey: string,
  token: string
): Promise<any> {
  const isValid = await jwt.verify(token, publicKey, { algorithm: 'RS256' });
  
  if (!isValid) {
    throw new Error('Invalid token');
  }

  const decoded = jwt.decode(token);
  return decoded.payload;
}
```

### Auth Middleware

```typescript
export async function authMiddleware(
  request: Request,
  env: Env
): Promise<{ authenticated: boolean; user?: User; error?: string }> {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    return { authenticated: false, error: 'Missing authorization header' };
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const payload = await verifyJWT(env.JWT_PUBLIC_KEY, token);
    const { sub: userId, type } = AccessTokenPayloadSchema.parse(payload);

    if (type !== 'access') {
      return { authenticated: false, error: 'Invalid token type' };
    }

    // Get user
    const userDO = env.USER_DO.get(env.USER_DO.idFromName(userId));
    const user = await userDO.getUser();

    if (!user) {
      return { authenticated: false, error: 'User not found' };
    }

    return { authenticated: true, user };
  } catch (error) {
    return { authenticated: false, error: error.message };
  }
}
```

## Rate Limiting

Use Durable Objects for distributed rate limiting:

```typescript
export class RateLimiterDO {
  private state: DurableObjectState;
  private limits: Map<string, { count: number; resetAt: number }> = new Map();

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async check(key: string, limit: number, windowSeconds: number): Promise<boolean> {
    const now = Date.now();
    const limitData = this.limits.get(key);

    if (!limitData || now > limitData.resetAt) {
      this.limits.set(key, {
        count: 1,
        resetAt: now + windowSeconds * 1000
      });
      return false; // Not rate limited
    }

    if (limitData.count >= limit) {
      return true; // Rate limited
    }

    limitData.count++;
    return false;
  }
}

// Usage in handlers
async function checkRateLimit(
  env: Env,
  key: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  const rateLimiterDO = env.RATE_LIMITER_DO.get(
    env.RATE_LIMITER_DO.idFromName(key)
  );
  
  return await rateLimiterDO.check(key, limit, windowSeconds);
}
```

## Email Integration

```typescript
import { Resend } from 'resend';
import { MagicLinkEmail } from '@repo/email-templates';

export async function sendMagicLinkEmail(
  env: Env,
  to: string,
  magicLink: string,
  appId?: string
): Promise<void> {
  const resend = new Resend(env.RESEND_API_KEY);

  const appNames = {
    gtd: 'GTD Task Tracker',
    // Add more apps as needed
  };

  const appName = appId ? appNames[appId] : 'Our App';

  await resend.emails.send({
    from: 'noreply@your-domain.com',
    to,
    subject: `Sign in to ${appName}`,
    react: MagicLinkEmail({ magicLink, appName })
  });
}
```

## Testing Strategy

### Unit Tests

Test individual functions and utilities:

```typescript
import { describe, it, expect } from 'vitest';
import { generateAccessToken, verifyJWT } from './jwt';

describe('JWT', () => {
  it('should generate and verify access token', async () => {
    const user = {
      id: 'user-123',
      email: 'user@example.com',
      // ...
    };

    const token = await generateAccessToken(mockEnv, user);
    const payload = await verifyJWT(mockEnv.JWT_PUBLIC_KEY, token);

    expect(payload.sub).toBe(user.id);
    expect(payload.type).toBe('access');
  });
});
```

### Integration Tests

Test Durable Object interactions:

```typescript
import { describe, it, expect } from 'vitest';
import { env, createExecutionContext } from 'cloudflare:test';

describe('AuthenticationDO', () => {
  it('should generate and verify magic link', async () => {
    const id = env.AUTH_DO.idFromName('test');
    const authDO = env.AUTH_DO.get(id);

    const token = await authDO.generateMagicLink('test@example.com');
    expect(token).toBeTruthy();

    const result = await authDO.verifyMagicLink(token);
    expect(result.email).toBe('test@example.com');
  });

  it('should reject expired magic link', async () => {
    // Test expiration logic
  });
});
```

### E2E Tests

Test complete authentication flows:

```typescript
import { test, expect } from '@playwright/test';

test('magic link authentication flow', async ({ page }) => {
  // Request magic link
  await page.goto('/login');
  await page.fill('input[type="email"]', 'test@example.com');
  await page.click('button[type="submit"]');

  // Verify confirmation message
  await expect(page.locator('text=Check your email')).toBeVisible();

  // Simulate clicking magic link (get token from mock email)
  const token = await getMagicLinkToken('test@example.com');
  await page.goto(`/api/auth/verify?token=${token}`);

  // Should be redirected and authenticated
  await expect(page).toHaveURL('/app');
  await expect(page.locator('text=Welcome')).toBeVisible();
});
```

## Deployment

### Wrangler Configuration

```toml
name = "auth-service"
main = "src/index.ts"
compatibility_date = "2025-01-10"
compatibility_flags = ["nodejs_compat"]

account_id = "your-account-id"

[[durable_objects.bindings]]
name = "AUTH_DO"
class_name = "AuthenticationDO"
script_name = "auth-service"

[[durable_objects.bindings]]
name = "USER_DO"
class_name = "UserDO"
script_name = "auth-service"

[[durable_objects.bindings]]
name = "RATE_LIMITER_DO"
class_name = "RateLimiterDO"
script_name = "auth-service"

[[migrations]]
tag = "v1"
new_sqlite_classes = ["AuthenticationDO", "UserDO", "RateLimiterDO"]

[env.development]
name = "auth-service-dev"

[env.production]
name = "auth-service-prod"
```

### Environment Setup

```bash
# Set secrets in production
wrangler secret put RESEND_API_KEY
wrangler secret put JWT_PRIVATE_KEY
wrangler secret put JWT_PUBLIC_KEY

# Set variables
wrangler secret put ALLOWED_ORIGINS --env production
wrangler secret put APP_URLS --env production
```

## Migration from GTD App

1. Extract authentication code from GTD app
2. Move to auth service structure
3. Update GTD app to use auth client package
4. Deploy auth service
5. Update GTD app environment variables
6. Test integration
7. Deploy updated GTD app

## Future Enhancements

1. **OAuth Integration**: Add Google, GitHub OAuth
2. **2FA**: TOTP-based two-factor authentication
3. **Session Management UI**: User-facing session management
4. **Audit Logs**: Detailed authentication event logging
5. **Webhooks**: Auth event webhooks for apps
6. **SSO**: Single sign-on for enterprise
