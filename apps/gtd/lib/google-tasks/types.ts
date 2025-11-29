import { z } from "zod";

// Task status enum
export const TaskStatusSchema = z.enum(["needsAction", "completed"]);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

// Individual task from Google Tasks API
export const TaskSchema = z.object({
  kind: z.literal("tasks#task").optional(),
  id: z.string(),
  etag: z.string().optional(),
  title: z.string(),
  updated: z.string().optional(),
  selfLink: z.string().optional(),
  parent: z.string().optional(),
  position: z.string().optional(),
  notes: z.string().optional(),
  status: TaskStatusSchema.optional(),
  due: z.string().optional(), // RFC 3339 timestamp
  completed: z.string().optional(), // RFC 3339 timestamp
  deleted: z.boolean().optional(),
  hidden: z.boolean().optional(),
  links: z
    .array(
      z.object({
        type: z.string().optional(),
        description: z.string().optional(),
        link: z.string().optional(),
      })
    )
    .optional(),
});

export type Task = z.infer<typeof TaskSchema>;

// Task list (collection of tasks)
export const TaskListSchema = z.object({
  kind: z.literal("tasks#taskList").optional(),
  id: z.string(),
  etag: z.string().optional(),
  title: z.string(),
  updated: z.string().optional(),
  selfLink: z.string().optional(),
});

export type TaskList = z.infer<typeof TaskListSchema>;

// Response from listing task lists
export const TaskListsResponseSchema = z.object({
  kind: z.literal("tasks#taskLists").optional(),
  etag: z.string().optional(),
  nextPageToken: z.string().optional(),
  items: z.array(TaskListSchema).optional(),
});

export type TaskListsResponse = z.infer<typeof TaskListsResponseSchema>;

// Response from listing tasks
export const TasksResponseSchema = z.object({
  kind: z.literal("tasks#tasks").optional(),
  etag: z.string().optional(),
  nextPageToken: z.string().optional(),
  items: z.array(TaskSchema).optional(),
});

export type TasksResponse = z.infer<typeof TasksResponseSchema>;

// Input for creating/updating a task
export const TaskInputSchema = z.object({
  title: z.string().min(1),
  notes: z.string().optional(),
  due: z.string().optional(), // RFC 3339 timestamp
  status: TaskStatusSchema.optional(),
});

export type TaskInput = z.infer<typeof TaskInputSchema>;

// Helper type for tasks with due dates parsed
export type TaskWithParsedDate = Task & {
  dueDate: Date | null;
};

// Parse a task's due date string to a Date object
export function parseTaskDueDate(task: Task): TaskWithParsedDate {
  return {
    ...task,
    dueDate: task.due ? new Date(task.due) : null,
  };
}

// Group tasks by date (YYYY-MM-DD format)
export function groupTasksByDate(
  tasks: TaskWithParsedDate[]
): Map<string, TaskWithParsedDate[]> {
  const grouped = new Map<string, TaskWithParsedDate[]>();

  for (const task of tasks) {
    if (task.dueDate) {
      const dateKey = task.dueDate.toISOString().split("T")[0];
      const existing = grouped.get(dateKey) ?? [];
      existing.push(task);
      grouped.set(dateKey, existing);
    }
  }

  return grouped;
}

// Get tasks for a specific date
export function getTasksForDate(
  tasks: TaskWithParsedDate[],
  date: Date
): TaskWithParsedDate[] {
  const dateKey = date.toISOString().split("T")[0];
  return tasks.filter((task) => {
    if (!task.dueDate) return false;
    return task.dueDate.toISOString().split("T")[0] === dateKey;
  });
}

// Get tasks without a due date (for "Someday" section)
export function getTasksWithoutDueDate(
  tasks: TaskWithParsedDate[]
): TaskWithParsedDate[] {
  return tasks.filter((task) => !task.dueDate);
}
