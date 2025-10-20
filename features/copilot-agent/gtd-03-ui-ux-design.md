# UI/UX Design

## Overview

The GTD application will feature a clean, minimal interface inspired by Tweek.so, using Shadcn components, Tailwind CSS, and Inter font. The design prioritizes clarity, speed, and an uncluttered workspace.

## Visual Design

### Design Inspiration
- **Reference**: Tweek.so aesthetic (see `tweek.png`)
- **Principles**: Minimal, clean, focused on content
- **Colors**: Neutral palette with subtle accents
- **Typography**: Inter font family throughout

### Font
**Inter** (Google Fonts)
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

**Usage**:
- Headings: Inter 600 (semibold)
- Body: Inter 400 (regular)
- Labels: Inter 500 (medium)
- Emphasis: Inter 700 (bold)

### Color Palette

**Light Mode**:
```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 222.2 84% 4.9%;
}
```

**Dark Mode**:
```css
.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --card: 222.2 84% 4.9%;
  --card-foreground: 210 40% 98%;
  --primary: 210 40% 98%;
  --primary-foreground: 222.2 47.4% 11.2%;
  --secondary: 217.2 32.6% 17.5%;
  --secondary-foreground: 210 40% 98%;
  --muted: 217.2 32.6% 17.5%;
  --muted-foreground: 215 20.2% 65.1%;
  --accent: 217.2 32.6% 17.5%;
  --accent-foreground: 210 40% 98%;
  --border: 217.2 32.6% 17.5%;
  --input: 217.2 32.6% 17.5%;
  --ring: 212.7 26.8% 83.9%;
}
```

## Layout

### Desktop & Mobile Layout (Single-Column)

```
┌─────────────────────────────────────────────────────┐
│  Queue Name [editable]          ⋮  ◀  ▶             │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Next Actions                                  +     │
│  ⋮  Task 1                                      ☐   │
│  ⋮  Task 2                                      ☑   │
│  ⋮  Task 3                                      ☐   │
│  ⋮  [empty]                                          │
│  ⋮  [empty]                                          │
│                                                      │
│  Waiting On                                    +     │
│  ⋮  Task 4                                      ☐   │
│  ⋮  [empty]                                          │
│  ⋮  [empty]                                          │
│  ⋮  [empty]                                          │
│  ⋮  [empty]                                          │
│                                                      │
│  Someday                                       +     │
│  ⋮  Task 5                                      ☐   │
│  ⋮  [empty]                                          │
│  ⋮  [empty]                                          │
│  ⋮  [empty]                                          │
│  ⋮  [empty]                                          │
│                                                      │
│  Archive                                       +     │
│  ⋮  [empty]                                          │
│  ⋮  [empty]                                          │
│  ⋮  [empty]                                          │
│  ⋮  [empty]                                          │
│  ⋮  [empty]                                          │
└─────────────────────────────────────────────────────┘
```

**Features**:
- Single-column vertical layout for all screen sizes
- Fixed header with editable queue name and navigation controls
- Left/Right arrow buttons (◀ ▶) to switch between queues
- Triple-dot menu (⋮) in header for queue actions
- Minimum 5 list items per category section
- Empty rows available for quick task creation
- Drag handles (⋮) appear on hover/focus for reordering
- Checkboxes appear on hover/focus on the right side

## Components

### Using Shadcn UI

Install core components:
```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add input
npx shadcn-ui@latest add label
npx shadcn-ui@latest add sheet
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add scroll-area
npx shadcn-ui@latest add separator
npx shadcn-ui@latest add toast
```

### Component Hierarchy

```
App
├── AuthPage
│   ├── MagicLinkForm
│   └── VerifyingState
├── DashboardLayout
│   ├── Header
│   │   ├── Logo
│   │   ├── UserMenu
│   │   └── ThemeToggle
│   ├── QueueList (Desktop)
│   │   ├── QueueColumn[]
│   │   │   ├── QueueHeader
│   │   │   ├── CategorySection[]
│   │   │   │   ├── CategoryHeader
│   │   │   │   └── TaskList
│   │   │   │       └── TaskCard[]
│   │   └── AddQueueButton
│   └── QueueTabs (Mobile)
│       ├── TabList
│       └── TabContent
│           └── CategorySection[]
└── TaskDrawer
    ├── TaskForm
    └── TaskActions
```

