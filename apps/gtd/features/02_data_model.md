# Data Model

## Overview

The GTD application uses a hierarchical data model with Durable Objects providing strong consistency and data locality. All data is stored in SQLite-backed Durable Objects for durability and point-in-time recovery.

## Durable Objects Architecture

### Control and Data Plane Separation

Following Cloudflare best practices, we separate control and data operations:

- **Control Plane**: User-level operations (authentication, queue management)
- **Data Plane**: Task-level operations (CRUD on individual tasks)

This allows us to scale to thousands of concurrent users without bottlenecks.

### Object Types

1. **UserDO**: One per user (keyed by user email hash)
2. **QueueDO**: One per GTD queue (keyed by queue ID)
3. **TaskDO**: One per task (keyed by task ID)
4. **AuthenticationDO**: Single global instance for auth operations

## Data Schemas

### User

```typescript
interface User {
  id: string;              // UUID v4
  email: string;           // Unique, lowercase
  displayName: string;     // User's display name
  createdAt: number;       // Unix timestamp
  updatedAt: number;       // Unix timestamp
  preferences: UserPreferences;
}

interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  defaultView: 'desktop' | 'mobile';
  emailNotifications: boolean;
}
```

**Storage**: UserDO SQLite database

**Zod Schema**:
```typescript
const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().toLowerCase(),
  displayName: z.string().min(1).max(100),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
  preferences: z.object({
    theme: z.enum(['light', 'dark', 'system']),
    defaultView: z.enum(['desktop', 'mobile']),
    emailNotifications: z.boolean()
  })
});
```

### Queue

```typescript
interface Queue {
  id: string;              // UUID v4
  userId: string;          // Owner's user ID
  title: string;           // Queue title
  position: number;        // Display order (0-based)
  createdAt: number;       // Unix timestamp
  updatedAt: number;       // Unix timestamp
  archivedAt: number | null; // Soft delete timestamp
}
```

**Storage**: QueueDO SQLite database

**Indexes**:
- Primary: `id`
- Secondary: `userId`, `position`
- Composite: `(userId, archivedAt)` for active queues

**Zod Schema**:
```typescript
const QueueSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string().min(1).max(200),
  position: z.number().int().min(0),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
  archivedAt: z.number().int().positive().nullable()
});
```

### Task

```typescript
interface Task {
  id: string;              // UUID v4
  queueId: string;         // Parent queue ID
  category: TaskCategory;  // Task category
  title: string;           // Task title
  description: string;     // Task description (optional)
  position: number;        // Display order within category
  completed: boolean;      // Completion status
  completedAt: number | null; // Completion timestamp
  createdAt: number;       // Unix timestamp
  updatedAt: number;       // Unix timestamp
  archivedAt: number | null; // Move to archive timestamp
}

type TaskCategory = 'next_actions' | 'waiting_on' | 'someday' | 'archive';
```

**Storage**: TaskDO SQLite database

**Indexes**:
- Primary: `id`
- Secondary: `queueId`, `category`, `position`
- Composite: `(queueId, category, position)` for efficient category queries

**Zod Schema**:
```typescript
const TaskCategorySchema = z.enum([
  'next_actions',
  'waiting_on',
  'someday',
  'archive'
]);

const TaskSchema = z.object({
  id: z.string().uuid(),
  queueId: z.string().uuid(),
  category: TaskCategorySchema,
  title: z.string().min(1).max(500),
  description: z.string().max(5000).default(''),
  position: z.number().int().min(0),
  completed: z.boolean().default(false),
  completedAt: z.number().int().positive().nullable(),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
  archivedAt: z.number().int().positive().nullable()
});
```

## SQLite Schema

### UserDO Tables

```sql
-- Users table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_users_email ON users(email);

-- User preferences table
CREATE TABLE user_preferences (
  user_id TEXT PRIMARY KEY,
  theme TEXT NOT NULL DEFAULT 'system',
  default_view TEXT NOT NULL DEFAULT 'desktop',
  email_notifications INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Sessions table
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  refresh_token_id TEXT UNIQUE NOT NULL,
  created_at INTEGER NOT NULL,
  last_accessed_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
```

### QueueDO Tables

```sql
-- Queues table
CREATE TABLE queues (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  position INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  archived_at INTEGER
);

CREATE INDEX idx_queues_user_id ON queues(user_id);
CREATE INDEX idx_queues_user_active ON queues(user_id, archived_at);
CREATE INDEX idx_queues_position ON queues(position);
```

### TaskDO Tables

