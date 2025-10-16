# Authentication Setup

This guide explains how authentication works in the GTD app and how to configure it.

## Overview

The GTD app uses **magic link authentication** via the `apps/auth` service. Users log in by:
1. Entering their email address
2. Receiving a magic link via email
3. Clicking the link to verify and create a session
4. Receiving HttpOnly cookies for subsequent requests

## Architecture

### Components

```
┌─────────────┐
│  GTD App    │
│ (Frontend)  │
└──────┬──────┘
       │ /api/auth/* (proxy)
       ↓
┌─────────────────────────┐
│   Auth Service          │
│ (Cloudflare Worker)     │
├─────────────────────────┤
│ - Magic link generation │
│ - Token verification    │
│ - Session management    │
│ - JWT creation          │
│ - User management       │
└──────┬──────┬──────┬────┘
       │      │      │
       ↓      ↓      ↓
    Email  Durable  Durable
   Service Objects  Objects
              (Auth) (Users)
```

### Authentication Flow

```
1. User enters email at /login
                         ↓
2. Frontend POST /api/auth/request-magic-link
                         ↓
3. Auth service generates token & sends email
                         ↓
4. User clicks link in email
                         ↓
5. Browser navigates to /api/auth/verify?token=xxx
                         ↓
6. Auth service verifies token & creates session
                         ↓
7. Sets cookies:
   - access_token (HttpOnly, 1 hour)
   - refresh_token (HttpOnly, 30 days)
                         ↓
8. Redirects to /
                         ↓
9. User authenticated with cookies
```

## Configuration

### Development Environment

#### GTD App

**`apps/gtd/.env.development`:**
```env
AUTH_URL=http://localhost:8787
```

#### Auth Service

**`apps/auth/.env.development`:**

Required environment variables:

```env
# Email service API key (Resend)
RESEND_API_KEY=re_abc123xyz...

# JWT keys for signing tokens
JWT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
JWT_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----

# Firebase configuration (optional)
FIREBASE_API_KEY=...
FIREBASE_PROJECT_ID=...
```

**`apps/auth/wrangler.toml`:**

```toml
[vars]
CLIENT_URL = "http://localhost:3020"
ALLOWED_ORIGINS = "http://localhost:3020,http://localhost:5173"

[env.development]
vars = {
  CLIENT_URL = "https://gtd-app-dev.christopher-esplin.workers.dev",
  ALLOWED_ORIGINS = "https://gtd-app-dev.christopher-esplin.workers.dev,http://localhost:3020,http://localhost:5173"
}
```

### Production Environment

**`apps/auth/wrangler.toml`:**

```toml
[env.production]
name = "auth-service-prod"
vars = {
  CLIENT_URL = "https://gtd-app-prod.christopher-esplin.workers.dev",
  ALLOWED_ORIGINS = "https://gtd-app-prod.christopher-esplin.workers.dev"
}
```

**Set secrets:**

```bash
wrangler secret put RESEND_API_KEY --env production
wrangler secret put JWT_PRIVATE_KEY --env production
wrangler secret put JWT_PUBLIC_KEY --env production
```

## JWT Keys

### Generating Keys

**Option 1: Use the provided script**

```bash
cd apps/auth
bun run generate-keys
```

This generates:
- `private.pem` (private key for signing)
- `public.pem` (public key for verification)

**Option 2: Use OpenSSL**

```bash
# Generate private key
openssl genrsa -out private.pem 2048

# Extract public key
openssl rsa -in private.pem -pubout -out public.pem
```

**Option 3: Manual generation**

```bash
# Using ssh-keygen (if you prefer RSA keys)
ssh-keygen -t rsa -b 2048 -f jwt_private -N ""
```

### Setting Keys in Environment

**Local Development:**

Add to `.env.development`:

```env
JWT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
-----END PRIVATE KEY-----

JWT_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
-----END PUBLIC KEY-----
```

**Production:**

```bash
# Read keys from files
PRIVATE_KEY=$(cat private.pem)
PUBLIC_KEY=$(cat public.pem)

# Set as secrets
wrangler secret put JWT_PRIVATE_KEY --env production
# Paste the private key content and press Ctrl+D

wrangler secret put JWT_PUBLIC_KEY --env production
# Paste the public key content and press Ctrl+D
```

## Email Configuration

### Resend Setup

The auth service uses **Resend** to send magic link emails.

1. Go to https://resend.com
2. Sign up or log in
3. Create an API key from the dashboard
4. Copy the API key

**Set in environment:**

```bash
# Development
echo "RESEND_API_KEY=re_xxx..." >> apps/auth/.env.development

# Production
wrangler secret put RESEND_API_KEY --env production
# Paste: re_xxx...
```

### Email Template

The auth service sends emails with:
- **From**: `onboarding@resend.dev` (in development) or your domain
- **Subject**: `Your Magic Link`
- **Body**: React email component with magic link button

**Email Template** (`apps/auth/src/emails/magic-link.tsx`):

```tsx
<MagicLinkEmail email={userEmail} magicLink={link} />
```

## CORS Configuration

The auth service enforces CORS to prevent unauthorized access. Update `ALLOWED_ORIGINS` for each environment.

