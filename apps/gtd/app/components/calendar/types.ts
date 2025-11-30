/**
 * Type definitions for calendar components
 */

import type { TaskList } from "@/lib/google-tasks/types";
import type { TaskWithListInfo } from "@/providers/tasks-provider";

export type WeekDay = {
  date: Date;
  isToday: boolean;
};

export type DayColumn = 
  | { type: "weekday"; day: WeekDay }
  | { type: "weekend"; days: WeekDay[] };

export type ListSortOrder = "alphabetical" | "taskCount" | "updated";

export type OtherListData = {
  taskList: TaskList;
  displayName: string;
  tasks: TaskWithListInfo[];
};

export type MultiSelectHandlers = {
  isMultiSelectMode: boolean;
  selectedTaskIds: Set<string>;
  isMoveTargetingActive: boolean;
  onEnterMultiSelect: (taskId: string) => void;
  onToggleTaskSelection: (taskId: string) => void;
  onSelectMoveTarget: (listId: string, listName: string, dueDate?: string) => void;
};
