"use server";

import { getAccessToken, isTokenExpired } from "./session";
import {
  createTasksClient,
  fetchTaskLists,
  fetchTasks,
  fetchAllTasks,
  createTask as createTaskApi,
  updateTask as updateTaskApi,
  deleteTask as deleteTaskApi,
  completeTask as completeTaskApi,
  uncompleteTask as uncompleteTaskApi,
  moveTask as moveTaskApi,
  createSubtask as createSubtaskApi,
  ensureGTDListsExist,
  isGTDList,
  getTaskListDisplayName,
} from "@/lib/google-tasks/client";
import {
  type TaskList,
  type Task,
  type TaskInput,
  type TaskWithParsedDate,
  parseTaskDueDate,
} from "@/lib/google-tasks/types";

type TasksResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; needsReauth?: boolean };

type AuthError = { error: string; needsReauth: boolean };
type AuthSuccess = { client: ReturnType<typeof createTasksClient> };

// GTD Lists structure returned from ensureGTDLists
export type GTDLists = {
  active: TaskList;
  next: TaskList;
  waiting: TaskList;
  someday: TaskList;
};

// Extended task list info with display name and GTD status
export type TaskListWithMeta = TaskList & {
  displayName: string;
  isGTD: boolean;
};

async function getAuthenticatedClient(): Promise<AuthError | AuthSuccess> {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    return { error: "Not authenticated", needsReauth: true };
  }

  const expired = await isTokenExpired();
  if (expired) {
    return { error: "Session expired", needsReauth: true };
  }

  return { client: createTasksClient(accessToken) };
}

/**
 * Ensures GTD lists exist in Google Tasks and returns their IDs.
 * Creates [GTD] Next, [GTD] Waiting, [GTD] Someday lists if missing.
 */
export async function ensureGTDLists(): Promise<TasksResult<GTDLists>> {
  const result = await getAuthenticatedClient();

  if ("error" in result) {
    return { success: false, error: result.error, needsReauth: result.needsReauth };
  }

  try {
    const gtdLists = await ensureGTDListsExist(result.client);
    return { success: true, data: gtdLists };
  } catch (error) {
    console.error("Failed to ensure GTD lists:", error);
    return { success: false, error: "Failed to ensure GTD lists exist" };
  }
}

export async function getTaskLists(): Promise<TasksResult<TaskList[]>> {
  const result = await getAuthenticatedClient();

  if ("error" in result) {
    return { success: false, error: result.error, needsReauth: result.needsReauth };
  }

  try {
    const taskLists = await fetchTaskLists(result.client);
    return { success: true, data: taskLists };
  } catch (error) {
    console.error("Failed to fetch task lists:", error);
    return { success: false, error: "Failed to fetch task lists" };
  }
}

/**
 * Get task lists with metadata (display name and GTD status)
 */
export async function getTaskListsWithMeta(): Promise<TasksResult<TaskListWithMeta[]>> {
  const result = await getAuthenticatedClient();

  if ("error" in result) {
    return { success: false, error: result.error, needsReauth: result.needsReauth };
  }

  try {
    const taskLists = await fetchTaskLists(result.client);
    const listsWithMeta: TaskListWithMeta[] = taskLists.map((list) => ({
      ...list,
      displayName: getTaskListDisplayName(list),
      isGTD: isGTDList(list),
    }));
    return { success: true, data: listsWithMeta };
  } catch (error) {
    console.error("Failed to fetch task lists with meta:", error);
    return { success: false, error: "Failed to fetch task lists" };
  }
}

export async function getTasks(
  taskListId: string,
  options?: {
    showCompleted?: boolean;
    dueMin?: string;
    dueMax?: string;
  }
): Promise<TasksResult<TaskWithParsedDate[]>> {
  const result = await getAuthenticatedClient();

  if ("error" in result) {
    return { success: false, error: result.error, needsReauth: result.needsReauth };
  }

  try {
    const tasks = await fetchTasks(result.client, taskListId, options);
    const parsedTasks = tasks.map(parseTaskDueDate);
    return { success: true, data: parsedTasks };
  } catch (error) {
    console.error("Failed to fetch tasks:", error);
    return { success: false, error: "Failed to fetch tasks" };
  }
}

