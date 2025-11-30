# GTD App - Getting Things Done with Google Tasks

A Progressive Web App (PWA) for managing tasks using the Getting Things Done (GTD) methodology with Google Tasks as the backend.

## Quick Start

```bash
# Install dependencies
bun install

# Start development server
bun dev

# Build for production
bun build

# Run linting
bun run lint
```

## Architecture Overview

This is a Next.js 16 app using React 19, with Firebase Authentication and Google Tasks API for data persistence.

### Key Technologies

- **Next.js 16**: App Router with React Server Actions
- **Firebase Auth**: Google OAuth with offline-first token management
- **Google Tasks API**: Task storage and synchronization
- **LocalForage**: IndexedDB-based offline caching
- **PWA**: Installable with service worker caching
- **Tailwind CSS**: Utility-first styling
- **Zod**: Runtime validation for API responses

### Project Structure

```
apps/gtd/
├── app/                      # Next.js App Router
│   ├── actions/             # Server Actions (session, tasks)
│   ├── components/          # Page-level components
│   ├── layout.tsx           # Root layout with metadata
│   └── page.tsx             # Home page (WeeklyCalendar)
├── components/              # Shared components
│   ├── auth-provider.tsx    # Auth context & token management
│   └── user-avatar.tsx      # User profile display
├── lib/                     # Core utilities
│   ├── firebase/            # Firebase config & auth
│   ├── google-tasks/        # Google Tasks API client
│   ├── tasks-with-refresh.ts # Auto-refresh wrapper
│   └── token-refresh.ts     # Token coordination
├── providers/               # React Context providers
│   ├── offline-provider.tsx # Network status detection
│   └── tasks-provider.tsx   # Tasks state management
└── public/                  # Static assets & PWA manifest
```

## Authentication Flow

1. User clicks sign-in → Firebase Google OAuth popup
2. Access token & user info stored in HTTP-only cookies (server-side)
3. User data also stored in client-readable cookie (for UI)
4. Token auto-refresh coordinated via `token-refresh.ts`
5. Server Actions use tokens from cookies to call Google Tasks API

## Data Flow

### Initial Load
1. `AuthProvider` checks session cookies, sets user state
2. `TasksProvider` fetches tasks from Google Tasks API
3. Tasks cached in IndexedDB via `useLocalforage`
4. UI renders from cached data immediately, then updates when fresh data arrives

### Task Operations
1. User action (complete, delete, edit) → optimistic UI update
2. Server Action called with auto-refresh wrapper
3. If token expired (needsReauth), auto-refresh triggers
4. Operation retried after successful refresh
5. On failure, UI reverts to previous state
6. On success, cache updated

### Offline Support
1. `OfflineProvider` monitors `navigator.onLine`
2. When offline, tasks load from IndexedDB cache
3. All mutations disabled (buttons show as demo mode)
4. Offline banner displayed to user
5. When online, data auto-refreshes

## Key Components

### `weekly-calendar.tsx` (2000+ lines)
The main UI component. Displays tasks in a 4-column week view with GTD lists below.

**Why it's large**: Handles calendar logic, multi-select mode, move/delete operations, keyboard shortcuts, responsive layout, and extensive user interactions. Consider this file carefully maintained rather than needing refactoring.

### `tasks-provider.tsx`
Central state management for all tasks. Provides:
- Task lists grouped by GTD categories (Active, Next, Waiting, Someday)
- Optimistic updates for complete/delete/edit
- Offline/online mode handling
- IndexedDB caching
- Demo data for signed-out users

### `auth-provider.tsx`
Manages authentication lifecycle:
- Firebase auth state listener
- Session cookie management
- Auto-refresh token coordination
- Sign-in/sign-out flows

## Important Patterns

### Server Actions
All server actions are in `app/actions/`. They:
- Use `"use server"` directive
- Return `TasksResult<T>` type (success/failure with needsReauth flag)
- Are wrapped by `tasks-with-refresh.ts` for auto-retry on token expiry

### Token Refresh Coordination
`lib/token-refresh.ts` ensures only ONE token refresh happens at a time across the entire app, even with concurrent API calls.

### Optimistic Updates
Task operations update UI immediately, then sync with server:
- Complete/uncomplete: immediate toggle, rollback on error
- Delete: soft-delete with 5s undo window, then permanent
- Edit: immediate update, rollback on error

### GTD Lists
Four special task lists prefixed with `[GTD]`:
- `[GTD] Active`: Tasks with due dates (shown in calendar)
- `[GTD] Next`: Next actions (no due date)
- `[GTD] Waiting`: Delegated/blocked tasks
- `[GTD] Someday`: Future possibilities

Other Google Tasks lists shown in "Other Lists" section.

## Environment Setup

Copy `.env.example` to `.env.local` and fill in Firebase credentials from Firebase Console.

Required variables:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

## Common Issues & Solutions

### "Session expired" errors
Token refresh failed. Check:
1. Firebase config is correct
2. Google Tasks API is enabled in Google Cloud Console
3. OAuth consent screen is configured
4. User has granted Google Tasks permission

### Tasks not syncing
Check network tab for API errors. Common causes:
1. Access token expired (should auto-refresh)
2. Google Tasks API rate limit (rare with normal usage)
3. Network connectivity issues (check offline banner)

### Demo data showing instead of real tasks
User is not authenticated. Click user avatar to sign in.

### PWA not installing
1. Must be served over HTTPS (or localhost)
2. Manifest and icons must be accessible
3. Service worker must register successfully
4. Check browser console for PWA install criteria

## Testing

No formal test suite. For manual testing:
1. Sign in with Google account
2. Create/edit/complete/delete tasks
3. Test offline mode (DevTools → Network → Offline)
4. Test multi-select (click Move on any task)
5. Test keyboard shortcuts (P/N for prev/next, T for today)

## Deployment

This app is designed for Cloudflare Workers but can deploy anywhere Next.js runs.

Build command: `bun build`
Output: `.next` folder (standalone mode enabled)

## Maintenance Notes

### When Google Tasks API changes
Update Zod schemas in `lib/google-tasks/types.ts` to match new API shape.

### When adding new task operations
1. Add server action in `app/actions/tasks.ts`
2. Wrap in `tasks-with-refresh.ts`
3. Add optimistic update handler in `tasks-provider.tsx`
4. Update UI in `weekly-calendar.tsx`

### When modifying GTD structure
Edit `lib/google-tasks/gtd-utils.ts` constants. List names are hardcoded.

## Performance Considerations

- Tasks cached in IndexedDB for instant loads
- Optimistic updates for perceived performance
- Service worker caches API responses (7 days)
- Large calendar component is client-side only
- Server Actions minimize server round-trips

## Security Notes

- Access tokens stored in HTTP-only cookies (not accessible to JavaScript)
- User data in separate cookie (readable for UI)
- All API calls server-side via Server Actions
- CORS handled by Next.js API routes
- No sensitive data in localStorage

## Future Enhancements

See `features/features-list.md` for planned features:
- Google Calendar integration
- Improved mobile experience
- Additional GTD workflows
