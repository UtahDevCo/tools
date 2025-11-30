/**
 * Cloud logging utility for structured logging to GCP Cloud Logging.
 * 
 * In development: logs to console only
 * In production: logs are automatically sent to Cloud Logging
 * 
 * Cloud Logging automatically captures console.log from Cloud Run/Functions
 * when logs are structured as JSON with severity levels.
 */

type LogSeverity = "DEBUG" | "INFO" | "NOTICE" | "WARNING" | "ERROR" | "CRITICAL" | "ALERT" | "EMERGENCY";

type LogData = {
  [key: string]: unknown;
  action?: string;
  userId?: string;
  taskId?: string;
  component?: string;
  duration?: number;
  statusCode?: number;
};

/**
 * Log a structured message to Cloud Logging.
 * 
 * Usage:
 * ```typescript
 * logToCloud('INFO', 'Task completed', { taskId: '123', userId: 'abc' });
 * logToCloud('ERROR', 'Failed to fetch tasks', { error: err.message });
 * ```
 */
export function logToCloud(
  severity: LogSeverity,
  message: string,
  data?: LogData
): void {
  const logEntry = {
    severity,
    message,
    timestamp: new Date().toISOString(),
    ...data,
  };

  if (process.env.NODE_ENV === "production") {
    // In production, console.log is automatically captured by Cloud Logging
    // The JSON structure with severity field is recognized by GCP
    console.log(JSON.stringify(logEntry));
  } else {
    // In development, log in a readable format
    const consoleMethod = severity === "ERROR" || severity === "CRITICAL" ? "error" : "log";
    console[consoleMethod](`[${severity}]`, message, data || "");
  }
}

/**
 * Convenience functions for common log levels
 */

export function logInfo(message: string, data?: LogData): void {
  logToCloud("INFO", message, data);
}

export function logWarning(message: string, data?: LogData): void {
  logToCloud("WARNING", message, data);
}

export function logError(message: string, error: unknown, data?: LogData): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  logToCloud("ERROR", message, {
    ...data,
    error: errorMessage,
    stack: errorStack,
  });
}

export function logDebug(message: string, data?: LogData): void {
  if (process.env.NODE_ENV === "development") {
    logToCloud("DEBUG", message, data);
  }
}

/**
 * Log performance metrics
 */
export function logPerformance(
  operation: string,
  durationMs: number,
  data?: LogData
): void {
  logToCloud("INFO", `Performance: ${operation}`, {
    ...data,
    duration: durationMs,
    operation,
  });
}

/**
 * Log API request/response
 */
export function logApiCall(
  method: string,
  endpoint: string,
  statusCode: number,
  durationMs: number,
  data?: LogData
): void {
  const severity = statusCode >= 500 ? "ERROR" : statusCode >= 400 ? "WARNING" : "INFO";
  
  logToCloud(severity, `API ${method} ${endpoint}`, {
    ...data,
    method,
    endpoint,
    statusCode,
    duration: durationMs,
  });
}
