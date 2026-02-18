import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { findUserIdByApiKeyHash } from "@/lib/firebase/mcp";
import { getConnectedAccountsAdmin } from "@/lib/firebase/accounts-admin";
import { getValidAccessTokenServer } from "@/lib/firebase/account-refresh-server";
import { createTasksClient, fetchAllTasks, createTask, updateTask, moveTask, completeTask, uncompleteTask, ensureGTDListsExist } from "@/lib/google-tasks/client";
import { createCalendarClient, fetchAllCalendarEvents, createCalendarEvent, updateCalendarEvent } from "@/lib/google-calendar/client";

/**
 * Hashes the API key using SHA-256 to match stored hashes
 */
function hashApiKey(apiKey: string): string {
  return crypto.createHash("sha256").update(apiKey).digest("hex");
}

/**
 * Dedicated API route for the MCP server.
 * Authenticates using X-MCP-API-Key and executes GTD operations.
 */
export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("X-MCP-API-Key");
  if (!apiKey) {
    return NextResponse.json({ error: "Missing API Key" }, { status: 401 });
  }

  const hashedKey = hashApiKey(apiKey);
  const userId = await findUserIdByApiKeyHash(hashedKey);

  if (!userId) {
    return NextResponse.json({ error: "Invalid API Key" }, { status: 401 });
  }

  // Get user's connected accounts - prefer primary account (index 0) for MCP
  const accounts = await getConnectedAccountsAdmin(userId);
  const primaryAccount = accounts.find((a) => a.colorIndex === 0) || accounts[0];

  if (!primaryAccount) {
    return NextResponse.json({ 
      error: "No connected account found. Please sign in to the GTD app and sync your primary account." 
    }, { status: 404 });
  }

  // Ensure we have a valid access token
  const accessToken = await getValidAccessTokenServer(userId, primaryAccount);
  if (!accessToken) {
    return NextResponse.json({ error: "Failed to authenticate with Google" }, { status: 401 });
  }

  const tasksClient = createTasksClient(accessToken);
  const gtdLists = await ensureGTDListsExist(tasksClient);
  const gtdListIds = [gtdLists.active.id, gtdLists.next.id, gtdLists.waiting.id, gtdLists.someday.id];

  const body = await request.json();
  const { tool, arguments: args } = body;

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

  try {
    console.log(`[MCP API] Executing tool: ${tool} for user ${userId}`);

    switch (tool) {
      // --- Task Management Tools ---
      
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
        
        return NextResponse.json({ success: true, data: filteredResults });
      }

      case "get_gtd_lists": {
        return NextResponse.json({ success: true, data: gtdLists });
      }

      case "create_task": {
        // New creation logic: [GTD] Active if has due date, else [GTD] Waiting
        const targetListId = args.task.due ? gtdLists.active.id : gtdLists.waiting.id;
        const newTask = await createTask(tasksClient, targetListId, args.task);
        return NextResponse.json({ success: true, data: newTask });
      }

      case "update_task": {
        await validateTaskAccess(args.taskListId, args.taskId);
        const updatedTask = await updateTask(tasksClient, args.taskListId, args.taskId, args.task);
        return NextResponse.json({ success: true, data: updatedTask });
      }

      case "move_task": {
        await validateTaskAccess(args.taskListId, args.taskId);
        // Ensure destination is a valid GTD list
        if (args.options?.destinationTasklist && !gtdListIds.includes(args.options.destinationTasklist)) {
          throw new Error("Access denied. Tasks can only be moved into protected GTD lists.");
        }
        const movedTask = await moveTask(tasksClient, args.taskListId, args.taskId, args.options);
        return NextResponse.json({ success: true, data: movedTask });
      }

      case "complete_task": {
        await validateTaskAccess(args.taskListId, args.taskId);
        const completedTask = await completeTask(tasksClient, args.taskListId, args.taskId);
        return NextResponse.json({ success: true, data: completedTask });
      }

      case "uncomplete_task": {
        await validateTaskAccess(args.taskListId, args.taskId);
        const uncompletedTask = await uncompleteTask(tasksClient, args.taskListId, args.taskId);
        return NextResponse.json({ success: true, data: uncompletedTask });
      }

      // --- Calendar Management Tools ---

      case "list_calendar_events": {
        const calendarClient = createCalendarClient(accessToken);
        const events = await fetchAllCalendarEvents(calendarClient, args);
        return NextResponse.json({ success: true, data: events });
      }

      case "create_calendar_event": {
        const calendarClient = createCalendarClient(accessToken);
        const newEvent = await createCalendarEvent(calendarClient, args.calendarId || "primary", args.event);
        return NextResponse.json({ success: true, data: newEvent });
      }

      case "update_calendar_event": {
        const calendarClient = createCalendarClient(accessToken);
        const updatedEvent = await updateCalendarEvent(calendarClient, args.calendarId || "primary", args.eventId, args.event);
        return NextResponse.json({ success: true, data: updatedEvent });
      }

      default:
        return NextResponse.json({ error: `Unknown tool: ${tool}` }, { status: 400 });
    }
  } catch (error) {
    console.error(`[MCP API] Error:`, error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Internal Server Error" 
    }, { status: 500 });
  }
}
