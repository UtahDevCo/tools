"use client";

/**
 * Client-side wrappers for calendar server actions that automatically handle token refresh.
 * 
 * When a server action returns `needsReauth: true`, these wrappers will:
 * 1. Trigger a single token refresh (coordinated via token-refresh.ts)
 * 2. Retry the operation once after successful refresh
 * 
 * This eliminates the need for manual refresh handling throughout the app.
 */

import { withAutoRefresh } from "@/lib/token-refresh";
import {
  getCalendarEventsForMonth as getCalendarEventsForMonthAction,
  getCalendarEvents as getCalendarEventsAction,
  getCalendarList as getCalendarListAction,
} from "@/app/actions/calendar";
import type { CalendarEventWithParsedDate, CalendarListEntry } from "@/lib/google-calendar/types";

/**
 * Get month key for caching (YYYY-MM format)
 * Client-safe utility function.
 */
export function getMonthKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

type CalendarResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; needsReauth?: boolean };

/**
 * Get list of user's calendars with automatic token refresh on expiration.
 */
export async function getCalendarList(): Promise<CalendarResult<CalendarListEntry[]>> {
  return withAutoRefresh(() => getCalendarListAction());
}

/**
 * Get calendar events for a specific month with automatic token refresh on expiration.
 * @param calendarIds - Array of calendar IDs to fetch. Empty array = primary only.
 */
export async function getCalendarEventsForMonth(
  year: number,
  month: number,
  calendarIds: string[] = []
): Promise<CalendarResult<CalendarEventWithParsedDate[]>> {
  return withAutoRefresh(() => getCalendarEventsForMonthAction(year, month, calendarIds));
}

/**
 * Get calendar events for a date range with automatic token refresh on expiration.
 * @param calendarIds - Array of calendar IDs to fetch. Empty array = primary only.
 */
export async function getCalendarEvents(
  timeMin: string,
  timeMax: string,
  calendarIds: string[] = []
): Promise<CalendarResult<CalendarEventWithParsedDate[]>> {
  return withAutoRefresh(() => getCalendarEventsAction(timeMin, timeMax, calendarIds));
}
