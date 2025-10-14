# Authentication Setup

## Overview

The GTD app uses magic link authentication via the `apps/auth` service. However, there's a cross-domain cookie issue that needs to be addressed.

## The Problem

The auth service sets HttpOnly cookies with the `Secure` and `SameSite=Lax` flags:
- `access_token` cookie (1 hour expiry)
- `refresh_token` cookie (30 days expiry)

These cookies are set when the user clicks the magic link and the auth service verifies the token.

**Cross-Domain Issue**:
- In development, the GTD app runs on `localhost:3020`
- The auth service runs on `localhost:8787` (or a deployed URL)
- Cookies set by the auth service on its domain cannot be read by the GTD app on a different domain/port

## Solutions

### Option 1: Proxy the Auth Service (Recommended for Development)

Set up the GTD app dev server to proxy requests to `/api/auth/*` to the auth service. This makes it appear as if both services are on the same domain.

### Option 2: Use the Same Domain

Deploy both services under the same domain with different paths:
- GTD app: `https://example.com/`
- Auth service: `https://example.com/api/auth/`

### Option 3: Token-Based Auth (Alternative)

Instead of HttpOnly cookies, the auth service could return JWT tokens in the response body, and the frontend would store them in memory or localStorage. However, this is less secure than HttpOnly cookies.

## Current Implementation

The current implementation expects cookies to work across domains, which won't work in development. You'll need to:

1. Either set up a proxy in the dev server
2. Or run both services in production on the same domain
3. Or modify the auth service to return tokens in the response body

## Testing

For now, you can test the login flow by:
1. Starting the auth service: `cd apps/auth && bun run dev`
2. Starting the GTD app: `cd apps/gtd && bun run dev`
3. Navigate to `http://localhost:3020/`
4. You should be redirected to `/login`
5. Enter your email and submit
6. Check your email for the magic link
7. Click the magic link (note: cookies may not work due to cross-domain issues)

## Production Setup

For production, ensure both services are deployed under the same domain or set up proper cookie domain configuration.
