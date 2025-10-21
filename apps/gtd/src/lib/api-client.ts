import { z } from "zod";
import {
  ApiErrorSchema,
  BatchTaskOperationSchema,
  CreateQueueRequestSchema,
  CreateTaskRequestSchema,
  EmptyResponseSchema,
  MoveTaskRequestSchema,
  QueueDetailResponseSchema,
  QueueResponseSchema,
  QueueSchema,
  QueueListResponseSchema,
  TaskResponseSchema,
  TaskSchema,
  UpdateQueueRequestSchema,
  UpdateTaskRequestSchema,
} from "../schemas/queues";

export type Queue = z.infer<typeof QueueSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type CreateQueueRequest = z.infer<typeof CreateQueueRequestSchema>;
export type UpdateQueueRequest = z.infer<typeof UpdateQueueRequestSchema>;
export type CreateTaskRequest = z.infer<typeof CreateTaskRequestSchema>;
export type UpdateTaskRequest = z.infer<typeof UpdateTaskRequestSchema>;
export type MoveTaskRequest = z.infer<typeof MoveTaskRequestSchema>;
export type BatchTaskOperation = z.infer<typeof BatchTaskOperationSchema>;

export class ApiClientError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export async function getQueues(): Promise<Queue[]> {
  const random = Math.random().toString(36).substring(2, 15);
  console.log("random", random);
  console.time(`getQueues ${random}`);
  const result = await requestJson(QueueListResponseSchema, "/api/queues");
  console.timeEnd(`getQueues ${random}`);
  return result.data.queues;
}

export async function getQueue(
  queueId: string
): Promise<{ queue: Queue; tasks: Task[] }> {
  const result = await requestJson(
    QueueDetailResponseSchema,
    `/api/queues/${queueId}`
  );
  return result.data;
}

export async function createQueue(payload: CreateQueueRequest): Promise<Queue> {
  const result = await requestJson(QueueResponseSchema, "/api/queues", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return result.data.queue;
}

export async function updateQueue(
  queueId: string,
  updates: UpdateQueueRequest
): Promise<Queue> {
  const result = await requestJson(
    QueueResponseSchema,
    `/api/queues/${queueId}`,
    {
      method: "PUT",
      body: JSON.stringify(updates),
    }
  );
  return result.data.queue;
}

export async function deleteQueue(queueId: string): Promise<void> {
  await requestJson(EmptyResponseSchema, `/api/queues/${queueId}`, {
    method: "DELETE",
  });
}

export async function createTask(
  queueId: string,
  payload: CreateTaskRequest
): Promise<Task> {
  const result = await requestJson(
    TaskResponseSchema,
    `/api/queues/${queueId}/tasks`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
  return result.data.task;
}

export async function updateTask(
  taskId: string,
  payload: UpdateTaskRequest
): Promise<Task> {
  const result = await requestJson(TaskResponseSchema, `/api/tasks/${taskId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return result.data.task;
}

export async function deleteTask(taskId: string): Promise<void> {
  await requestJson(EmptyResponseSchema, `/api/tasks/${taskId}`, {
    method: "DELETE",
  });
}

export async function moveTask(
  taskId: string,
  payload: MoveTaskRequest
): Promise<Task> {
  const result = await requestJson(TaskResponseSchema, `/api/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return result.data.task;
}

export async function reorderTasks(
  operation: BatchTaskOperation
): Promise<void> {
  await requestJson(EmptyResponseSchema, "/api/tasks/batch", {
    method: "POST",
    body: JSON.stringify(operation),
  });
}

async function requestJson<T extends z.ZodTypeAny>(
  schema: T,
  input: RequestInfo,
  init?: RequestInit
): Promise<z.infer<T>> {
  const headers = new Headers(init?.headers ?? {});

  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(input, {
    ...init,
    headers,
  });

  const payload = await response.json().catch(() => undefined);

  if (!response.ok) {
    if (payload) {
      const parsedError = ApiErrorSchema.safeParse(payload);
      if (parsedError.success) {
        throw new ApiClientError(
          parsedError.data.error.code,
          parsedError.data.error.message,
          response.status
        );
      }
    }

    throw new ApiClientError(
      "UNKNOWN_ERROR",
      "Request failed",
      response.status
    );
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new ApiClientError(
      "INVALID_RESPONSE",
      "Failed to parse API response",
      response.status
    );
  }

  return parsed.data;
}
