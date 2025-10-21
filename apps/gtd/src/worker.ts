/// <reference types="@cloudflare/workers-types" />

import type {
  DurableObjectNamespace,
  Fetcher,
} from "@cloudflare/workers-types";
import { z } from "zod";
import type { Env } from "./types/env";
import {
  ApiErrorSchema,
  BatchTaskOperationSchema,
  CreateQueueRequestSchema,
  CreateTaskRequestSchema,
  MoveTaskRequestSchema,
  QueueDetailResponseSchema,
  QueueListResponseSchema,
  QueueResponseSchema,
  QueueSchema,
  TaskResponseSchema,
  TaskSchema,
  UpdateQueueRequestSchema,
  UpdateTaskRequestSchema,
  EmptyResponseSchema,
} from "./schemas/queues";
import { QueueDO } from "./durable-objects/queue-do";
import { UserDO } from "./durable-objects/user-do";

const EnvSchema = z.object({
  ASSETS: z.custom<Fetcher>(),
  AUTH_URL: z.string().url().optional(),
  AUTH_SERVICE: z.custom<Fetcher>().optional(),
  USER_DO: z.custom<DurableObjectNamespace>(),
  QUEUE_DO: z.custom<DurableObjectNamespace>(),
  JWT_PUBLIC_KEY: z.string().optional(),
});

type RuntimeEnv = z.infer<typeof EnvSchema>;

const AuthResponseSchema = z.object({
  redirectUrl: z.string().optional(),
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
});

const AuthUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  preferences: z.record(z.any()).optional(),
});

const AuthUserResponseSchema = z.object({
  data: z.object({
    user: AuthUserSchema,
  }),
});

type AuthUser = z.infer<typeof AuthUserSchema>;

const QueueListBodySchema = z.object({
  queues: z.array(QueueSchema),
});

const QueueWrapperSchema = z.object({
  queue: QueueSchema,
});

const QueueDetailBodySchema = z.object({
  queue: QueueSchema,
  tasks: z.array(TaskSchema),
});

const TaskWrapperSchema = z.object({
  task: TaskSchema,
});

const TaskWrapperNullableSchema = z.object({
  task: TaskSchema.nullable(),
});

const TaskIndexSchema = z.object({
  queueId: z.string().uuid(),
});

const SuccessSchema = z.object({
  success: z.boolean(),
});

function success<T>(data: T, status = 200, schema?: z.ZodTypeAny): Response {
  const payload = { data };
  if (schema) {
    schema.parse(payload);
  }
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function failure(code: string, message: string, status: number): Response {
  return new Response(
    JSON.stringify({
      error: {
        code,
        message,
      },
    }),
    {
      status,
      headers: { "Content-Type": "application/json" },
    }
  );
}

function parseCookies(header: string | null): Record<string, string> {
  const cookies: Record<string, string> = {};

  if (!header) {
    return cookies;
  }

  for (const part of header.split(";")) {
    const [key, ...valueParts] = part.trim().split("=");
    if (!key || valueParts.length === 0) {
      continue;
    }
    cookies[key] = valueParts.join("=");
  }

  return cookies;
}

async function readJson(response: Response): Promise<any> {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function readRequestJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw failure("INVALID_JSON", "Invalid JSON body", 400);
  }
}

async function parseDoResponse<T>(
  response: Response,
  schema: z.ZodType<T>
): Promise<T> {
  const payload = await readJson(response);

  if (!response.ok) {
    if (payload) {
      const parsedError = ApiErrorSchema.safeParse(payload);
      if (parsedError.success) {
        throw failure(
          parsedError.data.error.code,
          parsedError.data.error.message,
          response.status
        );
      }
    }

    throw failure(
      "INTERNAL_ERROR",
      "Durable Object error",
      response.status || 500
    );
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw failure("INTERNAL_ERROR", "Invalid Durable Object response", 500);
  }

  return parsed.data;
}

