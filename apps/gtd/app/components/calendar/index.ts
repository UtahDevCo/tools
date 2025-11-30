/**
 * Calendar components module exports
 * 
 * This module provides extracted components from the main weekly-calendar.
 * The calendar has been refactored into smaller, testable pieces while
 * maintaining the same functionality.
 */

// Component exports
export { CalendarHeader } from "./calendar-header";
export { MultiSelectActionsBar } from "./multi-select-actions-bar";
export { ConfirmDeleteDialog, ConfirmMoveDialog } from "./confirmation-dialogs";

// Hook exports
export { useCalendarNavigation } from "./use-calendar-navigation";
export { useMultiSelect } from "./use-multi-select";

// Utility exports
export { getDaysForFourColumns, isWeekend, formatDateRange } from "./utils";

// Type exports
export type {
  WeekDay,
  DayColumn,
  ListSortOrder,
  OtherListData,
  MultiSelectHandlers,
} from "./types";
