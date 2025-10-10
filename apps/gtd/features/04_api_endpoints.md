# API Endpoints

## Overview

The GTD application exposes a RESTful API through Cloudflare Workers, with all data operations routed to appropriate Durable Objects. All endpoints use JSON for request/response payloads and are validated using Zod schemas.

## Base URL

```
Production: https://gtd.your-domain.com/api
Development: http://localhost:8787/api
```

## Authentication

All endpoints except authentication routes require a valid JWT token in the Authorization header:

```
Authorization: Bearer <access_token>
```

## Common Response Formats

### Success Response
```json
{
  "data": { /* response payload */ },
  "meta": {
    "timestamp": 1234567890
  }
}
```

### Error Response
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { /* optional additional context */ }
  }
}
```

### Pagination Response
```json
{
  "data": [ /* array of items */ ],
  "meta": {
    "page": 1,
    "pageSize": 50,
    "total": 123,
    "hasMore": true
  }
}
```

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 204 | No Content (successful deletion) |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (invalid/missing token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 409 | Conflict (duplicate resource) |
| 429 | Too Many Requests (rate limited) |
| 500 | Internal Server Error |

## Authentication Endpoints

### POST /api/auth/request-magic-link

Request a magic link for passwordless authentication.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Validation:**
```typescript
const schema = z.object({
  email: z.string().email().toLowerCase()
});
```

**Response (200):**
```json
{
  "data": {
    "success": true,
    "message": "Magic link sent to your email"
  }
}
```

**Rate Limit:** 3 requests per hour per email

### GET /api/auth/verify

Verify a magic link token and issue JWT tokens.

**Query Parameters:**
- `token` (required): Magic link token

**Response (200):**
- Sets `access_token` httpOnly cookie (1 hour expiration)
- Sets `refresh_token` httpOnly cookie (30 days expiration)
- Redirects to `/app`

**Errors:**
- `400`: Invalid or expired token
- `429`: Too many verification attempts

### POST /api/auth/refresh

Refresh an expired access token using a refresh token.

**Headers:**
- `Cookie: refresh_token=xxx`

**Response (200):**
```json
{
  "data": {
    "access_token": "new-jwt-token",
    "expires_in": 3600
  }
}
```

**Errors:**
- `401`: Invalid or expired refresh token

### POST /api/auth/logout

Invalidate current session and tokens.

**Headers:**
- `Authorization: Bearer <access_token>`
- `Cookie: refresh_token=xxx`

**Response (200):**
```json
{
  "data": {
    "success": true
  }
}
```

## User Endpoints

### GET /api/users/me

Get current user profile.

**Response (200):**
```json
{
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "displayName": "John Doe",
    "preferences": {
      "theme": "dark",
      "defaultView": "desktop",
      "emailNotifications": true
    },
    "createdAt": 1234567890,
    "updatedAt": 1234567890
  }
}
```

### PATCH /api/users/me

Update current user profile.

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

**Validation:**
```typescript
const schema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  preferences: z.object({
    theme: z.enum(['light', 'dark', 'system']).optional(),
    defaultView: z.enum(['desktop', 'mobile']).optional(),
    emailNotifications: z.boolean().optional()
  }).optional()
});
```

**Response (200):**
```json
{
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "displayName": "Jane Doe",
    "preferences": {
      "theme": "light",
      "defaultView": "desktop",
      "emailNotifications": false
    },
    "updatedAt": 1234567891
  }
}
```

## Queue Endpoints

### GET /api/queues

List all queues for the current user.

**Query Parameters:**
- `includeArchived` (optional, default: false): Include archived queues

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "title": "Work",
      "position": 0,
      "createdAt": 1234567890,
      "updatedAt": 1234567890,
      "archivedAt": null
    },
    {
      "id": "uuid",
      "userId": "uuid",
      "title": "Personal",
      "position": 1,
      "createdAt": 1234567890,
      "updatedAt": 1234567890,
      "archivedAt": null
    }
  ]
}
```

### POST /api/queues

Create a new queue.

**Request:**
```json
{
  "title": "New Project"
}
```

**Validation:**
```typescript
const schema = z.object({
  title: z.string().min(1).max(200)
});
```

**Response (201):**
```json
{
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "title": "New Project",
    "position": 2,
    "createdAt": 1234567890,
    "updatedAt": 1234567890,
    "archivedAt": null
  }
}
```

### GET /api/queues/:queueId