async function fetchAuthUser(
  env: RuntimeEnv,
  accessToken: string
): Promise<AuthUser> {
  const headers = new Headers({
    Authorization: `Bearer ${accessToken}`,
  });

  let response: Response;
  if (env.AUTH_SERVICE) {
    const request = new Request("https://auth-service/api/auth/user", {
      method: "GET",
      headers,
    });
    response = await env.AUTH_SERVICE.fetch(request);
  } else if (env.AUTH_URL) {
    const url = new URL("/api/auth/user", env.AUTH_URL);
    response = await fetch(url.toString(), {
      method: "GET",
      headers,
    });
  } else {
    throw failure("SERVICE_UNAVAILABLE", "Auth service unavailable", 503);
  }

  const payload = await readJson(response);

  if (!response.ok) {
    if (payload) {
      const parsedError = ApiErrorSchema.safeParse(payload);
      if (parsedError.success) {
        throw failure(
          parsedError.data.error.code,
          parsedError.data.error.message,
          response.status
        );
      }
    }

    throw failure(
      "UNAUTHORIZED",
      "Authentication required",
      response.status || 401
    );
  }

  const parsed = AuthUserResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw failure("INTERNAL_ERROR", "Invalid auth response", 500);
  }

  return parsed.data.data.user;
}

async function getAuthenticatedUser(
  request: Request,
  env: RuntimeEnv
): Promise<AuthUser> {
  const cookies = parseCookies(request.headers.get("cookie"));
  const accessToken = cookies["access_token"];

  if (!accessToken) {
    throw failure("UNAUTHORIZED", "Missing access token", 401);
  }

  return fetchAuthUser(env, accessToken);
}

function ensureUuid(value: string, resource: string): string {
  const parsed = z.string().uuid().safeParse(value);
  if (!parsed.success) {
    throw failure("INVALID_ID", `Invalid ${resource} identifier`, 400);
  }

  return parsed.data;
}

function buildDoRequest(userId: string, init?: RequestInit): RequestInit {
  const headers = new Headers(init?.headers ?? {});
  headers.set("X-User-Id", userId);

  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return {
    ...init,
    headers,
  };
}

function userDoFetch(
  env: RuntimeEnv,
  userId: string,
  path: string,
  init?: RequestInit
) {
  const requestInit = buildDoRequest(userId, init);
  const stub = env.USER_DO.get(env.USER_DO.idFromName(userId));
  return stub.fetch(new Request(`https://user${path}`, requestInit));
}

function queueDoFetch(
  env: RuntimeEnv,
  queueId: string,
  userId: string,
  path: string,
  init?: RequestInit
) {
  const requestInit = buildDoRequest(userId, init);
  const stub = env.QUEUE_DO.get(env.QUEUE_DO.idFromName(queueId));
  return stub.fetch(new Request(`https://queue${path}`, requestInit));
}

async function resolveTaskQueueId(
  env: RuntimeEnv,
  userId: string,
  taskId: string
): Promise<string> {
  const response = await userDoFetch(env, userId, `/task-index/${taskId}`, {
    method: "GET",
  });
  const payload = await parseDoResponse(response, TaskIndexSchema);
  return payload.queueId;
}

async function listQueues(env: RuntimeEnv, user: AuthUser): Promise<Response> {
  const response = await userDoFetch(env, user.id, "/queues", {
    method: "GET",
  });
  const payload = await parseDoResponse(response, QueueListBodySchema);
  return success({ queues: payload.queues }, 200, QueueListResponseSchema);
}

async function createQueue(
  request: Request,
  env: RuntimeEnv,
  user: AuthUser
): Promise<Response> {
  const rawBody = await readRequestJson(request);
  const payload = CreateQueueRequestSchema.parse(rawBody);

  const userResponse = await userDoFetch(env, user.id, "/queues", {
    method: "POST",
    body: JSON.stringify({
      queueId: crypto.randomUUID(),
      name: payload.name,
      color: payload.color,
    }),
  });

  const created = await parseDoResponse(userResponse, QueueWrapperSchema);
  const queue = created.queue;

  try {
    const initResponse = await queueDoFetch(env, queue.id, user.id, "/init", {
      method: "POST",
      body: JSON.stringify(queue),
    });
    await parseDoResponse(initResponse, QueueWrapperSchema);
  } catch (error) {
    await userDoFetch(env, user.id, `/queues/${queue.id}`, {
      method: "DELETE",
    }).catch(() => undefined);
    throw error;
  }

  return success({ queue }, 201, QueueResponseSchema);
}

