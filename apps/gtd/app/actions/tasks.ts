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