## Key UI Components

### Header

```tsx
<header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
  <div className="container flex h-14 items-center">
    <Logo />
    <div className="flex flex-1 items-center justify-end space-x-2">
      <ThemeToggle />
      <UserMenu />
    </div>
  </div>
</header>
```

### Queue Column

```tsx
<div className="flex h-full w-[280px] flex-col border-r bg-card p-4">
  <QueueHeader queue={queue} onEdit={handleEdit} />
  <ScrollArea className="flex-1">
    <CategorySection category="next_actions" tasks={tasks} />
    <CategorySection category="waiting_on" tasks={tasks} />
    <CategorySection category="someday" tasks={tasks} />
    <CategorySection category="archive" tasks={tasks} />
  </ScrollArea>
</div>
```

### Category Section

```tsx
<div className="mb-6">
  <button
    onClick={handleAddTask}
    className="mb-2 w-full text-left text-sm font-semibold text-muted-foreground hover:text-foreground"
  >
    {categoryLabel}
  </button>
  <div className="space-y-2">
    {tasks.map(task => (
      <TaskCard key={task.id} task={task} onClick={handleTaskClick} />
    ))}
  </div>
</div>
```

### Queue Header

**Features**:
- Queue name is editable using `contenteditable` attribute
- Triple-dot dropdown menu with queue actions
- Navigation buttons to switch between queues

```tsx
<header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur">
  <div className="flex h-14 items-center px-4">
    <h1
      contentEditable
      suppressContentEditableWarning
      onBlur={handleQueueNameChange}
      className="text-4xl font-bold outline-none focus:ring-2 focus:ring-ring rounded px-2"
    >
      {queueName}
    </h1>

    <div className="flex flex-1 items-center justify-end space-x-4">
      <DropdownMenu>
        <DropdownMenuTrigger>
          <EllipsisVertical className="h-5 w-5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={handleAddQueue}>
            <Plus className="mr-2 h-4 w-4" />
            Add New List
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleDeleteQueue} className="text-destructive">
            <Trash className="mr-2 h-4 w-4" />
            Delete List
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button onClick={onPreviousQueue} disabled={isFirst}>
        <ChevronLeft />
      </Button>
      <Button onClick={onNextQueue} disabled={isLast}>
        <ChevronRight />
      </Button>
    </div>
  </div>
</header>
```

### Task Card

**Features**:
- Click to edit task inline
- Drag handle (⋮) visible on hover/focus
- Checkbox visible on hover/focus
- Smooth transitions for interactive elements

```tsx
<Card
  className="group cursor-pointer p-3 transition-colors hover:bg-accent focus-within:bg-accent"
  onClick={onClick}
  draggable
  tabIndex={0}
>
  <div className="flex items-start space-x-2">
    <button
      className="cursor-grab opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
      draggable
      aria-label="Drag to reorder"
    >
      <GripVertical className="h-4 w-4 text-muted-foreground" />
    </button>

    <div
      contentEditable={isEditing}
      suppressContentEditableWarning
      onBlur={handleSave}
      onKeyDown={handleKeyDown}
      className="flex-1 min-w-0 outline-none"
    >
      <p className={cn(
        "text-sm leading-tight",
        task.completed && "line-through text-muted-foreground"
      )}>
        {task.title}
      </p>
    </div>

    <Checkbox
      checked={task.completed}
      onCheckedChange={handleToggleComplete}
      onClick={(e) => e.stopPropagation()}
      className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
    />
  </div>
</Card>
```

### Empty Task Card

**Features**:
- Click to create new task
- Immediately becomes editable when clicked
- Same minimum height as regular task cards

```tsx
<Card
  className="group cursor-pointer p-3 transition-colors hover:bg-accent border-dashed"
  onClick={handleCreateTask}
>
  <div className="flex items-start space-x-2">
    <div className="h-4 w-4" /> {/* Spacer for drag handle */}
    <div className="flex-1 min-w-0 h-5" /> {/* Empty content area */}
  </div>
</Card>
```

### Task Drawer (Sheet)

