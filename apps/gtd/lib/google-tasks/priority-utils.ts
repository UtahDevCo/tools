/**
 * Priority utilities for Google Tasks.
 * 
 * Since Google Tasks API doesn't have a native priority field,
 * we store priority as a marker at the start of the notes field.
 * 
 * Format: [P1], [P2], [P3] at the beginning of notes
 * - P1 = High priority
 * - P2 = Medium priority
 * - P3 = Low priority
 * - No marker = No priority
 */

export type Priority = "high" | "medium" | "low" | "none";

// Priority marker pattern: [P1], [P2], or [P3] at the start of notes
const PRIORITY_PATTERN = /^\[P([123])\]\s*/;

/**
 * Map from priority marker number to Priority type
 */
const MARKER_TO_PRIORITY: Record<string, Priority> = {
  "1": "high",
  "2": "medium",
  "3": "low",
};

/**
 * Map from Priority type to marker string
 */
const PRIORITY_TO_MARKER: Record<Priority, string> = {
  high: "[P1] ",
  medium: "[P2] ",
  low: "[P3] ",
  none: "",
};

/**
 * Display labels for priorities
 */
export const PRIORITY_LABELS: Record<Priority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
  none: "None",
};

/**
 * Colors for priorities (Tailwind classes)
 */
export const PRIORITY_COLORS: Record<Priority, { bg: string; text: string; border: string }> = {
  high: { bg: "bg-red-100", text: "text-red-700", border: "border-red-300" },
  medium: { bg: "bg-yellow-100", text: "text-yellow-700", border: "border-yellow-300" },
  low: { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-300" },
  none: { bg: "bg-gray-100", text: "text-gray-500", border: "border-gray-200" },
};

/**
 * Extract priority from notes string.
 * Returns the priority and the notes with the priority marker removed.
 */
export function parsePriorityFromNotes(notes: string | undefined): {
  priority: Priority;
  cleanNotes: string;
} {
  if (!notes) {
    return { priority: "none", cleanNotes: "" };
  }

  const match = notes.match(PRIORITY_PATTERN);
  if (!match) {
    return { priority: "none", cleanNotes: notes };
  }

  const priorityNum = match[1];
  const priority = MARKER_TO_PRIORITY[priorityNum] ?? "none";
  const cleanNotes = notes.replace(PRIORITY_PATTERN, "");

  return { priority, cleanNotes };
}

/**
 * Add or update priority marker in notes string.
 * Returns the notes with the appropriate priority marker prepended.
 */
export function addPriorityToNotes(notes: string, priority: Priority): string {
  // First remove any existing priority marker
  const cleanNotes = notes.replace(PRIORITY_PATTERN, "").trim();

  // If no priority, return clean notes
  if (priority === "none") {
    return cleanNotes;
  }

  // Add the new priority marker
  const marker = PRIORITY_TO_MARKER[priority];
  return cleanNotes ? `${marker}${cleanNotes}` : marker.trim();
}

/**
 * Get priority from a task's notes field.
 */
export function getTaskPriority(notes: string | undefined): Priority {
  return parsePriorityFromNotes(notes).priority;
}

/**
 * Get display-ready notes (without priority marker).
 */
export function getCleanNotes(notes: string | undefined): string {
  return parsePriorityFromNotes(notes).cleanNotes;
}

/**
 * Priority sort order - higher priority tasks should appear first
 */
const PRIORITY_SORT_ORDER: Record<Priority, number> = {
  high: 0,
  medium: 1,
  low: 2,
  none: 3,
};

/**
 * Compare two tasks by priority for sorting.
 * Returns negative if a should come before b, positive if b should come before a.
 */
export function compareByPriority<T extends { notes?: string }>(a: T, b: T): number {
  const priorityA = getTaskPriority(a.notes);
  const priorityB = getTaskPriority(b.notes);
  return PRIORITY_SORT_ORDER[priorityA] - PRIORITY_SORT_ORDER[priorityB];
}

/**
 * Sort an array of tasks by priority (highest first).
 * Returns a new sorted array, does not mutate the original.
 */
export function sortByPriority<T extends { notes?: string }>(tasks: T[]): T[] {
  return [...tasks].sort(compareByPriority);
}
