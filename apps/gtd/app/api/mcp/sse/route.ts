import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { findUserIdByApiKeyHash } from "@/lib/firebase/mcp";
import { getConnectedAccountsAdmin } from "@/lib/firebase/accounts-admin";
import { getValidAccessTokenServer } from "@/lib/firebase/account-refresh-server";
import { createTasksClient, fetchAllTasks, createTask, updateTask, moveTask, completeTask, uncompleteTask, ensureGTDListsExist } from "@/lib/google-tasks/client";
import { createCalendarClient, fetchAllCalendarEvents, createCalendarEvent, updateCalendarEvent } from "@/lib/google-calendar/client";

/**
 * Hashes the API key using SHA-256
 */
function hashApiKey(apiKey: string): string {
  return crypto.createHash("sha256").update(apiKey).digest("hex");
}

/**
 * Helper to handle MCP tool logic
 */
async function handleMcpTool(userId: string, tool: string, args: any) {
  // Get user's connected accounts - prefer primary account (index 0) for MCP
  const accounts = await getConnectedAccountsAdmin(userId);
  const primaryAccount = accounts.find((a) => a.colorIndex === 0) || accounts[0];

  if (!primaryAccount) {
    throw new Error("No connected account found. Please sign in to the GTD app and sync your primary account.");
  }

  // Ensure we have a valid access token
  const accessToken = await getValidAccessTokenServer(userId, primaryAccount);
  if (!accessToken) {
    throw new Error("Failed to authenticate with Google");
  }

  const tasksClient = createTasksClient(accessToken);
  const gtdLists = await ensureGTDListsExist(tasksClient);
  const gtdListIds = [gtdLists.active.id, gtdLists.next.id, gtdLists.waiting.id, gtdLists.someday.id];

  /**
   * Helper to validate access to a task.
   * Access is allowed if:
   * 1. The list is a standard GTD list.
   * 2. OR the task has a due date (making it part of the schedule view).
   */
  const validateTaskAccess = async (listId: string, taskId?: string) => {
    if (gtdListIds.includes(listId)) return;
    
    if (taskId) {
      try {
        const task = await tasksClient.tasks.get({ tasklist: listId, task: taskId });
        if (task.data.due) return;
      } catch (e) {
        // Task not found or other API error
      }
    }
    
    throw new Error(`Access denied. Task list ${listId} is not a GTD list and the task is not scheduled (has no due date).`);
  };

  switch (tool) {
    case "list_tasks": {
      const results = await fetchAllTasks(tasksClient, args);
      // Filter results: Include all tasks from GTD lists, but only scheduled tasks from other lists
      const filteredResults = results.map(result => {
        const isGTD = gtdListIds.includes(result.taskList.id);
        if (isGTD) return result;
        return {
          ...result,
          tasks: result.tasks.filter(t => !!t.due)
        };
      }).filter(r => r.tasks.length > 0 || gtdListIds.includes(r.taskList.id));
      
      return filteredResults;
    }
    case "get_gtd_lists": {
      return gtdLists;
    }
    case "create_task": {
      // New creation logic: [GTD] Active if has due date, else [GTD] Waiting
      const targetListId = args.task.due ? gtdLists.active.id : gtdLists.waiting.id;
      return await createTask(tasksClient, targetListId, args.task);
    }
    case "update_task": {
      await validateTaskAccess(args.taskListId, args.taskId);
      return await updateTask(tasksClient, args.taskListId, args.taskId, args.task);
    }
    case "move_task": {
      await validateTaskAccess(args.taskListId, args.taskId);
      // Ensure destination is a valid GTD list
      if (args.options?.destinationTasklist && !gtdListIds.includes(args.options.destinationTasklist)) {
        throw new Error("Access denied. Tasks can only be moved into protected GTD lists.");
      }
      return await moveTask(tasksClient, args.taskListId, args.taskId, args.options);
    }
    case "complete_task": {
      await validateTaskAccess(args.taskListId, args.taskId);
      return await completeTask(tasksClient, args.taskListId, args.taskId);
    }
    case "uncomplete_task": {
      await validateTaskAccess(args.taskListId, args.taskId);
      return await uncompleteTask(tasksClient, args.taskListId, args.taskId);
    }
    case "list_calendar_events": {
      const calendarClient = createCalendarClient(accessToken);
      return await fetchAllCalendarEvents(calendarClient, args);
    }
    case "create_calendar_event": {
      const calendarClient = createCalendarClient(accessToken);
      return await createCalendarEvent(calendarClient, args.calendarId || "primary", args.event);
    }
    case "update_calendar_event": {
      const calendarClient = createCalendarClient(accessToken);
      return await updateCalendarEvent(calendarClient, args.calendarId || "primary", args.eventId, args.event);
    }
    default:
      throw new Error(`Unknown tool: ${tool}`);
  }
}

