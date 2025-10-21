import type {
  DurableObjectState,
  SqlStorage,
} from "@cloudflare/workers-types";
import { z } from "zod";
import type { Env } from "../types/env";
import {
  BatchTaskOperationSchema,
  CreateTaskRequestSchema,
  MoveTaskRequestSchema,
  QueueSchema,
  TaskSchema,
  UpdateQueueRequestSchema,
  UpdateTaskRequestSchema,
  type TaskCategory,
} from "../schemas/queues";

const QueueRowSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  name: z.string(),
  color: z.string(),
  position: z.number(),
  created_at: z.number(),
  updated_at: z.number(),
  archived_at: z.number().nullable(),
});

type QueueRow = z.infer<typeof QueueRowSchema>;

type TaskRow = {
  id: string;
  queue_id: string;
  category: string;
  title: string;
  description: string | null;
  position: number;
  completed: number;
  created_at: number;
  updated_at: number;
  archived_at: number | null;
};

type JsonBody = Record<string, unknown>;

type TaskWithQueue = z.infer<typeof TaskSchema>;

export class QueueDO {
  private readonly state: DurableObjectState;
  private readonly sql: SqlStorage;
  private userId?: string;
  private queueId?: string;

  constructor(state: DurableObjectState, _env: Env) {
    this.state = state;
    this.sql = state.storage.sql;

    state.blockConcurrencyWhile(async () => {
      this.initializeTables();
      const meta = await state.storage.get<{ queueId: string; userId: string }>(
        "meta"
      );
      if (meta) {
        this.queueId = meta.queueId;
        this.userId = meta.userId;
      }
    });
  }

  private initializeTables() {
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS queue (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        color TEXT NOT NULL,
        position INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        archived_at INTEGER
      )
    `);

    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        queue_id TEXT NOT NULL,
        category TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        position INTEGER NOT NULL,
        completed INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        archived_at INTEGER,
        FOREIGN KEY(queue_id) REFERENCES queue(id)
      )
    `);

