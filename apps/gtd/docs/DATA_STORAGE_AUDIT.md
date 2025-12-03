# GTD App - Data Storage Audit

This document provides a complete inventory of what data your app stores and where.

## Data Storage Locations

### 1. Firebase Firestore (Server-Side)

**Collection: `users/{userId}`**
- User ID (Firebase Auth UID)
- Created from Firebase Authentication

**Subcollection: `users/{userId}/accounts`**

Documents stored per connected Google account (max 3):

```typescript
{
  email: string,              // Google account email
  displayName: string | null, // Google account display name
  photoURL: string | null,    // Google profile photo URL
  
  // OAuth credentials
  accessToken: string,        // Google OAuth access token (expires in 1 hour)
  refreshToken: string,       // Google OAuth refresh token (long-lived)
  accessTokenExpiresAt: number, // Unix timestamp (ms)
  
  // Permissions
  scopes: string[],           // OAuth scopes granted
                              // ["tasks", "calendar.readonly", "userinfo.email", "userinfo.profile"]
  
  // Metadata
  colorIndex: number,         // 0-2, for UI color assignment
  connectedAt: number,        // Unix timestamp when account was connected
  lastRefreshedAt: number,    // Unix timestamp of last token refresh
  needsReauth: boolean,       // Flag if token refresh failed
}
```

**Storage Period**: Indefinite until user requests deletion or disconnects account

**Subcollection: `users/{userId}/settings/preferences`**

```typescript
{
  // Calendar settings
  showCalendarEvents: boolean,
  calendarRefreshIntervalMinutes: number,
  selectedCalendarIds: string[],  // Legacy for primary account
  accountCalendarSelections: Array<{
    accountEmail: string,
    calendarIds: string[]
  }>,
  
  // Task settings
  defaultGtdList: "active" | "next" | "waiting" | "someday",
  showCompletedDuration: number,  // days
  
  // Display settings
  weekdayRows: number,
  weekendRows: number,
  sectionMinRows: number,
  listMinRows: number,
  mergeWeekendColumns: boolean,
  compactMode: boolean,
  
  // Behavior settings
  skipMoveConfirmations: boolean,
  undoWindowMs: number,
  enableMultiSelectShortcuts: boolean,
  
  // Offline settings
  cacheSizeLimitMb: number,
  
  // Metadata
  updatedAt: number,  // Unix timestamp
}
```

**Storage Period**: Indefinite until user requests deletion

**Security Rules**: 
- Users can only read/write their own data
- Enforced by Firestore security rules (see `firestore.rules`)

### 2. Browser IndexedDB (Client-Side)

**Database: `gtd-settings`**
**Store: `settings`**

Mirror of Firestore settings for offline access and immediate UI updates.

**Storage Period**: Until browser cache is cleared or user logs out

**Database: Firebase Auth (`firebaseLocalStorageDb`)**
**Store: `firebaseLocalStorage`**

Firebase Authentication stores:
- Firebase Auth token
- Refresh token
- User profile (email, name, photo)
- Auth state

**Storage Period**: Until user logs out or clears browser data

**Database: Task/Calendar Cache (via localforage)**

Cached copies of:
- Google Tasks (all lists and tasks)
- Google Calendar events

**Storage Period**: 
- Cleared on logout
- Subject to browser storage limits
- Refreshed periodically (every 5 minutes for calendar)

### 3. HTTP-Only Cookies (Client-Side, Server-Readable)

**Cookie: `session` (HTTP-only, Secure)**
```typescript
{
  accessToken: string,
  expiresAt: number,
}
```

**Purpose**: Server Actions use this to authenticate API calls to Google
**Storage Period**: Session-based, expires after 1 hour
**Security**: HTTP-only flag prevents JavaScript access

**Cookie: `user-data` (Readable by client)**
```typescript
{
  email: string,
  displayName: string | null,
  photoURL: string | null,
}
```

**Purpose**: UI display (user avatar, email)
**Storage Period**: Session-based
**Security**: Contains only non-sensitive public profile data

## Data NOT Stored by Your App

### Google Tasks Data
- ❌ Not stored on your servers
- ✅ Only cached temporarily in browser
- ✅ Always fetched from Google Tasks API
- ✅ Remains in user's Google account

### Google Calendar Data
- ❌ Not stored on your servers
- ✅ Only cached temporarily in browser (read-only)
- ✅ Always fetched from Google Calendar API
- ✅ Remains in user's Google account

### Passwords
- ❌ Never stored or seen by your app
- ✅ Authentication handled entirely by Firebase/Google
- ✅ OAuth flow never exposes passwords

## Data Flow Diagram