Get a specific queue.

**Response (200):**
```json
{
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "title": "Work",
    "position": 0,
    "createdAt": 1234567890,
    "updatedAt": 1234567890,
    "archivedAt": null
  }
}
```

**Errors:**
- `404`: Queue not found
- `403`: Queue belongs to another user

### PATCH /api/queues/:queueId

Update a queue.

**Request:**
```json
{
  "title": "Updated Title"
}
```

**Validation:**
```typescript
const schema = z.object({
  title: z.string().min(1).max(200).optional()
});
```

**Response (200):**
```json
{
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "title": "Updated Title",
    "position": 0,
    "createdAt": 1234567890,
    "updatedAt": 1234567891,
    "archivedAt": null
  }
}
```

### POST /api/queues/reorder

Reorder queues for the current user.

**Request:**
```json
{
  "queueIds": ["uuid1", "uuid2", "uuid3"]
}
```

**Validation:**
```typescript
const schema = z.object({
  queueIds: z.array(z.string().uuid()).min(1)
});
```

**Response (200):**
```json
{
  "data": {
    "success": true,
    "updated": 3
  }
}
```

### DELETE /api/queues/:queueId

Archive a queue (soft delete).

**Response (200):**
```json
{
  "data": {
    "id": "uuid",
    "archivedAt": 1234567891
  }
}
```

**Note:** Archiving a queue also archives all its tasks.

## Task Endpoints

### GET /api/queues/:queueId/tasks

List all tasks in a queue.