```sql
-- Tasks table
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  queue_id TEXT NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  completed_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  archived_at INTEGER
);

CREATE INDEX idx_tasks_queue_id ON tasks(queue_id);
CREATE INDEX idx_tasks_category ON tasks(category);
CREATE INDEX idx_tasks_queue_category ON tasks(queue_id, category, position);
CREATE INDEX idx_tasks_completed ON tasks(completed);
```

## Data Operations

### User Operations

**UserDO Methods**:
- `getUser(email: string): Promise<User | null>`
- `createUser(data: CreateUserInput): Promise<User>`
- `updateUser(id: string, data: UpdateUserInput): Promise<User>`
- `updatePreferences(id: string, prefs: UserPreferences): Promise<User>`

### Queue Operations

**QueueDO Methods**:
- `getQueue(id: string): Promise<Queue | null>`
- `listQueues(userId: string): Promise<Queue[]>`
- `createQueue(data: CreateQueueInput): Promise<Queue>`
- `updateQueue(id: string, data: UpdateQueueInput): Promise<Queue>`
- `reorderQueues(userId: string, queueIds: string[]): Promise<void>`
- `archiveQueue(id: string): Promise<void>`

### Task Operations

**TaskDO Methods**:
- `getTask(id: string): Promise<Task | null>`
- `listTasksByQueue(queueId: string): Promise<Task[]>`
- `listTasksByCategory(queueId: string, category: TaskCategory): Promise<Task[]>`
- `createTask(data: CreateTaskInput): Promise<Task>`
- `updateTask(id: string, data: UpdateTaskInput): Promise<Task>`
- `moveTask(id: string, category: TaskCategory, position: number): Promise<Task>`
- `reorderTasks(queueId: string, category: TaskCategory, taskIds: string[]): Promise<void>`
- `completeTask(id: string): Promise<Task>`
- `uncompleteTask(id: string): Promise<Task>`
- `archiveTask(id: string): Promise<Task>`
- `deleteTask(id: string): Promise<void>`

## Data Consistency

### Strong Consistency
- All operations within a single Durable Object are strongly consistent
- SQLite ACID guarantees for all transactions
- Use transactions for multi-row updates

### Cross-Object Consistency
- Use eventual consistency for cross-object relationships
- Implement compensating transactions for failures
- Use optimistic locking with version numbers

## Data Locality

Following Cloudflare best practices:

1. **User-Based Sharding**: Each user's data is isolated in their UserDO
2. **Queue-Based Sharding**: Each queue's tasks are in separate TaskDO instances
3. **Geographic Distribution**: Durable Objects automatically placed near users

## Caching Strategy

### Client-Side Caching (TanStack Query)
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 30, // 30 minutes
      refetchOnWindowFocus: true,
      refetchOnReconnect: true
    }
  }
});
```

### Cache Invalidation
- Optimistic updates for all mutations
- Automatic refetch on mutation success
- Real-time updates via WebSocket (future enhancement)

## Migrations

### Schema Versioning
Store schema version in Durable Object metadata:

```typescript
interface ObjectMetadata {
  schemaVersion: number;
  lastMigration: number;
}
```

### Migration Strategy
1. Deploy new code with migration logic
2. Lazy migration on first access
3. Background migration for inactive objects
4. Point-in-time recovery fallback

## Backup and Recovery

### Cloudflare Features
- SQLite backend provides automatic backups
- Point-in-time recovery up to 30 days
- Automatic replication across regions

### Data Export
Provide user-facing data export:
- Export all queues and tasks as JSON
- Export individual queues as CSV
- Scheduled automated backups (future)

## Performance Considerations

### Query Optimization
- Use composite indexes for common query patterns
- Limit result sets (pagination)
- Avoid N+1 queries with batch operations

### Write Optimization
- Batch operations where possible
- Use prepared statements
- Implement write-behind caching for non-critical updates

### Resource Limits
- Durable Object CPU: 30 seconds per request
- Storage: 128 MB per object (SQLite)
- Concurrent requests: Serialized per object

## Data Validation

All data operations validate using Zod schemas:

```typescript
// Example mutation
async function createTask(data: unknown): Promise<Task> {
  const validated = CreateTaskSchema.parse(data);
  // Proceed with validated data
}
```

## Testing Data Model

### Unit Tests
- Schema validation with Zod
- SQLite query correctness
- Data transformation logic

### Integration Tests
- Durable Object CRUD operations
- Cross-object consistency
- Migration scripts

### Load Tests
- Concurrent operations per object
- Large dataset queries
- Storage limits
