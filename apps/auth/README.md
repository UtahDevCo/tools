# Authentication Service

A standalone, reusable passwordless authentication service built on Cloudflare Workers and Durable Objects. This service provides JWT-based authentication with magic links for any application in the monorepo.

## Features

- **Passwordless Authentication**: Magic link authentication via email
- **JWT Tokens**: RS256-signed access and refresh tokens
- **Session Management**: Secure session handling with httpOnly cookies
- **Rate Limiting**: Built-in protection against abuse
- **Multi-App Support**: Single auth service for multiple applications
- **Cloudflare Workers**: Global edge deployment for low latency

## Architecture

### Components

1. **AuthenticationDO (Durable Object)**
   - Manages magic link tokens and validation
   - Issues JWT access and refresh tokens
   - Handles token blacklisting for logout

2. **UserDO (Durable Object)**
   - Stores user profile data and preferences per user
   - Manages active sessions per user
   - Tracks user-specific authentication state

3. **Worker Endpoints**
   - Authentication middleware for protected routes
   - Magic link generation and validation
   - Token refresh and logout

## Technology Stack

- **Cloudflare Workers** - Serverless edge compute
- **Durable Objects** - Stateful, strongly consistent storage with SQLite
- **Zod** - Runtime type validation
- **@tsndr/cloudflare-worker-jwt** - JWT operations
- **Resend** - Transactional email delivery
- **TypeScript** - Type safety throughout

## API Endpoints

### POST /api/auth/request-magic-link

Request a magic link for authentication.

**Request:**
```json
{
  "email": "user@example.com",
  "appId": "gtd" // Optional: identifies the requesting app
}
```

**Response:**
```json
{
  "success": true,
  "message": "Magic link sent to your email"
}
```

### GET /api/auth/verify

Verify a magic link token and issue JWT tokens.

**Query Parameters:**
- `token`: Magic link token
- `redirect_uri`: Optional redirect after successful auth

**Response:**
- Sets `access_token` httpOnly cookie (1 hour)
- Sets `refresh_token` httpOnly cookie (30 days)
- Redirects to `redirect_uri` or default app URL

### POST /api/auth/refresh

Refresh an expired access token.

**Headers:**
- `Cookie: refresh_token=xxx`

**Response:**
```json
{
  "access_token": "new-jwt-token",
  "expires_in": 3600
}
```

### POST /api/auth/logout

Invalidate current session.

**Headers:**
- `Authorization: Bearer <access_token>`
- `Cookie: refresh_token=xxx`

**Response:**
```json
{
  "success": true
}
```

### GET /api/auth/me

Get current authenticated user.

**Headers:**
- `Authorization: Bearer <access_token>`

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "displayName": "John Doe",
  "preferences": {
    "theme": "dark",
    "emailNotifications": true
  }
}
```

### PATCH /api/auth/me

Update current user profile.

**Headers:**
- `Authorization: Bearer <access_token>`

**Request:**
```json
{
  "displayName": "Jane Doe",
  "preferences": {
    "theme": "light"
  }
}
```

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "displayName": "Jane Doe",
  "preferences": {
    "theme": "light",
    "emailNotifications": true
  }
}
```

## Integration Guide

### Frontend Integration

Install the auth client:

```bash
bun add @repo/auth-client
```

Use in your app:

```typescript
import { AuthClient, useAuth } from '@repo/auth-client';

// Initialize client
const authClient = new AuthClient({
  apiUrl: 'https://auth.your-domain.com/api',
  appId: 'gtd'
});

// In React component
function LoginPage() {
  const { login, isLoading } = useAuth();

  const handleLogin = async (email: string) => {
    await login(email);
    // Magic link sent - show confirmation message
  };

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      handleLogin(email);
    }}>
      <input type="email" value={email} onChange={...} />
      <button type="submit">Send Magic Link</button>
    </form>
  );
}

// Protected route
function ProtectedPage() {
  const { user, isAuthenticated, logout } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return (
    <div>
      <p>Welcome, {user.displayName}</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### Backend Integration

Use the auth middleware in your Workers:

```typescript
import { authMiddleware, verifyToken } from '@repo/auth-utils';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Apply auth middleware
    const authResult = await authMiddleware(request, env);

    if (!authResult.authenticated) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Access user info
    const userId = authResult.user.id;
    const email = authResult.user.email;

    // Your app logic here
    return handleRequest(request, userId, env);
  }
};
```

### Environment Variables

**Auth Service (.dev.vars):**
```env
ENVIRONMENT=development
RESEND_API_KEY=re_xxxxxxxxxxxxx
JWT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----...
JWT_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----...
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
APP_URLS={"gtd":"http://localhost:3000","other":"http://localhost:5174"}
```

**Consuming Apps:**
```env
AUTH_API_URL=http://localhost:8787/api
AUTH_JWT_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----...
APP_ID=gtd
```

## Development

### Setup

```bash
# Install dependencies
bun install

