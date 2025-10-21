import type {
  DurableObjectState,
  SqlStorage,
} from "@cloudflare/workers-types";
import { z } from "zod";
import type { Env } from "../types/env";
import { QueueSchema } from "../schemas/queues";

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

const CreateQueuePayloadSchema = z.object({
  queueId: z.string().uuid(),
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9A-F]{6}$/i),
});

const UpdateQueuePayloadSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  position: z.number().int().min(0).optional(),
});

const TaskIndexPayloadSchema = z.object({
  taskId: z.string().uuid(),
  queueId: z.string().uuid(),
});

type QueueRow = z.infer<typeof QueueRowSchema>;

type TaskIndexPayload = z.infer<typeof TaskIndexPayloadSchema>;

type JsonInput = Record<string, unknown>;

type DurableResponse = Response | Promise<Response>;

export class UserDO {
  private readonly state: DurableObjectState;
  private sql: SqlStorage;
  private userId?: string;

  constructor(state: DurableObjectState, _env: Env) {
    this.state = state;
    this.sql = state.storage.sql;

  state.blockConcurrencyWhile(async () => {
      this.initializeTables();
      const storedUserId = await state.storage.get<string>("userId");
      if (storedUserId) {
        this.userId = storedUserId;
      }
    });
  }

  private initializeTables() {
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS queues (
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
      CREATE INDEX IF NOT EXISTS idx_queues_user_position
      ON queues(user_id, position)
    `);

    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS task_index (
        task_id TEXT PRIMARY KEY,
        queue_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
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

  private async ensureUser(request: Request): Promise<string> {
    const headerUserId = request.headers.get("X-User-Id");
    if (!headerUserId) {
      throw new Response(
        JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Missing user identifier" } }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!this.userId) {
      this.userId = headerUserId;
  await this.state.storage.put("userId", headerUserId);
    }

    if (this.userId !== headerUserId) {
      throw new Response(
        JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Mismatched user identifier" } }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    return this.userId;
  }

  private json(data: JsonInput, init?: ResponseInit) {
    return new Response(JSON.stringify(data), {
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      status: init?.status ?? 200,
    });
  }

  private getNextQueuePosition(userId: string): number {
    const result = this.sql
      .exec(
        `SELECT MAX(position) as max_position FROM queues WHERE user_id = ? AND archived_at IS NULL`,
        userId
      )
      .toArray() as Array<{ max_position: number | null }>;

    const maxPosition = result[0]?.max_position ?? null;
    return maxPosition === null ? 0 : maxPosition + 1;
  }

  private handleListQueues(userId: string): Response {
    const rows = this.sql
      .exec(
        `SELECT id, user_id, name, color, position, created_at, updated_at, archived_at
         FROM queues
         WHERE user_id = ? AND archived_at IS NULL
         ORDER BY position ASC`,
        userId
      )
      .toArray() as QueueRow[];

    const queues = rows.map((row) => this.mapQueue(row));
    return this.json({ queues });
  }

  private handleGetQueue(userId: string, queueId: string): Response {
    const rows = this.sql
      .exec(
        `SELECT id, user_id, name, color, position, created_at, updated_at, archived_at
         FROM queues
         WHERE user_id = ? AND id = ?`,
        userId,
        queueId
      )
      .toArray() as QueueRow[];

    if (rows.length === 0) {
      return this.json(
        { error: { code: "NOT_FOUND", message: "Queue not found" } },
        { status: 404 }
      );
    }

    const queue = rows[0];

    if (queue.archived_at !== null) {
      return this.json(
        { error: { code: "NOT_FOUND", message: "Queue not found" } },
        { status: 404 }
      );
    }

    return this.json({ queue: this.mapQueue(queue) });
  }

  private handleCreateQueue(userId: string, payload: unknown): Response {
    const parsed = CreateQueuePayloadSchema.parse(payload);

    const now = Date.now();
    const position = this.getNextQueuePosition(userId);

    this.sql.exec(
      `INSERT INTO queues (id, user_id, name, color, position, created_at, updated_at, archived_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`,
      parsed.queueId,
      userId,
      parsed.name,
      parsed.color,
      position,
      now,
      now
    );

    const queue = QueueSchema.parse({
      id: parsed.queueId,
      userId,
      name: parsed.name,
      color: parsed.color,
      position,
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
    });

    return this.json({ queue }, { status: 201 });
  }

  private handleUpdateQueue(userId: string, queueId: string, payload: unknown): Response {
    const parsed = UpdateQueuePayloadSchema.parse(payload);

    const rows = this.sql
      .exec(
        `SELECT id, user_id, name, color, position, created_at, updated_at, archived_at
         FROM queues
         WHERE user_id = ? AND id = ?`,
        userId,
        queueId
      )
      .toArray() as QueueRow[];

    if (rows.length === 0) {
      return this.json(
        { error: { code: "NOT_FOUND", message: "Queue not found" } },
        { status: 404 }
      );
    }

    const row = rows[0];
    const now = Date.now();

    const name = parsed.name ?? row.name;
    const color = parsed.color ?? row.color;
    const position = parsed.position ?? row.position;

    this.sql.exec(
      `UPDATE queues
       SET name = ?, color = ?, position = ?, updated_at = ?
       WHERE user_id = ? AND id = ?`,
      name,
      color,
      position,
      now,
      userId,
      queueId
    );

    const queue = QueueSchema.parse({
      id: row.id,
      userId,
      name,
      color,
      position,
      createdAt: row.created_at,
      updatedAt: now,
      archivedAt: row.archived_at,
    });

    return this.json({ queue });
  }

  private handleArchiveQueue(userId: string, queueId: string): Response {
    const now = Date.now();
    this.sql.exec(
      `UPDATE queues
       SET archived_at = ?, updated_at = ?
       WHERE user_id = ? AND id = ? AND archived_at IS NULL`,
      now,
      now,
      userId,
      queueId
    );

    const delta = this.sql
      .exec(`SELECT changes() as change_count`)
      .toArray() as Array<{ change_count: number }>;

    if ((delta[0]?.change_count ?? 0) === 0) {
      return this.json(
        { error: { code: "NOT_FOUND", message: "Queue not found" } },
        { status: 404 }
      );
    }

    return this.json({ success: true });
  }

  private handleTaskIndexUpsert(payload: unknown): Response {
    const parsed = TaskIndexPayloadSchema.parse(payload);
    const now = Date.now();

    this.sql.exec(
      `INSERT INTO task_index (task_id, queue_id, created_at, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(task_id) DO UPDATE SET queue_id = excluded.queue_id, updated_at = excluded.updated_at`,
      parsed.taskId,
      parsed.queueId,
      now,
      now
    );

    return this.json({ success: true }, { status: 201 });
  }

  private handleTaskIndexGet(taskId: string): Response {
    const rows = this.sql
      .exec(
        `SELECT queue_id FROM task_index WHERE task_id = ?`,
        taskId
      )
      .toArray() as Array<{ queue_id: string }>;

    if (rows.length === 0) {
      return this.json(
        { error: { code: "NOT_FOUND", message: "Task mapping not found" } },
        { status: 404 }
      );
    }

    return this.json({ queueId: rows[0].queue_id });
  }

  private handleTaskIndexDelete(taskId: string): Response {
    this.sql.exec(
      `DELETE FROM task_index WHERE task_id = ?`,
      taskId
    );

    const delta = this.sql
      .exec(`SELECT changes() as change_count`)
      .toArray() as Array<{ change_count: number }>;

    if ((delta[0]?.change_count ?? 0) === 0) {
      return this.json(
        { error: { code: "NOT_FOUND", message: "Task mapping not found" } },
        { status: 404 }
      );
    }

    return this.json({ success: true });
  }

  async fetch(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const segments = url.pathname.split("/").filter(Boolean);

      // Allow init request to set user id
      const userId = await this.ensureUser(request);

      if (segments.length === 0) {
        return this.json({ status: "ok" });
      }

      if (segments[0] === "queues") {
        if (segments.length === 1 && request.method === "GET") {
          return this.handleListQueues(userId);
        }

        if (segments.length === 1 && request.method === "POST") {
          const payload = await request.json();
          return this.handleCreateQueue(userId, payload);
        }

        if (segments.length === 2) {
          const queueId = segments[1];

          if (request.method === "GET") {
            return this.handleGetQueue(userId, queueId);
          }

          if (request.method === "PUT") {
            const payload = await request.json();
            return this.handleUpdateQueue(userId, queueId, payload);
          }

          if (request.method === "DELETE") {
            return this.handleArchiveQueue(userId, queueId);
          }
        }
      }

      if (segments[0] === "task-index") {
        if (request.method === "POST") {
          const payload = await request.json();
          return this.handleTaskIndexUpsert(payload);
        }

        if (segments.length === 2) {
          const taskId = segments[1];

          if (request.method === "GET") {
            return this.handleTaskIndexGet(taskId);
          }

          if (request.method === "DELETE") {
            return this.handleTaskIndexDelete(taskId);
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