### Development

**`wrangler.toml`:**

```toml
[env.development]
vars = { ALLOWED_ORIGINS = "https://gtd-app-dev.christopher-esplin.workers.dev,http://localhost:3020" }
```

### Production

**`wrangler.toml`:**

```toml
[env.production]
vars = { ALLOWED_ORIGINS = "https://gtd-app-prod.christopher-esplin.workers.dev" }
```

If you need to add a custom domain, update `ALLOWED_ORIGINS`:

```bash
wrangler secret put ALLOWED_ORIGINS --env production
# Enter: https://yourdomain.com
```

## Cookie Configuration

The auth service sets two cookies:

### access_token

- **Purpose**: Authenticate API requests
- **Expiry**: 1 hour
- **Flags**: HttpOnly, Secure, SameSite=Lax
- **Domain**: Automatic (set by browser based on response origin)

### refresh_token

- **Purpose**: Refresh expired access tokens
- **Expiry**: 30 days
- **Flags**: HttpOnly, Secure, SameSite=Lax
- **Domain**: Automatic (set by browser based on response origin)

### Cookie Limitations

**Cross-Domain Issue:**
- In development, the GTD app runs on `localhost:3020`
- The auth service runs on `localhost:8787`
- Cookies set by one domain cannot be read by another domain

**Solution:** Use the same domain for both services:
- Locally: The GTD app proxies requests to `/api/auth/*` making them appear same-domain
- Production: Both services are behind the same domain via service binding

## Session Management

### Session Endpoints

**Create Session:**
```
GET /api/auth/verify?token=<magic_link_token>
```

**Get Current Session:**
```
GET /api/auth/user (requires access_token cookie)
```

**List Sessions:**
```
GET /api/auth/user/sessions (requires access_token cookie)
```

**Revoke Session:**
```
DELETE /api/auth/user/sessions/<sessionId> (requires access_token cookie)
```

**Logout:**
```
POST /api/auth/logout
```

### Session Storage

Sessions are stored in Durable Objects:

- **AuthenticationDO**: Stores magic link tokens and session information
- **UserDO**: Stores user profiles and preferences
- **RateLimiterDO**: Rate limits magic link requests (3 per hour per email)

## Testing

### Test the Login Flow

1. **Start services:**
   ```bash
   cd apps/auth && bun run dev
   # In another terminal:
   cd apps/gtd && bun run dev
   ```

2. **Navigate to login:**
   Open http://localhost:3020 → Should redirect to `/login`

3. **Request magic link:**
   - Enter your email address
   - Click "Send Magic Link"
   - Check your email (or Resend dashboard if using test key)

4. **Verify magic link:**
   - Click the link in the email
   - Should redirect back to the GTD app
   - Should see authenticated view

5. **Logout:**
   - Click logout button
   - Cookies should be cleared
   - Should redirect to login

### Debugging

**Check cookies in browser:**
- Open DevTools (F12)
- Application → Cookies → http://localhost:3020
- Should see `access_token` and `refresh_token`

**Check auth service logs:**
```bash
cd apps/auth
wrangler tail
```

**Check email delivery:**
- Go to https://resend.com dashboard
- Check "Logs" tab for sent emails
- Verify email content and links

## Troubleshooting

### Issue: Email not received

**Solution:**
1. Check RESEND_API_KEY is set correctly
2. Verify email address is correct
3. Check spam/junk folder
4. Check Resend dashboard for delivery status
5. Review auth service logs: `wrangler tail`

### Issue: Magic link expired

**Solution:**
- Magic links expire after **30 minutes**
- Request a new magic link if expired

### Issue: Cookies not persisting

**Solution:**
1. Verify cookies are being set in browser DevTools
2. Check `Secure` flag (requires HTTPS in production)
3. Check `SameSite` policy allows cookies
4. Verify domain/origin matches

### Issue: JWT verification fails

**Solution:**
1. Verify JWT_PRIVATE_KEY and JWT_PUBLIC_KEY match
2. Check keys weren't changed between requests
3. Verify token format (should be JWT with 3 parts: header.payload.signature)
4. Check token expiration

### Issue: CORS errors

**Solution:**
1. Verify CLIENT_URL is correct in wrangler.toml
2. Update ALLOWED_ORIGINS if adding new domain
3. Check browser DevTools Network tab for response headers
4. Verify Origin header matches ALLOWED_ORIGINS

## Deployment

### Deploy Auth Service

```bash
cd apps/auth

# Development
wrangler deploy --env=development

# Production
wrangler deploy --env=production
```

### Deploy GTD App

```bash
cd apps/gtd

# Development
bun run deploy

# Production
bun run deploy:prod
```

### Verify Deployment

```bash
# Check auth service is accessible
curl https://auth-service-dev.christopher-esplin.workers.dev/health

# Check GTD app is accessible
curl https://gtd-app-dev.christopher-esplin.workers.dev/

# Check magic link flow works end-to-end
# Navigate to app URL and test login
```

## Related Documentation

- [Local Development Guide](./local-dev.md)
- [Deployment Guide](./deployment.md)
- [Architecture Summary](../ARCHITECTURE_SUMMARY.md)