```
User Browser
    │
    ├─→ Firebase Auth
    │       ├─→ Google OAuth
    │       │       └─→ Returns: tokens, email, name, photo
    │       └─→ Stores in: IndexedDB (client), Firestore (server)
    │
    ├─→ Google Tasks API
    │       ├─→ Using: OAuth access token
    │       ├─→ Fetches: task lists and tasks
    │       └─→ Cached in: IndexedDB (client only)
    │
    ├─→ Google Calendar API
    │       ├─→ Using: OAuth access token (read-only)
    │       ├─→ Fetches: calendar events
    │       └─→ Cached in: IndexedDB (client only)
    │
    └─→ Your Server (Next.js/Cloudflare)
            ├─→ Stores: OAuth tokens, user settings (Firestore)
            ├─→ Proxies: API calls via Server Actions
            └─→ Uses: HTTP-only cookies for auth
```

## Third-Party Data Processors

### Google LLC (Firebase)
**Data Shared**: 
- Email, name, profile photo
- OAuth tokens
- User settings
**Purpose**: Authentication, user data storage
**Privacy Policy**: https://firebase.google.com/support/privacy

### Google LLC (APIs)
**Data Shared**: 
- OAuth access tokens
- API requests (task CRUD, calendar reads)
**Purpose**: Access user's Google Tasks and Calendar
**Privacy Policy**: https://policies.google.com/privacy

### Cloudflare, Inc.
**Data Shared**: 
- IP addresses
- Request logs
**Purpose**: Hosting, CDN, DDoS protection
**Privacy Policy**: https://www.cloudflare.com/privacypolicy/

## Data Deletion Process

### User-Initiated Deletion

**Method**: Email request to chris@chrisesplin.com

**What Gets Deleted**:
1. Firestore: All documents in `users/{userId}` collection
2. Firebase Auth: User account deleted
3. Browser: User instructed to clear browser data

**Timeline**: Within 30 days of request

**What Remains**:
- Google Tasks data (in user's Google account)
- Google Calendar data (in user's Google account)
- Server logs (Cloudflare, may retain for security/legal)

### Automatic Cleanup

**OAuth Tokens**:
- Access tokens expire after 1 hour (automatic)
- Refresh tokens revoked when user disconnects account

**Browser Cache**:
- Cleared when user logs out
- Cleared when user clears browser data
- Subject to browser storage limits

## Compliance Summary

### Google API Services User Data Policy

✅ **Limited Use**: Data used only for app functionality
✅ **No Sharing**: No third-party sharing (except service providers)
✅ **No Ads**: Not used for advertising
✅ **No AI Training**: Not used for ML/AI models
✅ **Minimum Scopes**: Only requests necessary scopes
✅ **Secure Storage**: OAuth tokens encrypted by Firebase
✅ **User Control**: Clear deletion process

### Additional Compliance

✅ **HTTPS**: All communications encrypted
✅ **HTTP-Only Cookies**: Prevents XSS attacks
✅ **Firestore Rules**: Users can only access their own data
✅ **Token Refresh**: Automatic token rotation every hour
✅ **Offline Access**: No server storage of task/calendar data

## Privacy Policy Accuracy Check

Based on this audit, the privacy policy at https://gtd.chrisesplin.com/policies should state:

**Data We Store** (verify this is in privacy policy):
- ✅ User profile (email, name, photo)
- ✅ OAuth access and refresh tokens
- ✅ User preferences/settings
- ✅ Connected account information

**Data We Don't Store** (verify this is in privacy policy):
- ✅ Google Tasks (only cached in browser)
- ✅ Google Calendar events (only cached in browser)
- ✅ Passwords (never seen or stored)

**Third Parties** (verify this is in privacy policy):
- ✅ Firebase/Google (auth, storage)
- ✅ Cloudflare (hosting)
- ✅ No advertisers
- ✅ No analytics (confirm this!)

## Questions for Verification

Before finalizing the privacy policy response to Google, confirm:

1. **Analytics**: Do you use Firebase Analytics, Google Analytics, or any other analytics?
   - If YES → Must disclose in privacy policy
   - If NO → Current privacy policy is correct

2. **Error Tracking**: Do you use Sentry, LogRocket, or similar?
   - If YES → Must disclose in privacy policy
   - If NO → Current privacy policy is correct

3. **Server Logs**: Does Cloudflare or your hosting retain request logs?
   - Current privacy policy mentions this briefly
   - Cloudflare typically retains for 30 days

4. **Data Retention**: Confirm OAuth tokens are kept indefinitely until deletion
   - Current privacy policy states this
   - Is this accurate?

5. **Backup/Recovery**: Do you have database backups?
   - If YES → How long are backups retained?
   - May need to mention in privacy policy

## Audit Date

**Date**: December 3, 2025
**Auditor**: AI Assistant (Claude)
**Method**: Code review of repository

**Files Reviewed**:
- `apps/gtd/lib/firebase/accounts.ts`
- `apps/gtd/lib/firebase/settings.ts`
- `apps/gtd/lib/settings-local.ts`
- `apps/gtd/lib/oauth-utils.ts`
- `apps/gtd/app/actions/*.ts`

**Recommendation**: Verify accuracy with Chris Esplin before responding to Google.
