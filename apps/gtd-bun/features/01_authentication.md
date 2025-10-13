# Authentication System

## Overview

This GTD application will implement a custom JWT-based authentication system using Cloudflare Durable Objects and Resend for email delivery. The authentication flow will be passwordless, using magic links sent via email.

## Architecture

### Components

1. **AuthenticationDO (Durable Object)**
   - Manages user sessions and authentication state
   - Generates and validates magic link tokens
   - Issues JWT tokens upon successful authentication
   - Handles session persistence using SQLite storage backend

2. **UserDO (Durable Object)**
   - One instance per user (keyed by email)
   - Stores user profile data and preferences
   - Manages user-specific authentication state
   - Tracks active sessions

3. **Worker Endpoints**
   - Authentication middleware for protected routes
   - Magic link generation and validation endpoints
   - Token refresh endpoints

## Authentication Flow

### Magic Link Flow

```
1. User enters email → POST /auth/request-magic-link
2. Worker validates email format (using Zod)
3. Worker calls AuthenticationDO to generate magic token
4. AuthenticationDO stores token with expiration (15 minutes)
5. Worker sends email via Resend with magic link
6. User clicks link → GET /auth/verify?token=xxx
7. Worker validates token with AuthenticationDO
8. AuthenticationDO issues JWT (access + refresh tokens)
9. Client stores tokens in httpOnly cookies
10. User is redirected to app
```

### Token Structure

**Access Token (JWT)**
```json
{
  "sub": "user@example.com",
  "iat": 1234567890,
  "exp": 1234571490,  // 1 hour
  "type": "access"
}
```

**Refresh Token (JWT)**
```json
{
  "sub": "user@example.com",
  "iat": 1234567890,
  "exp": 1237159890,  // 30 days
  "type": "refresh",
  "jti": "unique-token-id"
}
```

## Security Considerations

### Token Management
- Access tokens: 1 hour expiration
- Refresh tokens: 30 days expiration
- Magic link tokens: 15 minutes expiration
- All tokens signed using RS256 algorithm
- Token rotation on refresh

### Storage
- Use SQLite backend for Durable Objects (with point-in-time recovery)
- Store active refresh tokens with ability to revoke
- Implement token blacklisting for logout

### Rate Limiting
- Limit magic link requests per email (3 per hour)
- Limit verification attempts per token (5 attempts)
- Use Durable Objects to track and enforce limits

## Implementation Details

### Durable Object Naming
- AuthenticationDO: Single global instance for token operations
- UserDO: Keyed by email hash for user-specific data

### JWT Library
Use `@tsndr/cloudflare-worker-jwt` for JWT operations in Workers

### Email Template
Create React Email template for magic link emails:
- Clean, minimal design matching Tweek.so aesthetic
- Clear call-to-action button
- Security notice about link expiration
- Link that doesn't expire message footer

## API Endpoints

### POST /auth/request-magic-link
**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Magic link sent to your email"
}
```

### GET /auth/verify
**Query Params:**
- `token`: Magic link token

**Response:**
- Sets httpOnly cookies with JWT tokens
- Redirects to `/app`

### POST /auth/refresh
**Headers:**
- `Cookie: refresh_token=xxx`

**Response:**
```json
{
  "access_token": "new-access-token"
}
```

### POST /auth/logout
**Headers:**
- `Authorization: Bearer <access_token>`
- `Cookie: refresh_token=xxx`

**Response:**
```json
{
  "success": true
}
```

## Validation

All authentication endpoints use Zod schemas for validation:

```typescript
const EmailSchema = z.object({
  email: z.string().email().toLowerCase()
});

const TokenSchema = z.object({
  token: z.string().min(32)
});
```

## Session Management

### Session Data Structure
```typescript
interface Session {
  userId: string;
  email: string;
  createdAt: number;
  lastAccessedAt: number;
  refreshTokenId: string;
}
```

### Session Storage
- Sessions stored in UserDO SQLite database
- Automatic cleanup of expired sessions
- Support for multiple concurrent sessions per user

## Error Handling

### Error Types
- `INVALID_EMAIL`: Malformed email address
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INVALID_TOKEN`: Token not found or expired
- `UNAUTHORIZED`: Invalid or missing JWT
- `TOKEN_EXPIRED`: JWT has expired

### Error Response Format
```json
{
  "error": {
    "code": "INVALID_TOKEN",
    "message": "The magic link has expired or is invalid"
  }
}
```

## Testing Considerations

### Unit Tests
- Token generation and validation
- Magic link expiration
- Rate limiting logic
- JWT signing and verification

### Integration Tests
- Complete magic link flow
- Token refresh flow
- Logout and token revocation
- Concurrent session handling

## Future Enhancements

1. **OAuth Integration**: Add Google/GitHub OAuth as alternative auth methods
2. **2FA**: Optional TOTP-based two-factor authentication
3. **Session Device Management**: Allow users to view and revoke sessions
4. **Account Recovery**: Implement account recovery flow for edge cases
5. **Email Verification**: Track verified vs unverified email addresses
