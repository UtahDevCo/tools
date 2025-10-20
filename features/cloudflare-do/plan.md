# Plan 1: Cloudflare Durable Objects Implementation for Task Persistence

## Goal
Implement Cloudflare Durable Objects to persist GTD tasks and queues, replacing the current in-memory mock data with durable, distributed storage.

## Overview
This plan outlines the migration from React state-based mock data to Cloudflare Durable Objects with SQLite backend for persistent storage of queues and tasks.

## Architecture

### Durable Object Types

1. **UserDO** - One instance per user
   - Stores user-level data and preferences
   - Manages list of queues owned by the user
   - Handles user-level operations

2. **QueueDO** - One instance per queue
   - Stores queue metadata (id, name, color, position)
   - Contains all tasks within the queue
   - Handles queue-level operations and task CRUD

### Data Flow
```
Client (React) 
  ↓ HTTP Request
Worker API Handler
  ↓ Durable Object Stub
QueueDO / UserDO (SQLite)
  ↓ Response
Client (TanStack Query cache)
```

## Implementation Steps

### Phase 1: Durable Object Setup
- [ ] Create UserDO class with SQLite schema
- [ ] Create QueueDO class with SQLite schema for queues and tasks
- [ ] Update wrangler.toml with Durable Object bindings
- [ ] Create database initialization scripts for SQLite schemas

### Phase 2: API Endpoints
- [ ] `/api/queues` - GET (list user's queues), POST (create queue)
- [ ] `/api/queues/:id` - GET (get queue with tasks), PUT (update queue), DELETE (soft delete)
- [ ] `/api/queues/:id/tasks` - POST (create task)
- [ ] `/api/tasks/:id` - PUT (update task), DELETE (soft delete), PATCH (move task)
- [ ] `/api/tasks/batch` - POST (bulk operations: reorder, move between queues)

### Phase 3: Frontend Integration
- [ ] Replace mock data with API calls using TanStack Query
- [ ] Implement optimistic updates for instant UI feedback
- [ ] Add error handling and retry logic
- [ ] Implement loading states

### Phase 4: Testing & Migration
- [ ] Unit tests for Durable Object methods
- [ ] Integration tests for API endpoints
- [ ] E2E tests for user flows
- [ ] Migration path from mock data (if needed for existing users)

## Data Schemas

### Queue Schema (SQLite in QueueDO)
```sql
CREATE TABLE IF NOT EXISTS queues (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  position INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  archived_at INTEGER
);

CREATE INDEX idx_queues_user_id ON queues(user_id);
```

### Task Schema (SQLite in QueueDO)
```sql
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  queue_id TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('next', 'waiting', 'someday', 'archive')),
  title TEXT NOT NULL,
  description TEXT,
  position INTEGER NOT NULL,
  completed BOOLEAN DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  archived_at INTEGER,
  FOREIGN KEY (queue_id) REFERENCES queues(id)
);

CREATE INDEX idx_tasks_queue_id ON tasks(queue_id);
CREATE INDEX idx_tasks_category ON tasks(category);
```

## Web Pages Required

### 1. Dashboard (existing - `/`)
**Updates needed:**
- Replace useState mock data with TanStack Query hooks
- Add loading states while fetching from Durable Objects
- Add error boundaries for API failures
- Implement optimistic updates for task mutations

**Forms (TanStack Form):**
- Quick add task form (inline in each category section)
- Queue name edit form (inline edit)

**Shadcn Components:**
- `Input` - Task title input, queue name input
- `Button` - Add task, add queue, delete queue
- `Skeleton` - Loading states for tasks and queues
- `Alert` - Error messages
- `Sheet` - Task detail drawer (existing)

### 2. Task Detail Drawer (existing - component in dashboard)
**Updates needed:**
- Fetch full task details from QueueDO via API
- Save changes to Durable Objects on form submit

**Forms (TanStack Form):**
- Task detail form with fields:
  - Title (text input)
  - Description (textarea)
  - Category (select)
  - Queue (select for moving between queues)
  - Completion status (checkbox)

**Shadcn Components:**
- `Sheet` - Main drawer container
- `Form` - Form wrapper
- `Input` - Title field
- `Textarea` - Description field
- `Select` - Category and queue dropdowns
- `Checkbox` - Completion status
- `Button` - Save, cancel, delete actions

### 3. Queue Management (new modal/dialog)
**Purpose:** Manage queue settings and view queue metadata

**Forms (TanStack Form):**
- Queue settings form:
  - Name (text input)
  - Color picker (color input)
  - Position/order (drag to reorder)

**Shadcn Components:**
- `Dialog` - Settings modal
- `Input` - Queue name
- `Label` - Form labels
- `Button` - Save, cancel, delete

## Zod Schemas (for validation)

```typescript
// Queue validation
const QueueSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9A-F]{6}$/i),
  position: z.number().int().min(0),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
  archivedAt: z.number().int().positive().nullable(),
});

// Task validation
const TaskSchema = z.object({
  id: z.string().uuid(),
  queueId: z.string().uuid(),
  category: z.enum(['next', 'waiting', 'someday', 'archive']),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  position: z.number().int().min(0),
  completed: z.boolean(),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
  archivedAt: z.number().int().positive().nullable(),
});

// API request schemas
const CreateQueueRequestSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9A-F]{6}$/i),
});

const CreateTaskRequestSchema = z.object({
  queueId: z.string().uuid(),
  category: z.enum(['next', 'waiting', 'someday']),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
});

const UpdateTaskRequestSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  category: z.enum(['next', 'waiting', 'someday', 'archive']).optional(),
  queueId: z.string().uuid().optional(),
  completed: z.boolean().optional(),
  position: z.number().int().min(0).optional(),
});

const BatchTaskOperationSchema = z.object({
  operation: z.enum(['reorder', 'move', 'archive', 'delete']),
  taskIds: z.array(z.string().uuid()),
  targetQueueId: z.string().uuid().optional(),
  targetCategory: z.enum(['next', 'waiting', 'someday', 'archive']).optional(),
  positions: z.array(z.number().int().min(0)).optional(),
});
```

## TanStack Packages to Use

### TanStack Query (v5)
- `useQuery` - Fetch queues and tasks
- `useMutation` - Create, update, delete operations
- `useQueryClient` - Manual cache updates for optimistic updates
- `QueryClientProvider` - Root provider

```typescript
// Example usage
const queuesQuery = useQuery({
  queryKey: ['queues'],
  queryFn: async () => {
    const response = await fetch('/api/queues');
    return response.json();
  },
});

const createTaskMutation = useMutation({
  mutationFn: async (task: CreateTaskRequest) => {
    const response = await fetch(`/api/queues/${task.queueId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(task),
    });
    return response.json();
  },
  onMutate: async (newTask) => {
    // Optimistic update
    await queryClient.cancelQueries({ queryKey: ['queues'] });
    const previousQueues = queryClient.getQueryData(['queues']);
    queryClient.setQueryData(['queues'], (old) => {
      // Add new task optimistically
    });
    return { previousQueues };
  },
  onError: (err, newTask, context) => {
    // Rollback on error
    queryClient.setQueryData(['queues'], context.previousQueues);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['queues'] });
  },
});
```

### TanStack Form (v0.x)
- `useForm` - Form state management
- `Field` - Individual form fields with validation

```typescript
// Example usage
import { useForm } from '@tanstack/react-form';

