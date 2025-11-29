import type { TaskList } from "./types";

// GTD list name constants - prefixed with [GTD] in Google Tasks
export const GTD_LIST_PREFIX = "[GTD] ";
export const GTD_LISTS = {
  NEXT: `${GTD_LIST_PREFIX}Next`,
  WAITING: `${GTD_LIST_PREFIX}Waiting`,
  SOMEDAY: `${GTD_LIST_PREFIX}Someday`,
} as const;

// Display names (without the [GTD] prefix)
export const GTD_DISPLAY_NAMES = {
  NEXT: "Next",
  WAITING: "Waiting",
  SOMEDAY: "Someday",
} as const;

/**
 * Check if a task list is a GTD-managed list
 */
export function isGTDList(taskList: TaskList): boolean {
  return taskList.title.startsWith(GTD_LIST_PREFIX);
}

/**
 * Get the display name for a task list (strips [GTD] prefix if present)
 */
export function getTaskListDisplayName(taskList: TaskList): string {
  if (taskList.title.startsWith(GTD_LIST_PREFIX)) {
    return taskList.title.slice(GTD_LIST_PREFIX.length);
  }
  return taskList.title;
}
