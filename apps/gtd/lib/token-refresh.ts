/**
 * Token refresh coordinator - ensures only one refresh operation happens at a time.
 * 
 * Supports both:
 * 1. Silent refresh via server-side OAuth (preferred)
 * 2. Popup-based refresh as fallback
 * 
 * When a network call indicates an expired token (needsReauth: true), this utility
 * coordinates the refresh across all pending operations:
 * 
 * 1. First caller triggers the refresh
 * 2. Subsequent callers wait for the pending refresh
 * 3. After refresh completes, all callers can retry their operations
 */

type RefreshFunction = () => Promise<void>;
type TasksResult<T> = { success: true; data: T } | { success: false; error: string; needsReauth?: boolean };

// Singleton state for coordinating refresh across all operations
let pendingRefresh: Promise<void> | null = null;
let refreshFunction: RefreshFunction | null = null;

/**
 * Set the refresh function to use when tokens expire.
 * This should be called once from the auth provider.
 */
export function setRefreshFunction(fn: RefreshFunction): void {
  refreshFunction = fn;
}

/**
 * Clear the refresh function (on logout).
 */
export function clearRefreshFunction(): void {
  refreshFunction = null;
  pendingRefresh = null;
}

/**
 * Attempt silent token refresh via the server-side refresh endpoint.
 * Returns the new tokens if successful, null if failed.
 */
export async function silentRefresh(): Promise<{
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number;
} | null> {
  try {
    const response = await fetch("/api/auth/google/refresh", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}), // Empty body for primary account refresh
    });

    if (!response.ok) {
      const error = await response.json();
      console.warn("Silent refresh failed:", error);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.warn("Silent refresh error:", error);
    return null;
  }
}

/**
 * Attempt to refresh the session. Only one refresh will occur at a time.
 * First tries silent refresh, then falls back to the registered refresh function.
 * Returns true if refresh succeeded, false if it failed.
 */
async function doRefresh(): Promise<boolean> {
  // If a refresh is already in progress, wait for it
  if (pendingRefresh) {
    try {
      await pendingRefresh;
      return true;
    } catch {
      return false;
    }
  }

  // Start a new refresh
  pendingRefresh = (async () => {
    // First, try silent refresh
    const silentResult = await silentRefresh();
    if (silentResult) {
      console.log("Silent token refresh succeeded");
      // Tokens are already updated in cookies by the refresh endpoint
      return;
    }

    // Silent refresh failed - fall back to registered refresh function
    if (!refreshFunction) {
      throw new Error("Token refresh failed and no fallback function set");
    }

    console.log("Silent refresh failed, using fallback refresh function");
    await refreshFunction();
  })();

  try {
    await pendingRefresh;
    return true;
  } catch (error) {
    console.error("Token refresh failed:", error);
    return false;
  } finally {
    pendingRefresh = null;
  }
}

/**
 * Execute a server action with automatic token refresh on expiration.
 * 
 * If the action returns needsReauth: true, this will:
 * 1. Trigger a token refresh (or wait for pending refresh)
 * 2. Retry the action once after successful refresh
 * 
 * @param action - The async action to execute
 * @returns The result from the action (or retry)
 */
export async function withAutoRefresh<T>(
  action: () => Promise<TasksResult<T>>
): Promise<TasksResult<T>> {
  const result = await action();
  
  // If successful or error without needsReauth, return as-is
  if (result.success || !result.needsReauth) {
    return result;
  }
  
  // Token expired - attempt refresh
  const refreshed = await doRefresh();
  
  if (!refreshed) {
    // Refresh failed - return original error with needsReauth flag
    return result;
  }
  
  // Retry the action after successful refresh
  return action();
}

/**
 * Check if a refresh is currently in progress.
 */
export function isRefreshing(): boolean {
  return pendingRefresh !== null;
}
