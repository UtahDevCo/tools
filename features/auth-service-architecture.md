# Auth Service Architecture

This document describes the complete architecture of the Authentication Service used across the monorepo.

## Overview

The Auth Service is a standalone, reusable passwordless authentication service built on Cloudflare Workers and Durable Objects. It provides JWT-based authentication with magic links for all applications in the monorepo.

## Features

- **Passwordless Authentication**: Magic link authentication via email
- **JWT Tokens**: RS256-signed access and refresh tokens
- **Session Management**: Secure session handling with HttpOnly cookies
- **Rate Limiting**: Built-in protection against abuse
- **Multi-App Support**: Single auth service for multiple applications
- **Cloudflare Workers**: Global edge deployment for low latency
- **Durable Objects**: Stateful storage with SQLite for strong consistency

## Service Architecture

### Components

**1. AuthenticationDO (Durable Object)**
- Manages magic link tokens and validation
- Issues JWT access and refresh tokens
- Handles token blacklisting for logout
- Stores in SQLite for durability

**2. UserDO (Durable Object)**
- Stores user profile data and preferences (one instance per user)
- Manages active sessions per user
- Tracks user-specific authentication state

**3. RateLimiterDO (Durable Object)**
- Rate limits authentication endpoints
- Prevents abuse and brute force attacks
- Per-email or per-user rate limits

**4. Worker Endpoints**
- HTTP handlers for authentication flows
- CORS middleware for cross-origin requests
- JWT validation middleware

### Data Model

#### User

```typescript
{
  id: string;              // UUID
  email: string;           // Lowercase email
  displayName: string;     // User's display name
  createdAt: number;       // Unix timestamp
  updatedAt: number;       // Unix timestamp
  preferences: {
    theme: 'light' | 'dark' | 'system';
    emailNotifications: boolean;
  };
}
```

#### Session

```typescript
{
  id: string;              // UUID
  userId: string;          // User ID
  refreshTokenId: string;  // Refresh token JWT ID
  appId?: string;          // Application ID
  createdAt: number;       // Unix timestamp
  lastAccessedAt: number;  // Unix timestamp
  expiresAt: number;       // Unix timestamp
  ipAddress?: string;      // IP address for audit
  userAgent?: string;      // User agent for audit
}
```

#### Magic Link Token

```typescript
{
  token: string;           // Random 32+ char token
  email: string;           // User email
  appId?: string;          // Application ID
  redirectUri?: string;    // Post-auth redirect URL
  createdAt: number;       // Unix timestamp
  expiresAt: number;       // Unix timestamp (30 min)
  attempts: number;        // Failed verification attempts
  usedAt?: number;         // When token was used
}
```

## API Endpoints

### POST /api/auth/request-magic-link

Sends a magic link to the user's email.

**Request:**
```json
{
  "email": "user@example.com",
  "appId": "gtd",                                    // Optional
  "redirectUri": "https://app.example.com/callback"  // Optional
}
```

**Response (Success):**
```json
{
  "data": {
    "success": true,
    "message": "Magic link sent to your email"
  }
}
```

**Response (Rate Limited):**
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many magic link requests. Please try again later."
  }
}
```

**Rate Limit**: 3 requests per hour per email

---

### GET /api/auth/verify?token=xxx

Verifies the magic link token and creates a session.

**Query Parameters:**
- `token` (required): Magic link token
- `redirect_uri` (optional): URL to redirect after success

**Response (Success):**
- Sets `access_token` HttpOnly cookie (1 hour expiry)
- Sets `refresh_token` HttpOnly cookie (30 day expiry)
- Redirects to `redirect_uri` or default app URL

**Cookie Headers:**
```
Set-Cookie: access_token=<jwt>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=3600
Set-Cookie: refresh_token=<jwt>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000
```

**Response (Invalid Token):**
```json
{
  "error": {
    "code": "INVALID_TOKEN",
    "message": "Invalid or expired magic link"
  }
}
```

---

### POST /api/auth/refresh

Refreshes an expired access token using the refresh token.

**Headers:**
- `Cookie: refresh_token=<jwt>`

**Response (Success):**
```json
{
  "data": {
    "access_token": "<new_jwt>",
    "expires_in": 3600
  }
}
```

**Response (Invalid Token):**
```json
{
  "error": {
    "code": "INVALID_TOKEN",
    "message": "Refresh token invalid or expired"
  }
}
```

**Rate Limit**: 10 requests per hour per user

---

### POST /api/auth/logout

Invalidates the current session and clears cookies.

**Headers:**
- `Cookie: access_token=<jwt>; refresh_token=<jwt>`

**Response (Success):**
```json
{
  "data": {
    "success": true
  }
}
```

**Response (Clears Cookies):**
```
Set-Cookie: access_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0
Set-Cookie: refresh_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0
```

---

### GET /api/auth/user

Gets the current authenticated user.

**Headers:**
- `Authorization: Bearer <access_token>`
- Or `Cookie: access_token=<jwt>`

**Response (Success):**
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "displayName": "John Doe",
    "createdAt": 1697123456000,
    "updatedAt": 1697123456000,
    "preferences": {
      "theme": "dark",
      "emailNotifications": true
    }
  }
}
```