```tsx
<Sheet open={isOpen} onOpenChange={setIsOpen}>
  <SheetContent className="w-full sm:max-w-md">
    <SheetHeader>
      <SheetTitle>Edit Task</SheetTitle>
    </SheetHeader>
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="next_actions">Next Actions</SelectItem>
            <SelectItem value="waiting_on">Waiting On</SelectItem>
            <SelectItem value="someday">Someday</SelectItem>
            <SelectItem value="archive">Archive</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
    <SheetFooter>
      <Button variant="outline" onClick={handleDelete}>Delete</Button>
      <Button onClick={handleSave}>Save</Button>
    </SheetFooter>
  </SheetContent>
</Sheet>
```

## Interactions

### Queue Header Interactions

**Editable Queue Name**:
- Click on queue name to focus and edit
- Use `contenteditable` for inline editing
- Save on blur or Enter key
- Escape key cancels edit

**Queue Actions Dropdown**:
- Triple-dot menu (⋮) opens dropdown
- Options:
  - "Add New List" - Creates a new queue
  - "Delete List" - Opens confirmation dialog

**Delete Confirmation Dialog**:
```tsx
<AlertDialog>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete "{queueName}"?</AlertDialogTitle>
      <AlertDialogDescription>
        This action cannot be undone. All tasks in this queue will be permanently deleted.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive">
        Delete
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### Task Card Interactions

**Inline Editing**:
- Click on task card to enable editing mode
- Task text becomes contenteditable
- Save on blur or Enter key
- Escape key cancels edit
- Tab key saves and moves to next task

**Hover/Focus States**:
- Drag handle (⋮) appears on left when hovering or focused
- Checkbox appears on right when hovering or focused
- Both elements fade in/out with smooth transitions
- Card background changes to accent color

**Empty Task Cards**:
- Click on empty card to create new task
- Immediately becomes editable
- Focus is set to the content area
- Escape key cancels and removes temporary card
- Enter or blur saves the new task

### Drag and Drop

Use `@dnd-kit` for drag-and-drop functionality:

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

**Features**:
- Drag handle (⋮) becomes visible on hover/focus
- Drag tasks between categories
- Reorder tasks within categories
- Visual feedback during drag
- Smooth animations
- Cursor changes to grab when hovering over handle

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Quick add task |
| `Ctrl/Cmd + N` | New queue |
| `Ctrl/Cmd + /` | Show shortcuts |
| `Esc` | Close drawer/dialog |
| `j` / `k` | Navigate tasks |
| `Enter` | Open selected task |
| `Space` | Toggle task complete |
| `d` | Delete selected task |
| `1-4` | Switch to category |

### Mobile Gestures

- **Swipe left on task**: Archive
- **Swipe right on task**: Complete
- **Long press on task**: Open drawer
- **Swipe between tabs**: Switch queues

## State Management

### TanStack Query Integration

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: true,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppRouter />
      <ReactQueryDevtools />
    </QueryClientProvider>
  );
}
```

### Query Hooks

```typescript
// Queues
export const useQueues = () => {
  return useQuery({
    queryKey: ['queues'],
    queryFn: fetchQueues,
  });
};

// Tasks for a queue
export const useTasks = (queueId: string) => {
  return useQuery({
    queryKey: ['tasks', queueId],
    queryFn: () => fetchTasks(queueId),
    enabled: !!queueId,
  });
};

// Single task
export const useTask = (taskId: string) => {
  return useQuery({
    queryKey: ['tasks', taskId],
    queryFn: () => fetchTask(taskId),
    enabled: !!taskId,
  });
};
```

### Mutation Hooks

```typescript
// Create task
export const useCreateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTask,
    onMutate: async (newTask) => {
      // Optimistic update
      await queryClient.cancelQueries(['tasks', newTask.queueId]);
      const previous = queryClient.getQueryData(['tasks', newTask.queueId]);

      queryClient.setQueryData(['tasks', newTask.queueId], (old: Task[]) => [
        ...old,
        { ...newTask, id: 'temp-' + Date.now() }
      ]);

      return { previous };
    },
    onError: (err, newTask, context) => {
      queryClient.setQueryData(['tasks', newTask.queueId], context.previous);
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries(['tasks', variables.queueId]);
    },
  });
};

// Update task
export const useUpdateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateTask,
    onSuccess: (data) => {
      queryClient.setQueryData(['tasks', data.id], data);
      queryClient.invalidateQueries(['tasks', data.queueId]);
    },
  });
};

// Delete task
export const useDeleteTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTask,
    onSuccess: (_, deletedId) => {
      queryClient.removeQueries(['tasks', deletedId]);
      queryClient.invalidateQueries(['tasks']);
    },
  });
};
```

