"use server";

import { getAccessToken, isTokenExpired } from "./session";
import {
  createCalendarClient,
  fetchAllCalendarEvents,
  getMonthBounds,
} from "@/lib/google-calendar/client";
import { type CalendarEventWithParsedDate } from "@/lib/google-calendar/types";

type CalendarResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; needsReauth?: boolean };

type AuthError = { error: string; needsReauth: boolean };
type AuthSuccess = { client: ReturnType<typeof createCalendarClient> };

async function getAuthenticatedClient(): Promise<AuthError | AuthSuccess> {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    return { error: "Not authenticated", needsReauth: true };
  }

  const expired = await isTokenExpired();
  if (expired) {
    return { error: "Session expired", needsReauth: true };
  }

  return { client: createCalendarClient(accessToken) };
}

/**
 * Get calendar events for a specific month
 */
export async function getCalendarEventsForMonth(
  year: number,
  month: number // 0-indexed (0 = January)
): Promise<CalendarResult<CalendarEventWithParsedDate[]>> {
  const result = await getAuthenticatedClient();

  if ("error" in result) {
    return {
      success: false,
      error: result.error,
      needsReauth: result.needsReauth,
    };
  }

  try {
    const { timeMin, timeMax } = getMonthBounds(year, month);

    const events = await fetchAllCalendarEvents(result.client, {
      calendarId: "primary",
      timeMin,
      timeMax,
    });

    return { success: true, data: events };
  } catch (error) {
    console.error("Failed to fetch calendar events:", error);
    return { success: false, error: "Failed to fetch calendar events" };
  }
}

/**
 * Get calendar events for a date range
 */
export async function getCalendarEvents(
  timeMin: string,
  timeMax: string
): Promise<CalendarResult<CalendarEventWithParsedDate[]>> {
  const result = await getAuthenticatedClient();

  if ("error" in result) {
    return {
      success: false,
      error: result.error,
      needsReauth: result.needsReauth,
    };
  }

  try {
    const events = await fetchAllCalendarEvents(result.client, {
      calendarId: "primary",
      timeMin,
      timeMax,
    });

    return { success: true, data: events };
  } catch (error) {
    console.error("Failed to fetch calendar events:", error);
    return { success: false, error: "Failed to fetch calendar events" };
  }
}