    this.sql.exec(`
      CREATE INDEX IF NOT EXISTS idx_tasks_queue_category
      ON tasks(queue_id, category, position)
    `);
  }

  private json(body: JsonBody, init?: ResponseInit) {
    return new Response(JSON.stringify(body), {
      status: init?.status ?? 200,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
  }

  private mapQueue(row: QueueRow) {
    return QueueSchema.parse({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      color: row.color,
      position: row.position,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      archivedAt: row.archived_at,
    });
  }

  private mapTask(row: TaskRow) {
    return TaskSchema.parse({
      id: row.id,
      queueId: row.queue_id,
      category: row.category,
      title: row.title,
      description: row.description,
      position: row.position,
      completed: row.completed === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      archivedAt: row.archived_at,
    });
  }

  private async ensureUser(request: Request): Promise<string> {
    const incomingUserId = request.headers.get("X-User-Id");
    if (!incomingUserId) {
      throw this.json(
        { error: { code: "UNAUTHORIZED", message: "Missing user identifier" } },
        { status: 401 }
      );
    }

    if (!this.userId) {
      this.userId = incomingUserId;
      await this.state.storage.put("meta", {
        queueId: this.queueId,
        userId: incomingUserId,
      });
    }

    if (this.userId !== incomingUserId) {
      throw this.json(
        { error: { code: "UNAUTHORIZED", message: "Mismatched user context" } },
        { status: 401 }
      );
    }

    return this.userId;
  }

  private ensureQueueRecord(): QueueRow {
    const rows = this.sql
      .exec(
        `SELECT id, user_id, name, color, position, created_at, updated_at, archived_at FROM queue LIMIT 1`
      )
      .toArray() as QueueRow[];

    if (rows.length === 0) {
      throw this.json(
        { error: { code: "NOT_INITIALIZED", message: "Queue not initialized" } },
        { status: 404 }
      );
    }

    return rows[0];
  }

  private async handleInit(request: Request): Promise<Response> {
    const payload = QueueSchema.parse(await request.json());

    this.queueId = payload.id;
    this.userId = payload.userId;

    this.sql.exec(
      `INSERT OR REPLACE INTO queue (id, user_id, name, color, position, created_at, updated_at, archived_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)` ,
      payload.id,
      payload.userId,
      payload.name,
      payload.color,
      payload.position,
      payload.createdAt,
      payload.updatedAt,
      payload.archivedAt
    );

    await this.state.storage.put("meta", {
      queueId: payload.id,
      userId: payload.userId,
    });

    return this.json({ queue: payload }, { status: 201 });
  }

  private handleGetQueue(): Response {
    const row = this.ensureQueueRecord();

    const taskRows = this.sql
      .exec(
        `SELECT id, queue_id, category, title, description, position, completed, created_at, updated_at, archived_at
         FROM tasks
         WHERE queue_id = ? AND archived_at IS NULL
         ORDER BY category, position ASC` ,
        row.id
      )
      .toArray() as TaskRow[];

    const tasks = taskRows.map((task) => this.mapTask(task));

    return this.json({
      queue: this.mapQueue(row),
      tasks,
    });
  }

  private async handleUpdateQueue(request: Request): Promise<Response> {
    const row = this.ensureQueueRecord();
    const parsed = UpdateQueueRequestSchema.parse(await request.json());

    const now = Date.now();
    const nextName = parsed.name ?? row.name;
    const nextColor = parsed.color ?? row.color;
    const nextPosition = parsed.position ?? row.position;

    this.sql.exec(
      `UPDATE queue SET name = ?, color = ?, position = ?, updated_at = ? WHERE id = ?` ,
      nextName,
      nextColor,
      nextPosition,
      now,
      row.id
    );

    return this.json({
      queue: this.mapQueue({
        ...row,
        name: nextName,
        color: nextColor,
        position: nextPosition,
        updated_at: now,
      }),
    });
  }

  private handleArchiveQueue(): Response {
    const row = this.ensureQueueRecord();
    const now = Date.now();

    this.sql.exec(
      `UPDATE queue SET archived_at = ?, updated_at = ? WHERE id = ? AND archived_at IS NULL` ,
      now,
      now,
      row.id
    );

    const delta = this.sql
      .exec(`SELECT changes() as change_count`)
      .toArray() as Array<{ change_count: number }>;

    if ((delta[0]?.change_count ?? 0) === 0) {
      return this.json(
        { error: { code: "NOT_FOUND", message: "Queue already archived" } },
        { status: 404 }
      );
    }

    return this.json({ success: true });
  }

  private getNextTaskPosition(queueId: string, category: TaskCategory): number {
    const rows = this.sql
      .exec(
        `SELECT MAX(position) as max_position FROM tasks WHERE queue_id = ? AND category = ? AND archived_at IS NULL`,
        queueId,
        category
      )
      .toArray() as Array<{ max_position: number | null }>;

    const maxPosition = rows[0]?.max_position ?? null;
    return maxPosition === null ? 0 : maxPosition + 1;
  }

  private getTask(taskId: string): TaskWithQueue | null {
    const rows = this.sql
      .exec(
        `SELECT id, queue_id, category, title, description, position, completed, created_at, updated_at, archived_at
         FROM tasks WHERE id = ?`,
        taskId
      )
      .toArray() as TaskRow[];

    if (rows.length === 0) {
      return null;
    }

    return this.mapTask(rows[0]);
  }

  private handleGetTask(taskId: string): Response {
    const task = this.getTask(taskId);

    if (!task || task.archivedAt !== null) {
      return this.json(
        { error: { code: "NOT_FOUND", message: "Task not found" } },
        { status: 404 }
      );
    }

    return this.json({ task });
  }

  private async handleCreateTask(request: Request): Promise<Response> {
    const queue = this.ensureQueueRecord();
    const payload = CreateTaskRequestSchema.parse(await request.json());

    const now = Date.now();
    const taskId = crypto.randomUUID();
    const position = this.getNextTaskPosition(queue.id, payload.category as TaskCategory);

    this.sql.exec(
      `INSERT INTO tasks (id, queue_id, category, title, description, position, completed, created_at, updated_at, archived_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)` ,
      taskId,
      queue.id,
      payload.category,
      payload.title,
      payload.description ?? null,
      position,
      0,
      now,
      now
    );

    const task = this.getTask(taskId);

    return this.json({ task }, { status: 201 });
  }

  private async handleUpdateTask(taskId: string, request: Request): Promise<Response> {
    const existing = this.getTask(taskId);

    if (!existing) {
      return this.json(
        { error: { code: "NOT_FOUND", message: "Task not found" } },
        { status: 404 }
      );
    }

    const payload = UpdateTaskRequestSchema.parse(await request.json());
    const now = Date.now();

    let nextPosition = payload.position;

    if (payload.category && payload.category !== existing.category && nextPosition === undefined) {
      nextPosition = this.getNextTaskPosition(existing.queueId, payload.category as TaskCategory);
    }

    const fields: string[] = [];
    const args: Array<string | number | null> = [];

    if (payload.title !== undefined) {
      fields.push("title = ?");
      args.push(payload.title);
    }

    if (payload.description !== undefined) {
      fields.push("description = ?");
      args.push(payload.description ?? null);
    }

    if (payload.category !== undefined) {
      fields.push("category = ?");
      args.push(payload.category);
    }

    if (payload.completed !== undefined) {
      fields.push("completed = ?");
      args.push(payload.completed ? 1 : 0);
    }

    if (nextPosition !== undefined) {
      fields.push("position = ?");
      args.push(nextPosition);
    }

    fields.push("updated_at = ?");
    args.push(now);
    args.push(taskId);

    this.sql.exec(
      `UPDATE tasks SET ${fields.join(", ")} WHERE id = ?` ,
      ...args
    );

    const task = this.getTask(taskId);
    if (!task) {
      return this.json(
        { error: { code: "NOT_FOUND", message: "Task not found after update" } },
        { status: 404 }
      );
    }

    return this.json({ task });
  }

  private handleDeleteTask(taskId: string): Response {
    const existing = this.getTask(taskId);

    if (!existing) {
      return this.json(
        { error: { code: "NOT_FOUND", message: "Task not found" } },
        { status: 404 }
      );
    }

    const now = Date.now();

    this.sql.exec(
      `UPDATE tasks SET archived_at = ?, updated_at = ? WHERE id = ? AND archived_at IS NULL` ,
      now,
      now,
      taskId
    );

    const delta = this.sql
      .exec(`SELECT changes() as change_count`)
      .toArray() as Array<{ change_count: number }>;

    if ((delta[0]?.change_count ?? 0) === 0) {
      return this.json(
        { error: { code: "NOT_FOUND", message: "Task already archived" } },
        { status: 404 }
      );
    }

    return this.json({ success: true });
  }

  private async handleMoveTask(taskId: string, request: Request): Promise<Response> {
    const existing = this.getTask(taskId);

    if (!existing) {
      return this.json(
        { error: { code: "NOT_FOUND", message: "Task not found" } },
        { status: 404 }
      );
    }

    const payload = MoveTaskRequestSchema.parse(await request.json());

    if (payload.targetQueueId && payload.targetQueueId !== existing.queueId) {
      return this.json(
        { error: { code: "UNSUPPORTED", message: "Cross-queue moves handled by worker" } },
        { status: 400 }
      );
    }

    const category = payload.targetCategory ?? existing.category;
    const position =
      payload.targetPosition ?? this.getNextTaskPosition(existing.queueId, category as TaskCategory);

    const now = Date.now();

    this.sql.exec(
      `UPDATE tasks SET category = ?, position = ?, updated_at = ? WHERE id = ?` ,
      category,
      position,
      now,
      taskId
    );

    const task = this.getTask(taskId);

    return this.json({ task });
  }

  private async handleBatch(request: Request): Promise<Response> {
    const body = await request.json();
    const payload = BatchTaskOperationSchema.parse(body);

    switch (payload.operation) {
      case "reorder": {
        if (!payload.positions || payload.positions.length !== payload.taskIds.length) {
          return this.json(
            { error: { code: "INVALID_REQUEST", message: "Positions array required" } },
            { status: 400 }
          );
        }

        const now = Date.now();

        for (let index = 0; index < payload.taskIds.length; index++) {
          const taskId = payload.taskIds[index] ?? "";
          const position = payload.positions[index] ?? 0;

          this.sql.exec(
            `UPDATE tasks SET position = ?, updated_at = ? WHERE id = ?` ,
            position,
            now,
            taskId
          );
        }

        return this.json({ success: true });
      }
      default: {
        return this.json(
          { error: { code: "UNSUPPORTED", message: "Operation not implemented" } },
          { status: 400 }
        );
      }
    }
  }

  async fetch(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const segments = url.pathname.split("/").filter(Boolean);

      if (segments.length === 0) {
        return this.json({ status: "ok" });
      }

      if (segments[0] === "init" && request.method === "POST") {
        return this.handleInit(request);
      }

      await this.ensureUser(request);

      if (segments[0] === "queue") {
        if (request.method === "GET") {
          return this.handleGetQueue();
        }

        if (request.method === "PUT") {
          return this.handleUpdateQueue(request);
        }

        if (request.method === "DELETE") {
          return this.handleArchiveQueue();
        }
      }

      if (segments[0] === "tasks") {
        if (segments[1] === "batch" && request.method === "POST") {
          return this.handleBatch(request);
        }

        if (segments.length === 1 && request.method === "POST") {
          return this.handleCreateTask(request);
        }

        if (segments.length === 2) {
          const taskId = segments[1];

          if (request.method === "GET") {
            return this.handleGetTask(taskId);
          }

          if (request.method === "PUT") {
            return this.handleUpdateTask(taskId, request);
          }

          if (request.method === "DELETE") {
            return this.handleDeleteTask(taskId);
          }

          if (request.method === "PATCH") {
            return this.handleMoveTask(taskId, request);
          }
        }
      }

      return this.json(
        { error: { code: "NOT_FOUND", message: "Endpoint not found" } },
        { status: 404 }
      );
    } catch (error) {
      if (error instanceof Response) {
        return error;
      }

      return this.json(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: error instanceof Error ? error.message : "Unexpected error",
          },
        },
        { status: 500 }
      );
    }
  }
}
