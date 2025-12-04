# Secondary Account Token Refresh Fix

## Problem

Secondary Google account tokens were not being refreshed before making API calls, causing authentication failures when tokens expired. The error manifested as:

```
Failed to fetch events from chris.esplin@buildwithfoundation.com: Error: Request had invalid authentication credentials. Expected OAuth 2 access token
```

## Root Cause

1. Secondary account access tokens are stored in Firestore with an expiration time (`accessTokenExpiresAt`)
2. When fetching calendar events, the code passed the stored `accessToken` directly from Firestore
3. If the token had expired (typically after 1 hour), the Google Calendar API rejected the request
4. The existing token refresh mechanism (`withAutoRefresh`) only handled the primary account's cookie-based authentication

## Solution

Created a token refresh system specifically for secondary accounts:

### 1. Account Token Refresh Utilities (`lib/firebase/account-refresh.ts`)

New utility functions to manage secondary account tokens:

- **`isAccountTokenExpired(account)`**: Checks if a token is expired or about to expire (5-minute buffer)
- **`refreshAccountToken(userId, account)`**: Refreshes an account's access token using its refresh token
  - Calls `/api/auth/google/refresh` with the account's refresh token
  - Updates Firestore with new tokens
  - Marks account as `needsReauth: true` if refresh fails (token revoked)
- **`getValidAccessToken(userId, account)`**: Returns a valid token, refreshing if necessary
- **`refreshExpiredAccounts(userId, accounts)`**: Batch refresh for multiple accounts

### 2. Tasks Provider Updates (`providers/tasks-provider.tsx`)

Updated calendar event fetching to refresh tokens:

```typescript
// Before: Used stored token directly
accessToken: account.accessToken

// After: Get valid token (refresh if expired)
const validAccessToken = await getValidAccessToken(user!.uid, account);
if (!validAccessToken) {
  console.error(`Failed to get valid access token for ${account.email}`);
  continue; // Skip this account
}
accessToken: validAccessToken
```

### 3. Settings Page Updates (`app/settings/page.tsx`)

Updated calendar list fetching to refresh tokens:

```typescript
// Get valid access token (refresh if expired)
const validAccessToken = await getValidAccessToken(user.uid, account);

if (!validAccessToken) {
  toast.error(`Failed to refresh token for ${email}. Please reconnect the account.`);
  return;
}

const result = await getCalendarListForAccount(email, validAccessToken);
```

## Token Refresh Flow

1. **Check Expiration**: Before using a secondary account token, check if it's expired or about to expire (5-minute buffer)
2. **Attempt Refresh**: If expired, call the refresh endpoint with the account's refresh token
3. **Update Firestore**: On successful refresh, update the stored tokens in Firestore
4. **Handle Failure**: If refresh fails (token revoked), mark account as `needsReauth: true` and skip the account
5. **User Notification**: Show error toast in settings page if token refresh fails

## Token Storage

Secondary account tokens are stored in Firestore at:
```
users/{userId}/accounts/{email}
```

Schema:
```typescript
{
  email: string;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: number; // Unix timestamp (ms)
  needsReauth: boolean;
  // ... other fields
}
```

## API Integration

The `/api/auth/google/refresh` endpoint handles both:
- **Primary account**: Uses refresh token from cookies (no body needed)
- **Secondary accounts**: Uses refresh token from request body with `email` field

## Benefits

1. **Automatic Token Refresh**: Secondary accounts now automatically refresh tokens before API calls
2. **Better Error Handling**: Failed refreshes mark accounts for re-authentication
3. **User Transparency**: Toast notifications inform users when token refresh fails
4. **Consistent Experience**: All accounts (primary and secondary) now have robust token management

## Future Improvements

Consider:
1. Background token refresh before expiration (proactive rather than reactive)
2. Token refresh retry logic with exponential backoff
3. Batch refresh of all expired accounts on app startup
4. Analytics/monitoring for refresh success rates
