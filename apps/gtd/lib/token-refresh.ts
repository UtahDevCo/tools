/**
 * Token refresh coordinator - ensures only one refresh operation happens at a time.
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
 * Wait for the window to gain focus before proceeding.
 * This prevents popups from stealing focus from other applications.
 * Returns immediately if the window is already focused.
 */
function waitForWindowFocus(): Promise<void> {
  // Check if we're in a browser environment
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.resolve();
  }

  // If already focused, return immediately
  if (document.hasFocus()) {
    return Promise.resolve();
  }

  // Wait for focus event
  return new Promise((resolve) => {
    const handleFocus = () => {
      window.removeEventListener("focus", handleFocus);
      resolve();
    };
    window.addEventListener("focus", handleFocus);
  });
}

/**
 * Attempt to refresh the session. Only one refresh will occur at a time.
 * Waits for window focus before triggering the popup to avoid stealing focus.
 * Returns true if refresh succeeded, false if it failed.
 */
async function doRefresh(): Promise<boolean> {
  if (!refreshFunction) {
    console.warn("Token refresh requested but no refresh function set");
    return false;
  }

  // If a refresh is already in progress, wait for it
  if (pendingRefresh) {
    try {
      await pendingRefresh;
      return true;
    } catch {
      return false;
    }
  }

  // Wait for window focus before triggering the auth popup
  // This prevents the popup from stealing focus when user is in another app
  await waitForWindowFocus();

  // Start a new refresh
  pendingRefresh = refreshFunction();
  
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
