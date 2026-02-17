/**
 * Centralized constants for the WKT app.
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
 * Cache keys for LocalForage storage
 */
export const CACHE_KEYS = {
  USER_SETTINGS: "wkt-user-settings",
} as const;