/**
 * GET handler for server discovery/status
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    name: "gtd-mcp-server",
    version: "1.0.0",
    status: "active",
    mcpTransport: "http",
    message: "This is an MCP HTTP endpoint. Use POST with JSON-RPC 2.0 payloads."
  });
}

/**
 * POST handler for direct tool calls
 * Supports both simple JSON and JSON-RPC 2.0
 */
export async function POST(request: NextRequest) {
  let apiKey = request.headers.get("X-MCP-API-Key");
  
  // Fallback to Authorization header
  if (!apiKey) {
    const authHeader = request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      apiKey = authHeader.substring(7);
    }
  }

  // Fallback to query parameters
  if (!apiKey) {
    const { searchParams } = new URL(request.url);
    apiKey = searchParams.get("apiKey") || searchParams.get("token");
  }

  try {
    const body = await request.json();
    const { method, params, id } = body;

    // Handle JSON-RPC response wrapper
    const respond = (result: any) => {
      if (id !== undefined) {
        return NextResponse.json({ jsonrpc: "2.0", id, result });
      }
      return NextResponse.json(result);
    };

    // Special case: Allow 'initialize' without API key to facilitate discovery
    // This prevents some clients (like Gemini) from incorrectly assuming OAuth is needed
    if (method === "initialize") {
      return respond({
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: {}
        },
        serverInfo: {
          name: "gtd-mcp-server",
          version: "1.0.0"
        }
      });
    }

    // All other methods require a valid API key
    if (!apiKey) {
      return NextResponse.json({ 
        jsonrpc: "2.0",
        id,
        error: { code: -32001, message: "Missing API Key. Provide Authorization: Bearer <key> header." }
      }, { status: 401 });
    }

    const hashedKey = hashApiKey(apiKey);
    const userId = await findUserIdByApiKeyHash(hashedKey);

    if (!userId) {
      return NextResponse.json({ 
        jsonrpc: "2.0",
        id,
        error: { code: -32001, message: "Invalid API Key" } 
      }, { status: 401 });
    }

    if (method === "notifications/initialized") {
      return new Response(null, { status: 204 });
    }

    if (method === "list_tools" || method === "tools/list") {
      return respond({
        tools: [
          {
            name: "list_tasks",
            description: "List all tasks across all GTD lists or from a specific list",
            inputSchema: {
              type: "object",
              properties: {
                showCompleted: { type: "boolean" },
                dueMin: { type: "string", description: "RFC 3339 timestamp" },
                dueMax: { type: "string", description: "RFC 3339 timestamp" },
              },
            },
          },
          {
            name: "get_gtd_lists",
            description: "Get the IDs of the standard GTD lists (Active, Next, Waiting, Someday)",
            inputSchema: { type: "object", properties: {} },
          },
          {
            name: "create_task",
            description: "Create a new task. Automatically routed: [GTD] Active if due date is present, else [GTD] Waiting.",
            inputSchema: {
              type: "object",
              properties: {
                taskListId: { type: "string", description: "Optional. Will be overridden by GTD routing logic." },
                task: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    notes: { type: "string" },
                    due: { type: "string", description: "RFC 3339 timestamp" },
                  },
                  required: ["title"],
                },
              },
              required: ["task"],
            },
          },
          {
            name: "update_task",
            description: "Update an existing task",
            inputSchema: {
              type: "object",
              properties: {
                taskListId: { type: "string" },
                taskId: { type: "string" },
                task: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    notes: { type: "string" },
                    due: { type: "string", description: "RFC 3339 timestamp" },
                    status: { type: "string", enum: ["needsAction", "completed"] },
                  },
                },
              },
              required: ["taskListId", "taskId", "task"],
            },
          },
          {
            name: "move_task",
            description: "Move a task within a list or to a different list",
            inputSchema: {
              type: "object",
              properties: {
                taskListId: { type: "string" },
                taskId: { type: "string" },
                options: {
                  type: "object",
                  properties: {
                    parent: { type: "string", description: "Parent task ID for subtasks" },
                    previous: { type: "string", description: "Previous task ID for reordering" },
                    destinationTasklist: { type: "string", description: "Destination task list ID" },
                  },
                },
              },
              required: ["taskListId", "taskId"],
            },
          },
          {
            name: "complete_task",
            description: "Mark a task as completed",
            inputSchema: {
              type: "object",
              properties: {
                taskListId: { type: "string" },
                taskId: { type: "string" },
              },
              required: ["taskListId", "taskId"],
            },
          },
          {
            name: "uncomplete_task",
            description: "Mark a task as incomplete (needsAction)",
            inputSchema: {
              type: "object",
              properties: {
                taskListId: { type: "string" },
                taskId: { type: "string" },
              },
              required: ["taskListId", "taskId"],
            },
          },
          {
            name: "list_calendar_events",
            description: "List calendar events for a specific date range",
            inputSchema: {
              type: "object",
              properties: {
                calendarId: { type: "string", default: "primary" },
                timeMin: { type: "string", description: "RFC 3339 timestamp" },
                timeMax: { type: "string", description: "RFC 3339 timestamp" },
              },
              required: ["timeMin", "timeMax"],
            },
          },
          {
            name: "create_calendar_event",
            description: "Create a new calendar event",
            inputSchema: {
              type: "object",
              properties: {
                calendarId: { type: "string", default: "primary" },
                event: {
                  type: "object",
                  properties: {
                    summary: { type: "string" },
                    description: { type: "string" },
                    start: {
                      type: "object",
                      properties: {
                        dateTime: { type: "string", description: "RFC 3339 timestamp" },
                        date: { type: "string", description: "YYYY-MM-DD" },
                      },
                    },
                    end: {
                      type: "object",
                      properties: {
                        dateTime: { type: "string", description: "RFC 3339 timestamp" },
                        date: { type: "string", description: "YYYY-MM-DD" },
                      },
                    },
                  },
                  required: ["summary", "start", "end"],
                },
              },
              required: ["event"],
            },
          },
          {
            name: "update_calendar_event",
            description: "Update an existing calendar event",
            inputSchema: {
              type: "object",
              properties: {
                calendarId: { type: "string", default: "primary" },
                eventId: { type: "string" },
                event: {
                  type: "object",
                  properties: {
                    summary: { type: "string" },
                    description: { type: "string" },
                    start: {
                      type: "object",
                      properties: {
                        dateTime: { type: "string", description: "RFC 3339 timestamp" },
                        date: { type: "string", description: "YYYY-MM-DD" },
                      },
                    },
                    end: {
                      type: "object",
                      properties: {
                        dateTime: { type: "string", description: "RFC 3339 timestamp" },
                        date: { type: "string", description: "YYYY-MM-DD" },
                      },
                    },
                  },
                },
              },
              required: ["eventId", "event"],
            },
          },
        ]
      });
    }

    if (method === "call_tool" || method === "tools/call") {
      const { name, arguments: args } = params;
      const data = await handleMcpTool(userId, name, args);
      return respond({
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      });
    }

    return NextResponse.json({ 
      jsonrpc: "2.0", 
      id, 
      error: { code: -32601, message: `Method not found: ${method}` } 
    }, { status: 404 });
  } catch (error) {
    console.error(`[MCP API] Error:`, error);
    return NextResponse.json({ 
      jsonrpc: "2.0",
      id: (error as any).id,
      error: { 
        code: -32603, 
        message: error instanceof Error ? error.message : "Internal Server Error" 
      }
    }, { status: 500 });
  }
}
