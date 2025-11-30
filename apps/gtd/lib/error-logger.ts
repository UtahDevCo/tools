/**
 * Centralized error logging utility.
 * 
 * In development: logs to console
 * In production: can be extended to send to Firebase Crashlytics or other services
 */

type ErrorContext = {
  [key: string]: unknown;
  action?: string;
  userId?: string;
  taskId?: string;
  component?: string;
};

/**
 * Log an error with context information.
 * 
 * Usage:
 * ```typescript
 * try {
 *   await completeTask(taskId);
 * } catch (error) {
 *   logError(error, { action: 'completeTask', taskId, userId: user.uid });
 *   throw error;
 * }
 * ```
 */
export function logError(error: unknown, context: ErrorContext = {}): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  // Always log to console
  console.error('[Error]', errorMessage, {
    ...context,
    stack: errorStack,
    timestamp: new Date().toISOString(),
  });

  // TODO: Send to Firebase Crashlytics in production
  // if (process.env.NODE_ENV === 'production') {
  //   // Firebase Crashlytics logging would go here
  //   // See monitoring recommendations in the code review
  // }
}

/**
 * Log a warning with context information.
 */
export function logWarning(message: string, context: ErrorContext = {}): void {
  console.warn('[Warning]', message, {
    ...context,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Log an info message with context information.
 * Only logs in development.
 */
export function logInfo(message: string, context: ErrorContext = {}): void {
  if (process.env.NODE_ENV === 'development') {
    console.info('[Info]', message, context);
  }
}