function TaskForm({ onSubmit }) {
  const form = useForm({
    defaultValues: {
      title: '',
      description: '',
      category: 'next',
    },
    onSubmit: async (values) => {
      await onSubmit(values);
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
    >
      <form.Field
        name="title"
        validators={{
          onChange: ({ value }) => 
            value.length < 1 ? 'Title is required' : undefined,
        }}
        children={(field) => (
          <Input
            value={field.state.value}
            onBlur={field.handleBlur}
            onChange={(e) => field.handleChange(e.target.value)}
          />
        )}
      />
      <Button type="submit">Save</Button>
    </form>
  );
}
```

## Key Features

### Optimistic Updates
All mutations will use optimistic updates for instant UI feedback:
- Add task → immediately appears in UI
- Move task → immediately updates position
- Update task → immediately reflects changes
- Delete task → immediately removes from UI

If the API call fails, changes are rolled back automatically.

### Error Handling
- Network errors: Retry with exponential backoff (TanStack Query default)
- Validation errors: Display inline field errors from Zod
- Conflict errors: Refresh data and prompt user to retry
- Rate limit errors: Display friendly message and disable actions temporarily

### Loading States
- Skeleton loaders for initial queue/task fetch
- Inline spinners for mutation actions
- Disabled states during async operations
- Progress indicators for batch operations

## Security Considerations

### Authentication
- All API endpoints require valid JWT token from auth service
- Verify user ID from JWT matches requested resource owner
- Rate limiting per user via Durable Objects

### Data Validation
- All input validated with Zod schemas
- SQL injection prevention via prepared statements
- XSS prevention via React's automatic escaping

### Authorization
- Users can only access their own queues and tasks
- Queue ownership verified on every operation
- Task operations require queue ownership

## Performance Optimizations

### Caching Strategy
- TanStack Query automatic caching with 5-minute stale time
- Optimistic updates for instant UI feedback
- Background refetch on window focus
- Retry failed requests automatically

### Durable Object Optimizations
- Single QueueDO instance per queue (reduces stub creation)
- Batch operations for reordering multiple tasks
- SQLite indexes on frequently queried columns
- Lazy loading of task descriptions (fetch on drawer open)

### Network Optimizations
- Gzip compression for API responses
- ETags for conditional requests
- Batch multiple mutations when possible
- WebSocket consideration for future real-time updates

## Testing Strategy

### Unit Tests
- Durable Object methods (SQLite operations)
- Zod schema validation
- API handler functions
- React component logic

### Integration Tests
- Full API endpoint flows
- Durable Object creation and persistence
- Authentication middleware
- Error handling scenarios

### E2E Tests (Playwright)
- Create queue and tasks
- Move tasks between categories
- Edit task details
- Delete queue with tasks
- Optimistic update rollback scenarios

## Migration Path

### For Development
1. Deploy Durable Objects infrastructure
2. Update worker.ts with API routes
3. Replace mock data with API calls
4. Test thoroughly in development environment

### For Production (if mock data in prod)
1. No migration needed - mock data is client-side only
2. Users will start fresh with persistent storage
3. Consider adding "import" feature for users to add initial tasks

## Success Metrics

### Technical
- [ ] All API endpoints respond in < 50ms (p95)
- [ ] Zero data loss - all operations persisted to SQLite
- [ ] Optimistic updates work for all mutations
- [ ] Error handling gracefully handles all failure modes
- [ ] Tests cover >90% of code paths

### User Experience
- [ ] Instant UI feedback for all actions
- [ ] Clear loading states during operations
- [ ] Helpful error messages for failures
- [ ] Data persists across browser sessions
- [ ] Works reliably with poor network conditions

## Future Enhancements
- Real-time sync via WebSockets
- Offline support with service workers
- Conflict resolution for concurrent edits
- Task sharing between users
- Export/import functionality