**Query Parameters:**
- `category` (optional): Filter by category (next_actions, waiting_on, someday, archive)
- `completed` (optional): Filter by completion status (true/false)
- `page` (optional, default: 1): Page number
- `pageSize` (optional, default: 100): Items per page

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "queueId": "uuid",
      "category": "next_actions",
      "title": "Complete project proposal",
      "description": "Draft and submit proposal by Friday",
      "position": 0,
      "completed": false,
      "completedAt": null,
      "createdAt": 1234567890,
      "updatedAt": 1234567890,
      "archivedAt": null
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 100,
    "total": 42,
    "hasMore": false
  }
}
```

### POST /api/queues/:queueId/tasks

Create a new task in a queue.

**Request:**
```json
{
  "category": "next_actions",
  "title": "Complete project proposal",
  "description": "Draft and submit proposal by Friday"
}
```

**Validation:**
```typescript
const schema = z.object({
  category: z.enum(['next_actions', 'waiting_on', 'someday', 'archive']),
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional().default('')
});
```

**Response (201):**
```json
{
  "data": {
    "id": "uuid",
    "queueId": "uuid",
    "category": "next_actions",
    "title": "Complete project proposal",
    "description": "Draft and submit proposal by Friday",
    "position": 0,
    "completed": false,
    "completedAt": null,
    "createdAt": 1234567890,
    "updatedAt": 1234567890,
    "archivedAt": null
  }
}
```

### GET /api/tasks/:taskId

Get a specific task.

**Response (200):**
```json
{
  "data": {
    "id": "uuid",
    "queueId": "uuid",
    "category": "next_actions",
    "title": "Complete project proposal",
    "description": "Draft and submit proposal by Friday",
    "position": 0,
    "completed": false,
    "completedAt": null,
    "createdAt": 1234567890,
    "updatedAt": 1234567890,
    "archivedAt": null
  }
}
```

**Errors:**
- `404`: Task not found
- `403`: Task belongs to another user's queue

### PATCH /api/tasks/:taskId

Update a task.

**Request:**
```json
{
  "title": "Updated title",
  "description": "Updated description",
  "category": "waiting_on",
  "completed": true
}
```

**Validation:**
```typescript
const schema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  category: z.enum(['next_actions', 'waiting_on', 'someday', 'archive']).optional(),
  completed: z.boolean().optional()
});
```

**Response (200):**
```json
{
  "data": {
    "id": "uuid",
    "queueId": "uuid",
    "category": "waiting_on",
    "title": "Updated title",
    "description": "Updated description",
    "position": 0,
    "completed": true,
    "completedAt": 1234567891,
    "createdAt": 1234567890,
    "updatedAt": 1234567891,
    "archivedAt": null
  }
}
```

### POST /api/tasks/:taskId/move

Move a task to a different category or queue.

**Request:**
```json
{
  "category": "someday",
  "queueId": "uuid",
  "position": 2
}
```

**Validation:**
```typescript
const schema = z.object({
  category: z.enum(['next_actions', 'waiting_on', 'someday', 'archive']).optional(),
  queueId: z.string().uuid().optional(),
  position: z.number().int().min(0).optional()
});
```

**Response (200):**
```json
{
  "data": {
    "id": "uuid",
    "queueId": "uuid",
    "category": "someday",
    "position": 2,
    "updatedAt": 1234567891
  }
}
```

### POST /api/queues/:queueId/tasks/reorder

Reorder tasks within a category.

**Request:**
```json
{
  "category": "next_actions",
  "taskIds": ["uuid1", "uuid2", "uuid3"]
}
```

**Validation:**
```typescript
const schema = z.object({
  category: z.enum(['next_actions', 'waiting_on', 'someday', 'archive']),
  taskIds: z.array(z.string().uuid()).min(1)
});
```

**Response (200):**
```json
{
  "data": {
    "success": true,
    "updated": 3
  }
}
```

### POST /api/tasks/:taskId/complete

Mark a task as completed.

**Response (200):**
```json
{
  "data": {
    "id": "uuid",
    "completed": true,
    "completedAt": 1234567891,
    "updatedAt": 1234567891
  }
}
```

### POST /api/tasks/:taskId/uncomplete

Mark a task as not completed.

**Response (200):**
```json
{
  "data": {
    "id": "uuid",
    "completed": false,
    "completedAt": null,
    "updatedAt": 1234567891
  }
}
```

### DELETE /api/tasks/:taskId

Permanently delete a task.

**Response (204):** No content

**Note:** This is a hard delete. Tasks should typically be archived instead.

### POST /api/tasks/:taskId/archive

Archive a task (soft delete).

**Response (200):**
```json
{
  "data": {
    "id": "uuid",
    "category": "archive",
    "archivedAt": 1234567891,
    "updatedAt": 1234567891
  }
}
```

## Batch Operations

### POST /api/tasks/batch

Perform batch operations on multiple tasks.

**Request:**
```json
{
  "operation": "complete",
  "taskIds": ["uuid1", "uuid2", "uuid3"]
}
```

**Validation:**
```typescript
const schema = z.object({
  operation: z.enum(['complete', 'uncomplete', 'archive', 'delete']),
  taskIds: z.array(z.string().uuid()).min(1).max(100)
});
```

**Response (200):**
```json
{
  "data": {
    "success": true,
    "processed": 3,
    "failed": 0,
    "results": [
      { "id": "uuid1", "success": true },
      { "id": "uuid2", "success": true },
      { "id": "uuid3", "success": true }
    ]
  }
}
```

## Rate Limiting

All endpoints are rate-limited per user:

| Endpoint Pattern | Limit |
|-----------------|-------|
| `/api/auth/request-magic-link` | 3 requests/hour |
| `/api/auth/verify` | 5 requests/15 minutes |
| GET endpoints | 1000 requests/hour |
| POST/PATCH endpoints | 500 requests/hour |
| DELETE endpoints | 100 requests/hour |

**Rate Limit Headers:**
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1234567890
```

**Rate Limit Error (429):**
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "details": {
      "retryAfter": 3600
    }
  }
}
```

## CORS Configuration

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://your-domain.com',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Allow-Credentials': 'true'
};
```

## Request/Response Examples

### Create Task with Optimistic Update

**Client Code (TanStack Query):**
```typescript
const { mutate } = useCreateTask();

mutate(
  {
    queueId: 'queue-uuid',
    category: 'next_actions',
    title: 'New task'
  },
  {
    onSuccess: (data) => {
      toast({ title: 'Task created successfully' });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to create task',
        description: error.message
      });
    }
  }
);
```

### Error Handling Example

**Client Code:**
```typescript
async function createTask(data: CreateTaskInput) {
  const response = await fetch('/api/queues/queue-uuid/tasks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }

  return response.json();
}
```

## WebSocket Support (Future Enhancement)

Real-time updates via WebSocket connections:

```
wss://gtd.your-domain.com/api/ws
```

**Events:**
- `task.created`
- `task.updated`
- `task.deleted`
- `queue.created`
- `queue.updated`
- `queue.deleted`

## API Versioning

Current version: `v1` (implicit in base path `/api`)

Future versions will use explicit versioning:
- `/api/v2/queues`
- `/api/v2/tasks`

Version 1 will be maintained for 12 months after v2 release.