**Response (Unauthorized):**
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Missing or invalid access token"
  }
}
```

---

### PATCH /api/auth/user

Updates the current user's profile.

**Headers:**
- `Authorization: Bearer <access_token>`

**Request:**
```json
{
  "displayName": "Jane Doe",
  "preferences": {
    "theme": "light",
    "emailNotifications": false
  }
}
```

**Response:**
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "displayName": "Jane Doe",
    "createdAt": 1697123456000,
    "updatedAt": 1697123500000,
    "preferences": {
      "theme": "light",
      "emailNotifications": false
    }
  }
}
```

---

### PATCH /api/auth/user/preferences

Updates user preferences only.

**Headers:**
- `Authorization: Bearer <access_token>`

**Request:**
```json
{
  "theme": "light",
  "emailNotifications": false
}
```

**Response:**
```json
{
  "data": {
    // Full user object
  }
}
```

---

### GET /api/auth/user/sessions

Lists all active sessions for the current user.

**Headers:**
- `Authorization: Bearer <access_token>`

**Response:**
```json
{
  "data": [
    {
      "id": "session-1",
      "appId": "gtd",
      "createdAt": 1697123456000,
      "lastAccessedAt": 1697123500000,
      "expiresAt": 1697209856000,
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0..."
    }
    // ... more sessions
  ]
}
```

---

### DELETE /api/auth/user/sessions/:sessionId

Revokes a specific session.

**Headers:**
- `Authorization: Bearer <access_token>`

**Response:**
```json
{
  "data": {
    "success": true,
    "message": "Session revoked"
  }
}
```

---

## Authentication Flow

### Complete Magic Link Flow

```
1. User enters email at /login
                    ↓
2. Frontend POST /api/auth/request-magic-link
                    ↓
3. Auth service:
   - Validates email
   - Checks rate limit (3/hour)
   - Gets or creates user
   - Generates random token
   - Stores token in AuthenticationDO
   - Sends email via Resend
                    ↓
4. User receives email with magic link
   Link format: https://app.com/api/auth/verify?token=abc123
                    ↓
5. User clicks link, browser navigates to link
                    ↓
6. Frontend GET /api/auth/verify?token=abc123
                    ↓
7. Auth service:
   - Validates token format
   - Checks token hasn't expired (30 min)
   - Checks rate limit on verify (5/15 min)
   - Looks up token in AuthenticationDO
   - Marks token as used
   - Gets user from UserDO
   - Creates session
   - Generates access_token JWT (1 hour)
   - Generates refresh_token JWT (30 days)
   - Sets HttpOnly cookies
   - Redirects to app
                    ↓
8. Browser follows redirect with cookies
                    ↓
9. Frontend checks /api/auth/cookie-check
   - Returns 200 if access_token cookie exists
   - Frontend redirects to authenticated view
                    ↓
10. User is authenticated
    - HTTP requests include access_token cookie
    - Backend validates token JWT signature
```

### Token Refresh Flow

```
1. Frontend detects access_token cookie expired or missing
                    ↓
2. Frontend POST /api/auth/refresh
   - Includes refresh_token cookie
                    ↓
3. Auth service:
   - Validates refresh_token JWT signature
   - Checks token hasn't expired (30 days)
   - Checks refresh_token isn't in blacklist (revoked)
   - Checks rate limit (10/hour per user)
   - Gets user from UserDO
   - Updates session lastAccessedAt
   - Generates new access_token JWT
   - Returns new token
                    ↓
4. Frontend stores new access_token cookie
                    ↓
5. Subsequent requests use new access_token
```