# Set up environment variables
cp .dev.vars.example .dev.vars

# Login to Cloudflare
wrangler login

# Create Durable Object namespaces
wrangler durable-objects namespace create AUTH_DO
wrangler durable-objects namespace create USER_DO
```

### Development Commands

```bash
# Start local development server
bun run dev

# Run tests
bun run test

# Type checking
bun run type-check

# Deploy to development
bun run deploy:dev

# Deploy to production
bun run deploy:prod
```

### Testing

```bash
# Unit tests
bun test

# Integration tests
bun test:integration

# E2E tests
bun test:e2e
```

## Security

### JWT Key Generation

Generate RS256 key pair for JWT signing:

```bash
# Generate private key
openssl genrsa -out private.pem 2048

# Extract public key
openssl rsa -in private.pem -pubout -out public.pem

# Convert to single-line format for env vars
awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' private.pem
awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' public.pem
```

### Key Rotation

1. Generate new key pair
2. Update `JWT_PRIVATE_KEY` and `JWT_PUBLIC_KEY` in production
3. Keep old public key for 1 hour to validate existing tokens
4. Distribute new public key to all consuming apps
5. Remove old key after grace period

### Rate Limiting

| Endpoint | Limit |
|----------|-------|
| `/auth/request-magic-link` | 3 requests/hour per email |
| `/auth/verify` | 5 requests/15 minutes per token |
| `/auth/refresh` | 10 requests/hour per user |
| `/auth/me` | 100 requests/hour per user |

## Monitoring

### Metrics

- Magic link requests (per hour)
- Magic link verification success/failure rates
- Token refresh rates
- Active sessions count
- Error rates by endpoint

### Alerts

- Error rate > 5% for 5 minutes
- Magic link delivery failures > 10%
- Token verification failures > 20%
- Durable Object errors

### Logs

All authentication events are logged with:
- Timestamp
- User email (hashed)
- Action (request_magic_link, verify, refresh, logout)
- Result (success/failure)
- IP address (for security)
- User agent

## Deployment

### CI/CD

Automatic deployment via GitHub Actions:

- **develop branch** → Development environment
- **main branch** → Production environment

### Environments

**Development:**
- URL: `https://auth-dev.your-domain.com`
- Durable Objects: `gtd-auth-dev-*`

**Production:**
- URL: `https://auth.your-domain.com`
- Durable Objects: `gtd-auth-prod-*`

### Rollback

```bash
# List deployments
wrangler deployments list

# Rollback to previous version
wrangler rollback

# Or specific version
wrangler rollback --message "v1.2.3"
```

## Multi-App Support

The auth service supports multiple applications:

1. **App Registration**: Each app has a unique `appId`
2. **Custom Redirects**: Apps specify their own `redirect_uri`
3. **App-Specific Claims**: JWT tokens include `appId` in claims
4. **Shared Sessions**: Users authenticated once across all apps

### Adding a New App

1. Register app in `APP_URLS` environment variable:
   ```env
   APP_URLS={"gtd":"https://gtd.app","other":"https://other.app"}
   ```

2. Configure CORS for app domain:
   ```env
   ALLOWED_ORIGINS=https://gtd.app,https://other.app
   ```

3. Distribute JWT public key to app
4. Integrate auth client in app frontend

## Email Templates

Magic link emails use React Email templates:

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

export function MagicLinkEmail({ magicLink, appName }) {
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
```

## Troubleshooting

### Common Issues

**Magic link not received:**
- Check Resend dashboard for delivery status
- Verify email address format
- Check spam folder
- Verify rate limits not exceeded

**Token verification fails:**
- Ensure token hasn't expired (15 min for magic links)
- Check JWT signature with public key
- Verify token wasn't already used

**Session expires unexpectedly:**
- Check access token expiration (1 hour)
- Implement automatic token refresh
- Verify refresh token is present and valid

### Debug Mode

Enable debug logging:

```env
DEBUG=true
LOG_LEVEL=debug
```

View logs:

```bash
wrangler tail --format pretty
```

## License

TBD