export async function getAllTasks(options?: {
  showCompleted?: boolean;
  dueMin?: string;
  dueMax?: string;
}): Promise<
  TasksResult<{ taskList: TaskList; tasks: TaskWithParsedDate[] }[]>
> {
  const result = await getAuthenticatedClient();

  if ("error" in result) {
    return { success: false, error: result.error, needsReauth: result.needsReauth };
  }

  try {
    const allTasks = await fetchAllTasks(result.client, options);
    const parsedResults = allTasks.map(({ taskList, tasks }) => ({
      taskList,
      tasks: tasks.map(parseTaskDueDate),
    }));
    return { success: true, data: parsedResults };
  } catch (error) {
    console.error("Failed to fetch all tasks:", error);
    return { success: false, error: "Failed to fetch all tasks" };
  }
}

export async function createTask(
  taskListId: string,
  task: TaskInput
): Promise<TasksResult<Task>> {
  const result = await getAuthenticatedClient();

  if ("error" in result) {
    return { success: false, error: result.error, needsReauth: result.needsReauth };
  }

  try {
    const newTask = await createTaskApi(result.client, taskListId, task);
    return { success: true, data: newTask };
  } catch (error) {
    console.error("Failed to create task:", error);
    return { success: false, error: "Failed to create task" };
  }
}

export async function updateTask(
  taskListId: string,
  taskId: string,
  task: Partial<TaskInput>
): Promise<TasksResult<Task>> {
  const result = await getAuthenticatedClient();

  if ("error" in result) {
    return { success: false, error: result.error, needsReauth: result.needsReauth };
  }

  try {
    const updatedTask = await updateTaskApi(
      result.client,
      taskListId,
      taskId,
      task
    );
    return { success: true, data: updatedTask };
  } catch (error) {
    console.error("Failed to update task:", error);
    return { success: false, error: "Failed to update task" };
  }
}

export async function deleteTask(
  taskListId: string,
  taskId: string
): Promise<TasksResult<void>> {
  const result = await getAuthenticatedClient();

  if ("error" in result) {
    return { success: false, error: result.error, needsReauth: result.needsReauth };
  }

  try {
    await deleteTaskApi(result.client, taskListId, taskId);
    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to delete task:", error);
    return { success: false, error: "Failed to delete task" };
  }
}

export async function completeTask(
  taskListId: string,
  taskId: string
): Promise<TasksResult<Task>> {
  const result = await getAuthenticatedClient();

  if ("error" in result) {
    return { success: false, error: result.error, needsReauth: result.needsReauth };
  }

  try {
    const completedTask = await completeTaskApi(
      result.client,
      taskListId,
      taskId
    );
    return { success: true, data: completedTask };
  } catch (error) {
    console.error("Failed to complete task:", error);
    return { success: false, error: "Failed to complete task" };
  }
}

export async function uncompleteTask(
  taskListId: string,
  taskId: string
): Promise<TasksResult<Task>> {
  const result = await getAuthenticatedClient();

  if ("error" in result) {
    return { success: false, error: result.error, needsReauth: result.needsReauth };
  }

  try {
    const uncompletedTask = await uncompleteTaskApi(
      result.client,
      taskListId,
      taskId
    );
    return { success: true, data: uncompletedTask };
  } catch (error) {
    console.error("Failed to uncomplete task:", error);
    return { success: false, error: "Failed to uncomplete task" };
  }
}

/**
 * Convert a date string to RFC 3339 format for Google Tasks API.
 * Handles both YYYY-MM-DD and full ISO strings.
 */