### Logout Flow

```
1. User clicks logout button
                    ↓
2. Frontend POST /api/auth/logout
   - Includes access_token and refresh_token cookies
                    ↓
3. Auth service:
   - Validates tokens
   - Adds refresh_token JTI to blacklist in AuthenticationDO
   - Finds and revokes session in UserDO
   - Clears cookies (Max-Age=0)
                    ↓
4. Frontend receives response with cleared cookies
                    ↓
5. Browser removes cookies
                    ↓
6. Frontend redirects to /login
```

## Rate Limiting

The auth service implements per-endpoint rate limiting:

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/auth/request-magic-link` | 3 | 1 hour per email |
| `/api/auth/verify` | 5 | 15 minutes per token |
| `/api/auth/refresh` | 10 | 1 hour per user |
| `/api/auth/user` | 100 | 1 hour per user |

Rate limits are enforced via RateLimiterDO to provide global, distributed rate limiting.

## JWT Tokens

### Access Token

```typescript
{
  sub: "user-id",                    // Subject (user ID)
  email: "user@example.com",
  type: "access",
  appId: "gtd",                      // Optional app ID
  iat: 1697123456,                   // Issued at (Unix time)
  exp: 1697127056                    // Expires in 1 hour
}
```

**Signed with**: RS256 (private key)

**Verified by**: Consumers (all have public key)

### Refresh Token

```typescript
{
  sub: "user-id",                    // Subject (user ID)
  type: "refresh",
  jti: "token-id",                   // JWT ID (for revocation)
  appId: "gtd",                      // Optional app ID
  iat: 1697123456,                   // Issued at (Unix time)
  exp: 1699715456                    // Expires in 30 days
}
```

**Signed with**: RS256 (private key)

**Verified by**: Auth service only

**Blacklist**: Refresh tokens added to `token_blacklist` on logout

## CORS Configuration

The auth service enforces CORS via `ALLOWED_ORIGINS` environment variable:

```env
# Development
ALLOWED_ORIGINS=https://gtd-app-dev.christopher-esplin.workers.dev,http://localhost:3020

# Production
ALLOWED_ORIGINS=https://gtd-app-prod.christopher-esplin.workers.dev
```

**CORS Headers Returned:**
```
Access-Control-Allow-Origin: <request-origin> (if in ALLOWED_ORIGINS)
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

## Multi-App Support

The auth service can authenticate users for multiple applications using the `appId` parameter.

### Setup

1. **Configure APP_URLS** (auth service environment):
   ```json
   {
     "gtd": "https://gtd-app.example.com",
     "other": "https://other-app.example.com"
   }
   ```

2. **Add to ALLOWED_ORIGINS**:
   ```
   https://gtd-app.example.com,https://other-app.example.com
   ```

3. **Apps specify appId** when requesting magic link:
   ```
   POST /api/auth/request-magic-link
   {
     "email": "user@example.com",
     "appId": "gtd",
     "redirectUri": "https://gtd-app.example.com/auth/callback"
   }
   ```

### How It Works

- Each user has one identity across all apps
- Magic link tokens include `appId` and `redirectUri`
- JWT tokens include `appId` claim
- Sessions track which app they're for
- User can have multiple active sessions (one per app)

## Integration with GTD App

### GTD App to Auth Service Communication

The GTD app proxies auth requests to the auth service:

```typescript
// In GTD app worker (src/worker.ts)
if (pathname.startsWith("/api/auth/")) {
  if (env.AUTH_SERVICE) {
    // Production: Use service binding
    response = await env.AUTH_SERVICE.fetch(authRequest);
  } else {
    // Local dev: Use HTTP fallback
    response = await fetch(AUTH_URL, options);
  }
}
```

### Service Binding Configuration

**apps/gtd/wrangler.toml:**

```toml
[[env.dev.services]]
binding = "AUTH_SERVICE"
service = "auth-service-dev"

[[env.production.services]]
binding = "AUTH_SERVICE"
service = "auth-service-prod"
```

This allows the GTD app to securely communicate with the auth service without HTTP overhead.

## Related Documentation

- [Local Development Guide](./local-dev.md)
- [Deployment Guide](./deployment.md)
- [Authentication Setup](./authentication.md)
