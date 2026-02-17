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
