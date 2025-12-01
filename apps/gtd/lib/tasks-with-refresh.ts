"use client";

/**
 * Client-side wrappers for server actions that automatically handle token refresh.
 * 
 * When a server action returns `needsReauth: true`, these wrappers will:
 * 1. Trigger a single token refresh (coordinated via token-refresh.ts)
 * 2. Retry the operation once after successful refresh
 * 
 * This eliminates the need for manual refresh handling throughout the app.
 */

import { withAutoRefresh } from "@/lib/token-refresh";
import {
  getAllTasks as getAllTasksAction,
  ensureGTDLists as ensureGTDListsAction,
  completeTask as completeTaskAction,
  uncompleteTask as uncompleteTaskAction,
  deleteTask as deleteTaskAction,
  updateTask as updateTaskAction,
  createTask as createTaskAction,
  moveTasksToList as moveTasksToListAction,
  deleteTasks as deleteTasksAction,
  getTaskLists as getTaskListsAction,
  getTaskListsWithMeta as getTaskListsWithMetaAction,
  getTasks as getTasksAction,
  moveTask as moveTaskAction,
  createSubtask as createSubtaskAction,
  type GTDLists,
  type TaskListWithMeta,
} from "@/app/actions/tasks";
import type { Task, TaskList, TaskInput, TaskWithParsedDate } from "@/lib/google-tasks/types";

type TasksResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; needsReauth?: boolean };

// Re-export types for convenience
export type { GTDLists, TaskListWithMeta };

/**
 * Get all tasks with automatic token refresh on expiration.
 */
export async function getAllTasks(options?: {
  showCompleted?: boolean;
  dueMin?: string;
  dueMax?: string;
}): Promise<TasksResult<{ taskList: TaskList; tasks: TaskWithParsedDate[] }[]>> {
  return withAutoRefresh(() => getAllTasksAction(options));
}

/**
 * Ensure GTD lists exist with automatic token refresh on expiration.
 */
export async function ensureGTDLists(): Promise<TasksResult<GTDLists>> {
  return withAutoRefresh(() => ensureGTDListsAction());
}

/**
 * Complete a task with automatic token refresh on expiration.
 */
export async function completeTask(
  taskListId: string,
  taskId: string
): Promise<TasksResult<Task>> {
  return withAutoRefresh(() => completeTaskAction(taskListId, taskId));
}

/**
 * Uncomplete a task with automatic token refresh on expiration.
 */
export async function uncompleteTask(
  taskListId: string,
  taskId: string
): Promise<TasksResult<Task>> {
  return withAutoRefresh(() => uncompleteTaskAction(taskListId, taskId));
}

/**
 * Delete a task with automatic token refresh on expiration.
 */
export async function deleteTask(
  taskListId: string,
  taskId: string
): Promise<TasksResult<void>> {
  return withAutoRefresh(() => deleteTaskAction(taskListId, taskId));
}

/**
 * Update a task with automatic token refresh on expiration.
 */
export async function updateTask(
  taskListId: string,
  taskId: string,
  task: Partial<TaskInput>
): Promise<TasksResult<Task>> {
  return withAutoRefresh(() => updateTaskAction(taskListId, taskId, task));
}

/**
 * Create a task with automatic token refresh on expiration.
 */
export async function createTask(
  taskListId: string,
  task: TaskInput
): Promise<TasksResult<Task>> {
  return withAutoRefresh(() => createTaskAction(taskListId, task));
}

/**
 * Move tasks to a list with automatic token refresh on expiration.
 */
export async function moveTasksToList(
  tasks: { listId: string; taskId: string; title: string; notes?: string; due?: string }[],
  destinationListId: string
): Promise<TasksResult<{ moved: number; failed: number }>> {
  return withAutoRefresh(() => moveTasksToListAction(tasks, destinationListId));
}

/**
 * Delete multiple tasks with automatic token refresh on expiration.
 */
export async function deleteTasks(
  tasks: { listId: string; taskId: string }[]
): Promise<TasksResult<{ deleted: number; failed: number }>> {
  return withAutoRefresh(() => deleteTasksAction(tasks));
}

/**
 * Get task lists with automatic token refresh on expiration.
 */
export async function getTaskLists(): Promise<TasksResult<TaskList[]>> {
  return withAutoRefresh(() => getTaskListsAction());
}

/**
 * Get task lists with metadata and automatic token refresh on expiration.
 */
export async function getTaskListsWithMeta(): Promise<TasksResult<TaskListWithMeta[]>> {
  return withAutoRefresh(() => getTaskListsWithMetaAction());
}

/**
 * Get tasks for a specific list with automatic token refresh on expiration.
 */
export async function getTasks(
  taskListId: string,
  options?: {
    showCompleted?: boolean;
    dueMin?: string;
    dueMax?: string;
  }
): Promise<TasksResult<TaskWithParsedDate[]>> {
  return withAutoRefresh(() => getTasksAction(taskListId, options));
}

/**
 * Move a task within a list or to a different list with automatic token refresh on expiration.
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
  return withAutoRefresh(() => moveTaskAction(taskListId, taskId, options));
}

/**
 * Create a subtask under a parent task with automatic token refresh on expiration.
 */
export async function createSubtask(
  taskListId: string,
  parentTaskId: string,
  task: TaskInput
): Promise<TasksResult<Task>> {
  return withAutoRefresh(() => createSubtaskAction(taskListId, parentTaskId, task));
}
