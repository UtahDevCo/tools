/**
 * Centralized constants for the GTD app.
 * All magic numbers and configuration values should be defined here.
 */

/**
 * Timeouts and debounce values (in milliseconds)
 */
export const TIMEOUTS = {
  /** Time window for undo after delete operation */
  UNDO_WINDOW: 5000,
  
  /** Debounce for click events to prevent double-clicks */
  CLICK_DEBOUNCE: 1000,
  
  /** Buffer before token expiry to trigger refresh (2 minutes) */
  TOKEN_REFRESH_BUFFER: 2 * 60 * 1000,
  
  /** Interval to check token expiry (5 minutes) */
  TOKEN_CHECK_INTERVAL: 5 * 60 * 1000,
} as const;

/**
 * UI layout constants
 */
export const UI = {
  /** Number of task rows to display in weekday columns */
  WEEKDAY_ROWS: 10,
  
  /** Number of task rows to display in weekend columns */
  WEEKEND_ROWS: 4,
  
  /** Minimum number of rows for GTD section columns */
  SECTION_MIN_ROWS: 4,
  
  /** Minimum number of rows for other lists */
  LIST_MIN_ROWS: 1,
} as const;

/**
 * Cache keys for LocalForage storage
 */
export const CACHE_KEYS = {
  TASK_LISTS: "gtd-task-lists",
  GTD_LISTS: "gtd-lists",
  COMPLETED_TASKS: "gtd-completed-tasks",
  SORT_PREFERENCE: "gtd-list-sort-preference",
  SKIP_MOVE_CONFIRM: "gtd-skip-move-confirm",
  CALENDAR_EVENTS_PREFIX: "gtd-calendar-events-", // Suffix with YYYY-MM for month-based caching
} as const;

/**
 * Service Worker cache configuration
 */
export const CACHE_CONFIG = {
  /** Cache name for Google Tasks API responses */
  API_CACHE_NAME: "google-tasks-api",
  
  /** Max age for API cache (7 days) */
  API_MAX_AGE_SECONDS: 60 * 60 * 24 * 7,
  
  /** Max entries in API cache */
  API_MAX_ENTRIES: 100,
} as const;
