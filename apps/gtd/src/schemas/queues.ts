import { z } from "zod";

export const TaskCategorySchema = z.enum(["next", "waiting", "someday", "archive"]);
const NewTaskCategorySchema = TaskCategorySchema.exclude(["archive"]);
export type TaskCategory = z.infer<typeof TaskCategorySchema>;
export type NewTaskCategory = z.infer<typeof NewTaskCategorySchema>;

export const QueueSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9A-F]{6}$/i),
  position: z.number().int().min(0),
  createdAt: z.number().int().min(0),
  updatedAt: z.number().int().min(0),
  archivedAt: z.number().int().min(0).nullable(),
});
export type Queue = z.infer<typeof QueueSchema>;

export const TaskSchema = z.object({
  id: z.string().uuid(),
  queueId: z.string().uuid(),
  category: TaskCategorySchema,
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullable(),
  position: z.number().int().min(0),
  completed: z.boolean(),
  createdAt: z.number().int().min(0),
  updatedAt: z.number().int().min(0),
  archivedAt: z.number().int().min(0).nullable(),
});
export type Task = z.infer<typeof TaskSchema>;

export const CreateQueueRequestSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9A-F]{6}$/i),
});
export type CreateQueueRequest = z.infer<typeof CreateQueueRequestSchema>;

export const UpdateQueueRequestSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
    position: z.number().int().min(0).optional(),
    archivedAt: z.number().int().min(0).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });
export type UpdateQueueRequest = z.infer<typeof UpdateQueueRequestSchema>;

export const CreateTaskRequestSchema = z.object({
  category: TaskCategorySchema.exclude(["archive"]),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
});
export type CreateTaskRequest = z.infer<typeof CreateTaskRequestSchema>;

export const UpdateTaskRequestSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).optional(),
    category: TaskCategorySchema.optional(),
    completed: z.boolean().optional(),
    position: z.number().int().min(0).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });
export type UpdateTaskRequest = z.infer<typeof UpdateTaskRequestSchema>;

export const MoveTaskRequestSchema = z.object({
  targetQueueId: z.string().uuid().optional(),
  targetCategory: TaskCategorySchema.optional(),
  targetPosition: z.number().int().min(0).optional(),
});
export type MoveTaskRequest = z.infer<typeof MoveTaskRequestSchema>;

export const BatchTaskOperationSchema = z.object({
  operation: z.enum(["reorder", "move", "archive", "delete"]),
  taskIds: z.array(z.string().uuid()).min(1),
  targetQueueId: z.string().uuid().optional(),
  targetCategory: TaskCategorySchema.optional(),
  positions: z.array(z.number().int().min(0)).optional(),
});
export type BatchTaskOperation = z.infer<typeof BatchTaskOperationSchema>;

export const QueueListResponseSchema = z.object({
  data: z.object({
    queues: z.array(QueueSchema),
  }),
});
export type QueueListResponse = z.infer<typeof QueueListResponseSchema>;

export const QueueWithTasksSchema = z.object({
  queue: QueueSchema,
  tasks: z.array(TaskSchema),
});
export type QueueWithTasks = z.infer<typeof QueueWithTasksSchema>;

export const QueueDetailResponseSchema = z.object({
  data: QueueWithTasksSchema,
});
export type QueueDetailResponse = z.infer<typeof QueueDetailResponseSchema>;

export const TaskResponseSchema = z.object({
  data: z.object({
    task: TaskSchema,
  }),
});
export type TaskResponse = z.infer<typeof TaskResponseSchema>;

export const QueueResponseSchema = z.object({
  data: z.object({
    queue: QueueSchema,
  }),
});
export type QueueResponse = z.infer<typeof QueueResponseSchema>;

export const EmptyResponseSchema = z.object({
  data: z.object({
    success: z.boolean(),
  }),
});
export type EmptyResponse = z.infer<typeof EmptyResponseSchema>;

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;