function toRfc3339(dateStr?: string): string | undefined {
  if (!dateStr) return undefined;
  // If it's already a full ISO string, return as-is
  if (dateStr.includes("T")) return dateStr;
  // Otherwise, it's YYYY-MM-DD format, add time component (midnight UTC)
  return `${dateStr}T00:00:00.000Z`;
}

/**
 * Move multiple tasks to a destination list.
 * Since Google Tasks API doesn't support cross-list moves,
 * this creates tasks in the destination and deletes from source.
 * If a task is already in the destination list, it just updates the due date.
 */
export async function moveTasksToList(
  tasks: { listId: string; taskId: string; title: string; notes?: string; due?: string }[],
  destinationListId: string
): Promise<TasksResult<{ moved: number; failed: number }>> {
  const result = await getAuthenticatedClient();

  if ("error" in result) {
    return { success: false, error: result.error, needsReauth: result.needsReauth };
  }

  let moved = 0;
  let failed = 0;

  for (const task of tasks) {
    try {
      const dueRfc3339 = toRfc3339(task.due);

      // If already in destination list, just update the due date
      if (task.listId === destinationListId) {
        await updateTaskApi(result.client, task.listId, task.taskId, {
          due: dueRfc3339,
        });
        moved++;
        continue;
      }

      // Create in destination list
      await createTaskApi(result.client, destinationListId, {
        title: task.title,
        notes: task.notes,
        due: dueRfc3339,
      });

      // Delete from source list
      await deleteTaskApi(result.client, task.listId, task.taskId);

      moved++;
    } catch (error) {
      console.error(`Failed to move task ${task.taskId}:`, error);
      failed++;
    }
  }

  return { success: true, data: { moved, failed } };
}

/**
 * Delete multiple tasks across lists.
 */
export async function deleteTasks(
  tasks: { listId: string; taskId: string }[]
): Promise<TasksResult<{ deleted: number; failed: number }>> {
  const result = await getAuthenticatedClient();

  if ("error" in result) {
    return { success: false, error: result.error, needsReauth: result.needsReauth };
  }

  let deleted = 0;
  let failed = 0;

  for (const task of tasks) {
    try {
      await deleteTaskApi(result.client, task.listId, task.taskId);
      deleted++;
    } catch (error) {
      console.error(`Failed to delete task ${task.taskId}:`, error);
      failed++;
    }
  }

  return { success: true, data: { deleted, failed } };
}

/**
 * Move a task within a list (reorder, set parent for subtasks) or to a different list.
 * Use this for:
 * - Making a task a subtask (set parent)
 * - Reordering tasks within a list (set previous)
 * - Moving tasks between lists (set destinationTasklist) - note: recurrent tasks cannot be moved between lists
 */
export async function moveTask(
  taskListId: string,
  taskId: string,
  options?: {
    parent?: string;
    previous?: string;
    destinationTasklist?: string;
  }
): Promise<TasksResult<Task>> {
  const result = await getAuthenticatedClient();

  if ("error" in result) {
    return { success: false, error: result.error, needsReauth: result.needsReauth };
  }

  try {
    const movedTask = await moveTaskApi(result.client, taskListId, taskId, options);
    return { success: true, data: movedTask };
  } catch (error) {
    console.error("Failed to move task:", error);
    return { success: false, error: "Failed to move task" };
  }
}

/**
 * Create a subtask under a parent task.
 */
export async function createSubtask(
  taskListId: string,
  parentTaskId: string,
  task: TaskInput
): Promise<TasksResult<Task>> {
  const result = await getAuthenticatedClient();

  if ("error" in result) {
    return { success: false, error: result.error, needsReauth: result.needsReauth };
  }

  try {
    const newSubtask = await createSubtaskApi(result.client, taskListId, parentTaskId, task);
    return { success: true, data: newSubtask };
  } catch (error) {
    console.error("Failed to create subtask:", error);
    return { success: false, error: "Failed to create subtask" };
  }
}