async function getQueue(
  queueId: string,
  env: RuntimeEnv,
  user: AuthUser
): Promise<Response> {
  const checkResponse = await userDoFetch(env, user.id, `/queues/${queueId}`, {
    method: "GET",
  });
  await parseDoResponse(checkResponse, QueueWrapperSchema);

  const queueResponse = await queueDoFetch(env, queueId, user.id, "/queue", {
    method: "GET",
  });
  const detail = await parseDoResponse(queueResponse, QueueDetailBodySchema);

  return success(detail, 200, QueueDetailResponseSchema);
}

async function updateQueue(
  queueId: string,
  request: Request,
  env: RuntimeEnv,
  user: AuthUser
): Promise<Response> {
  const rawBody = await readRequestJson(request);
  const updates = UpdateQueueRequestSchema.parse(rawBody);

  const userResponse = await userDoFetch(env, user.id, `/queues/${queueId}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
  const updated = await parseDoResponse(userResponse, QueueWrapperSchema);

  const queueResponse = await queueDoFetch(env, queueId, user.id, "/queue", {
    method: "PUT",
    body: JSON.stringify(updates),
  });
  await parseDoResponse(queueResponse, QueueWrapperSchema);

  return success({ queue: updated.queue }, 200, QueueResponseSchema);
}

async function deleteQueue(
  queueId: string,
  env: RuntimeEnv,
  user: AuthUser
): Promise<Response> {
  const queueResponse = await queueDoFetch(env, queueId, user.id, "/queue", {
    method: "DELETE",
  });
  await parseDoResponse(queueResponse, SuccessSchema);

  const userResponse = await userDoFetch(env, user.id, `/queues/${queueId}`, {
    method: "DELETE",
  });
  await parseDoResponse(userResponse, SuccessSchema);

  return success({ success: true }, 200, EmptyResponseSchema);
}

async function createTask(
  queueId: string,
  request: Request,
  env: RuntimeEnv,
  user: AuthUser
): Promise<Response> {
  const rawBody = await readRequestJson(request);
  const payload = CreateTaskRequestSchema.parse(rawBody);

  const queueCheck = await userDoFetch(env, user.id, `/queues/${queueId}`, {
    method: "GET",
  });
  await parseDoResponse(queueCheck, QueueWrapperSchema);

  const queueResponse = await queueDoFetch(env, queueId, user.id, "/tasks", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const created = await parseDoResponse(
    queueResponse,
    TaskWrapperNullableSchema
  );

  if (!created.task) {
    throw failure("INTERNAL_ERROR", "Task creation failed", 500);
  }

  const indexResponse = await userDoFetch(env, user.id, "/task-index", {
    method: "POST",
    body: JSON.stringify({ taskId: created.task.id, queueId }),
  });
  await parseDoResponse(indexResponse, SuccessSchema);

  return success({ task: created.task }, 201, TaskResponseSchema);
}

async function updateTask(
  taskId: string,
  request: Request,
  env: RuntimeEnv,
  user: AuthUser
): Promise<Response> {
  const rawBody = await readRequestJson(request);
  const updates = UpdateTaskRequestSchema.parse(rawBody);

  const queueId = await resolveTaskQueueId(env, user.id, taskId);

  const queueResponse = await queueDoFetch(
    env,
    queueId,
    user.id,
    `/tasks/${taskId}`,
    {
      method: "PUT",
      body: JSON.stringify(updates),
    }
  );
  const updated = await parseDoResponse(queueResponse, TaskWrapperSchema);

  return success({ task: updated.task }, 200, TaskResponseSchema);
}

async function deleteTask(
  taskId: string,
  env: RuntimeEnv,
  user: AuthUser
): Promise<Response> {
  const queueId = await resolveTaskQueueId(env, user.id, taskId);

  const queueResponse = await queueDoFetch(
    env,
    queueId,
    user.id,
    `/tasks/${taskId}`,
    {
      method: "DELETE",
    }
  );
  await parseDoResponse(queueResponse, SuccessSchema);

  const indexResponse = await userDoFetch(
    env,
    user.id,
    `/task-index/${taskId}`,
    {
      method: "DELETE",
    }
  );
  await parseDoResponse(indexResponse, SuccessSchema);

  return success({ success: true }, 200, EmptyResponseSchema);
}

async function moveTask(
  taskId: string,
  request: Request,
  env: RuntimeEnv,
  user: AuthUser
): Promise<Response> {
  const rawBody = await readRequestJson(request);
  const payload = MoveTaskRequestSchema.parse(rawBody);

  const currentQueueId = await resolveTaskQueueId(env, user.id, taskId);

  if (payload.targetQueueId && payload.targetQueueId !== currentQueueId) {
    return failure(
      "UNSUPPORTED",
      "Cross-queue moves are not yet supported",
      400
    );
  }

  const queueResponse = await queueDoFetch(
    env,
    currentQueueId,
    user.id,
    `/tasks/${taskId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  );
  const updated = await parseDoResponse(queueResponse, TaskWrapperSchema);

  return success({ task: updated.task }, 200, TaskResponseSchema);
}

async function batchTasks(
  request: Request,
  env: RuntimeEnv,
  user: AuthUser
): Promise<Response> {
  const rawBody = await readRequestJson(request);
  const payload = BatchTaskOperationSchema.parse(rawBody);

  if (payload.operation !== "reorder") {
    return failure("UNSUPPORTED", "Operation not implemented", 400);
  }

  const queueIds = await Promise.all(
    payload.taskIds.map((taskId) => resolveTaskQueueId(env, user.id, taskId))
  );

  const uniqueQueueIds = new Set(queueIds);
  if (uniqueQueueIds.size !== 1) {
    return failure(
      "INVALID_REQUEST",
      "Tasks must belong to the same queue",
      400
    );
  }

  const queueId = queueIds[0];

  const queueResponse = await queueDoFetch(
    env,
    queueId,
    user.id,
    "/tasks/batch",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
  await parseDoResponse(queueResponse, SuccessSchema);

  return success({ success: true }, 200, EmptyResponseSchema);
}

async function handleApplicationApi(
  request: Request,
  env: RuntimeEnv
): Promise<Response> {
  const url = new URL(request.url);
  const segments = url.pathname.split("/").filter(Boolean);

  if (segments.length < 2) {
    return failure("NOT_FOUND", "Endpoint not found", 404);
  }

  const user = await getAuthenticatedUser(request, env);
  const resource = segments[1];
  const rest = segments.slice(2);

  if (resource === "queues") {
    if (rest.length === 0) {
      if (request.method === "GET") {
        return listQueues(env, user);
      }
      if (request.method === "POST") {
        return createQueue(request, env, user);
      }
      return failure("METHOD_NOT_ALLOWED", "Method not allowed", 405);
    }

    const queueId = ensureUuid(rest[0], "queue");

    if (rest.length === 1) {
      if (request.method === "GET") {
        return getQueue(queueId, env, user);
      }
      if (request.method === "PUT") {
        return updateQueue(queueId, request, env, user);
      }
      if (request.method === "DELETE") {
        return deleteQueue(queueId, env, user);
      }
      return failure("METHOD_NOT_ALLOWED", "Method not allowed", 405);
    }

    if (rest.length === 2 && rest[1] === "tasks") {
      if (request.method === "POST") {
        return createTask(queueId, request, env, user);
      }
      return failure("METHOD_NOT_ALLOWED", "Method not allowed", 405);
    }

    return failure("NOT_FOUND", "Endpoint not found", 404);
  }

  if (resource === "tasks") {
    if (rest.length === 1 && rest[0] === "batch") {
      if (request.method === "POST") {
        return batchTasks(request, env, user);
      }
      return failure("METHOD_NOT_ALLOWED", "Method not allowed", 405);
    }

    if (rest.length === 1) {
      const taskId = ensureUuid(rest[0], "task");

      if (request.method === "PUT") {
        return updateTask(taskId, request, env, user);
      }
      if (request.method === "DELETE") {
        return deleteTask(taskId, env, user);
      }
      if (request.method === "PATCH") {
        return moveTask(taskId, request, env, user);
      }

      return failure("METHOD_NOT_ALLOWED", "Method not allowed", 405);
    }

    return failure("NOT_FOUND", "Endpoint not found", 404);
  }

  return failure("NOT_FOUND", "Endpoint not found", 404);
}

const worker: ExportedHandler<Env> = {
  async fetch(
    request: Request,
    rawEnv: Env,
    _ctx: ExecutionContext
  ): Promise<Response> {
    const parsedEnv = EnvSchema.safeParse(rawEnv);

    if (!parsedEnv.success) {
      console.error(
        "Invalid environment configuration",
        parsedEnv.error.flatten()
      );
      return failure("CONFIG_ERROR", "Invalid environment configuration", 500);
    }

    const env = parsedEnv.data;
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (
      pathname.startsWith("/api/queues") ||
      pathname.startsWith("/api/tasks")
    ) {
      try {
        return await handleApplicationApi(request, env);
      } catch (error) {
        if (error instanceof Response) {
          return error;
        }
        console.error("Unhandled application API error", error);
        return failure("INTERNAL_ERROR", "Unexpected error", 500);
      }
    }

    if (pathname === "/api/auth/cookie-check") {
      const cookieHeader = request.headers.get("cookie") || "";
      const accessToken = cookieHeader
        .split("; ")
        .find((row) => row.startsWith("access_token="))
        ?.split("=")[1];

      return new Response(null, {
        status: accessToken ? 200 : 401,
      });
    }

    if (pathname === "/api/auth/logout") {
      return new Response(null, {
        status: 200,
        headers: {
          "Set-Cookie":
            "access_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0, refresh_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0",
        },
      });
    }

    if (pathname.startsWith("/api/auth/")) {
      let response: Response;

      if (env.AUTH_SERVICE) {
        const authRequest = new Request(request.url, {
          method: request.method,
          headers: request.headers,
          body:
            request.method !== "GET" && request.method !== "HEAD"
              ? await request.text()
              : undefined,
        });

        response = await env.AUTH_SERVICE.fetch(authRequest);
      } else {
        const authUrl = env.AUTH_URL ?? "http://localhost:8787";
        const redirectUrl = new URL(pathname + url.search, authUrl);

        const headers = new Headers();
        const headersToForward = [
          "content-type",
          "authorization",
          "cookie",
          "origin",
          "referer",
          "user-agent",
        ];

        for (const header of headersToForward) {
          const value = request.headers.get(header);
          if (value) {
            headers.set(header, value);
          }
        }

        let bodyContent: string | undefined;
        if (request.method !== "GET" && request.method !== "HEAD") {
          bodyContent = await request.text();
        }

        const fetchOptions: RequestInit = {
          method: request.method,
          headers,
        };

        if (bodyContent !== undefined) {
          fetchOptions.body = bodyContent;
        }

        response = await fetch(redirectUrl.toString(), fetchOptions);
      }

      const responseText = await response.text();
      const contentType = response.headers.get("content-type");

      if (response.redirected) {
        return response;
      }

      if (contentType?.includes("application/json")) {
        const rawJson = JSON.parse(responseText);
        const parseResult = AuthResponseSchema.safeParse(rawJson);

        if (parseResult.success) {
          const json = parseResult.data;

          if (json.redirectUrl && json.accessToken && json.refreshToken) {
            const headers = new Headers();
            headers.set("Location", json.redirectUrl);
            headers.append(
              "Set-Cookie",
              `access_token=${json.accessToken}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=3600`
            );
            headers.append(
              "Set-Cookie",
              `refresh_token=${json.refreshToken}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`
            );
            return new Response(null, {
              status: 302,
              statusText: "Found",
              headers,
            });
          }
        }

        return new Response(JSON.stringify(rawJson), {
          status: response.status,
          statusText: response.statusText,
          headers: new Headers({
            "Content-Type": "application/json",
          }),
        });
      }

      if (contentType?.includes("text/html")) {
        return new Response(responseText, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        });
      }

      return new Response(responseText, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    }

    if (pathname === "/api/hello") {
      if (request.method === "GET") {
        return Response.json({
          message: "Hello, world!",
          method: "GET",
        });
      }

      if (request.method === "PUT") {
        return Response.json({
          message: "Hello, world!",
          method: "PUT",
        });
      }
    }

    if (pathname.startsWith("/api/hello/")) {
      const name = pathname.replace("/api/hello/", "");
      return Response.json({
        message: `Hello, ${name}!`,
      });
    }

    return env.ASSETS.fetch(request);
  },
};

export { UserDO, QueueDO };
export default worker;
