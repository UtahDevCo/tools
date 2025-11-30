"use server";

import { getAccessToken, isTokenExpired } from "./session";
import {
  createCalendarClient,
  fetchAllCalendarEvents,
  getMonthBounds,
  listCalendars,
} from "@/lib/google-calendar/client";
import { type CalendarEventWithParsedDate, type CalendarListEntry } from "@/lib/google-calendar/types";

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
 * Get list of user's calendars
 */
export async function getCalendarList(): Promise<CalendarResult<CalendarListEntry[]>> {
  const result = await getAuthenticatedClient();

  if ("error" in result) {
    return {
      success: false,
      error: result.error,
      needsReauth: result.needsReauth,
    };
  }

  try {
    const calendars = await listCalendars(result.client);
    return { success: true, data: calendars };
  } catch (error) {
    console.error("Failed to fetch calendar list:", error);
    return { success: false, error: "Failed to fetch calendar list" };
  }
}

/**
 * Get calendar events for a specific month
 * @param calendarIds - Array of calendar IDs to fetch. Empty array = primary only.
 */
export async function getCalendarEventsForMonth(
  year: number,
  month: number, // 0-indexed (0 = January)
  calendarIds: string[] = []
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

    // If no calendars specified, use primary only
    const calendarsToFetch = calendarIds.length > 0 ? calendarIds : ["primary"];

    // Fetch from all calendars in parallel
    const eventPromises = calendarsToFetch.map((calendarId) =>
      fetchAllCalendarEvents(result.client, {
        calendarId,
        timeMin,
        timeMax,
      }).catch((error) => {
        console.error(`Failed to fetch events from calendar ${calendarId}:`, error);
        return []; // Return empty array for failed calendars
      })
    );

    const eventArrays = await Promise.all(eventPromises);
    const allEvents = eventArrays.flat();

    // Sort by start time
    allEvents.sort((a, b) => {
      const aTime = a.startDate?.getTime() ?? 0;
      const bTime = b.startDate?.getTime() ?? 0;
      return aTime - bTime;
    });

    return { success: true, data: allEvents };
  } catch (error) {
    console.error("Failed to fetch calendar events:", error);
    return { success: false, error: "Failed to fetch calendar events" };
  }
}

/**
 * Get calendar events for a date range
 * @param calendarIds - Array of calendar IDs to fetch. Empty array = primary only.
 */
export async function getCalendarEvents(
  timeMin: string,
  timeMax: string,
  calendarIds: string[] = []
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
    // If no calendars specified, use primary only
    const calendarsToFetch = calendarIds.length > 0 ? calendarIds : ["primary"];

    // Fetch from all calendars in parallel
    const eventPromises = calendarsToFetch.map((calendarId) =>
      fetchAllCalendarEvents(result.client, {
        calendarId,
        timeMin,
        timeMax,
      }).catch((error) => {
        console.error(`Failed to fetch events from calendar ${calendarId}:`, error);
        return []; // Return empty array for failed calendars
      })
    );

    const eventArrays = await Promise.all(eventPromises);
    const allEvents = eventArrays.flat();

    // Sort by start time
    allEvents.sort((a, b) => {
      const aTime = a.startDate?.getTime() ?? 0;
      const bTime = b.startDate?.getTime() ?? 0;
      return aTime - bTime;
    });

    return { success: true, data: allEvents };
  } catch (error) {
    console.error("Failed to fetch calendar events:", error);
    return { success: false, error: "Failed to fetch calendar events" };
  }
}
