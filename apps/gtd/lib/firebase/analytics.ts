import { getApp } from "firebase/app";
import {
  initializeAnalytics,
  logEvent as firebaseLogEvent,
  setUserId,
  setUserProperties,
  type Analytics,
} from "firebase/analytics";

let analytics: Analytics | null = null;
let isInitialized = false;

/**
 * Initialize Firebase Analytics.
 * Call this once on app startup, client-side only.
 */
export function initializeMonitoring(): void {
  if (typeof window === "undefined") return;
  if (isInitialized) return;

  try {
    const app = getApp();
    analytics = initializeAnalytics(app);
    isInitialized = true;
    console.log("[Analytics] Initialized successfully");
  } catch (error) {
    console.error("[Analytics] Failed to initialize:", error);
  }
}

/**
 * Log a custom event to Firebase Analytics.
 *
 * Usage:
 * ```typescript
 * logEvent('task_completed', { taskId: '123', listType: 'next' });
 * ```
 */
export function logEvent(
  eventName: string,
  params?: Record<string, unknown>
): void {
  if (!analytics) {
    if (process.env.NODE_ENV === "development") {
      console.log("[Analytics] Event:", eventName, params);
    }
    return;
  }

  try {
    firebaseLogEvent(analytics, eventName, params);
  } catch (error) {
    console.error("[Analytics] Failed to log event:", error);
  }
}

/**
 * Log an error to Firebase Analytics as a custom event.
 *
 * Usage:
 * ```typescript
 * logError(error, { action: 'completeTask', taskId: '123' });
 * ```
 */
export function logError(
  error: unknown,
  context: Record<string, unknown> = {}
): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorName = error instanceof Error ? error.name : "UnknownError";

  logEvent("error_occurred", {
    error_name: errorName,
    error_message: errorMessage,
    ...context,
  });
}

/**
 * Set the user ID for analytics tracking.
 * Call this after user signs in.
 */
export function setAnalyticsUserId(userId: string): void {
  if (!analytics) return;

  try {
    setUserId(analytics, userId);
  } catch (error) {
    console.error("[Analytics] Failed to set user ID:", error);
  }
}

/**
 * Set user properties for analytics.
 * Call this to track user characteristics.
 */
export function setAnalyticsUserProperties(
  properties: Record<string, string>
): void {
  if (!analytics) return;

  try {
    setUserProperties(analytics, properties);
  } catch (error) {
    console.error("[Analytics] Failed to set user properties:", error);
  }
}

/**
 * Track task-related events
 */
export function trackTaskCompleted(taskId: string, listType?: string): void {
  logEvent("task_completed", { taskId, listType });
}

export function trackTaskCreated(listType?: string): void {
  logEvent("task_created", { listType });
}

export function trackTaskDeleted(taskId: string): void {
  logEvent("task_deleted", { taskId });
}

export function trackTaskMoved(taskId: string, toList: string): void {
  logEvent("task_moved", { taskId, toList });
}

/**
 * Track authentication events
 */
export function trackTokenRefreshFailed(error: string): void {
  logEvent("token_refresh_failed", { error });
}

export function trackLoginSuccess(): void {
  logEvent("login_success");
}

export function trackLogoutSuccess(): void {
  logEvent("logout_success");
}

/**
 * Track offline/online events
 */
export function trackOfflineModeDetected(): void {
  logEvent("offline_mode_detected");
}

export function trackOnlineModeRestored(): void {
  logEvent("online_mode_restored");
}

/**
 * Track multi-select feature usage
 */
export function trackMultiSelectUsed(count: number, action: string): void {
  logEvent("multi_select_used", { count, action });
}

/**
 * Track GTD list interactions
 */
export function trackGtdListViewed(listType: string): void {
  logEvent("gtd_list_viewed", { listType });
}

export function trackGtdListCreated(listType: string): void {
  logEvent("gtd_list_created", { listType });
}