## Responsive Design

### Breakpoints (Tailwind)

```typescript
const screens = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};
```

### Responsive Classes

```tsx
<div className="
  grid
  grid-cols-1
  md:grid-cols-2
  lg:grid-cols-3
  xl:grid-cols-4
  gap-4
">
  {/* Queue columns */}
</div>
```

## Animations

Use Tailwind's built-in transitions and Framer Motion for complex animations:

```bash
npm install framer-motion
```

**Examples**:
- Task card hover effects
- Drawer slide-in animations
- Toast notifications
- Loading states
- Drag-and-drop feedback

## Loading States

### Skeleton Screens

```tsx
import { Skeleton } from "@/components/ui/skeleton";

function QueueSkeleton() {
  return (
    <div className="w-[280px] space-y-4 p-4">
      <Skeleton className="h-6 w-32" />
      <div className="space-y-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    </div>
  );
}
```

### Loading Indicators

- Skeleton screens for initial page load
- Spinner for button actions
- Shimmer effect for list items
- Progressive loading for images

## Error States

### Error Boundaries

```tsx
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <pre className="mt-2 text-sm text-muted-foreground">{error.message}</pre>
      <Button onClick={resetErrorBoundary} className="mt-4">
        Try again
      </Button>
    </div>
  );
}

<ErrorBoundary FallbackComponent={ErrorFallback}>
  <App />
</ErrorBoundary>
```

### Toast Notifications

```tsx
import { toast } from "@/components/ui/use-toast";

// Success
toast({
  title: "Task created",
  description: "Your task has been added successfully.",
});

// Error
toast({
  variant: "destructive",
  title: "Uh oh! Something went wrong.",
  description: "There was a problem with your request.",
});
```

## Accessibility

### ARIA Labels

```tsx
<button
  aria-label="Add new task"
  aria-describedby="add-task-description"
>
  <PlusIcon />
</button>
```

### Keyboard Navigation

- All interactive elements reachable via Tab
- Focus visible indicators
- Logical tab order
- Escape to close modals

### Screen Reader Support

- Semantic HTML elements
- ARIA roles where needed
- Alternative text for icons
- Status announcements for dynamic content

## Performance Optimization

### Code Splitting

```tsx
import { lazy, Suspense } from 'react';

const TaskDrawer = lazy(() => import('./components/TaskDrawer'));

<Suspense fallback={<Skeleton />}>
  <TaskDrawer />
</Suspense>
```

### Virtualization

For long lists, use `@tanstack/react-virtual`:

```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

const rowVirtualizer = useVirtualizer({
  count: tasks.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 64,
});
```

### Image Optimization

- Use WebP format with PNG fallback
- Lazy load images below fold
- Use appropriate sizes for different screens
- Leverage Cloudflare Image Resizing

## Testing

### Component Tests (Vitest + Testing Library)

```typescript
import { render, screen } from '@testing-library/react';
import { TaskCard } from './TaskCard';

test('renders task title', () => {
  render(<TaskCard task={mockTask} />);
  expect(screen.getByText('Test task')).toBeInTheDocument();
});

test('calls onClick when clicked', async () => {
  const handleClick = vi.fn();
  render(<TaskCard task={mockTask} onClick={handleClick} />);

  await userEvent.click(screen.getByRole('article'));
  expect(handleClick).toHaveBeenCalledWith(mockTask.id);
});
```

### Visual Regression Tests (Playwright)

```typescript
import { test, expect } from '@playwright/test';

test('dashboard layout matches snapshot', async ({ page }) => {
  await page.goto('/app');
  await expect(page).toHaveScreenshot('dashboard.png');
});
```
