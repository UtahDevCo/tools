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
 * Get list of user's calendars (primary account only)
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
 * Get list of calendars for a specific connected account
 * @param accountEmail - The email of the connected account (for logging)
 * @param accessToken - The access token for the account (passed from client)
 */
export async function getCalendarListForAccount(
  accountEmail: string,
  accessToken: string
): Promise<CalendarResult<CalendarListEntry[]>> {
  console.log(`[Calendar] getCalendarListForAccount called for: ${accountEmail}`);
  
  if (!accessToken) {
    return { success: false, error: "No access token provided", needsReauth: true };
  }

  try {
    const client = createCalendarClient(accessToken);
    console.log(`[Calendar] Fetching calendars for ${accountEmail}...`);
    const calendars = await listCalendars(client);
    console.log(`[Calendar] Found ${calendars.length} calendars for ${accountEmail}`);
    return { success: true, data: calendars };
  } catch (error) {
    console.error(`[Calendar] Failed to fetch calendar list for ${accountEmail}:`, error);
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
 * Calendar selection config per account (with access token from client)
 */
export type AccountCalendarConfig = {
  accountEmail: string;
  calendarIds: string[];
  colorIndex: number;
  accessToken: string; // Token passed from client. Empty string = use cookie-based auth (primary account)
};

/**
 * Get calendar events from multiple accounts for a date range
 * This is the main function for fetching events with multi-account support
 * @param timeMin - ISO date string for start of range
 * @param timeMax - ISO date string for end of range
 * @param accountConfigs - Array of account configs with access tokens from client
 *   - For primary account: accessToken should be empty string "" to use cookie-based auth
 *   - For secondary accounts: accessToken should be the account's stored access token
 */
export async function getCalendarEventsMultiAccount(
  timeMin: string,
  timeMax: string,
  accountConfigs: AccountCalendarConfig[]
): Promise<CalendarResult<CalendarEventWithParsedDate[]>> {
  const allEvents: CalendarEventWithParsedDate[] = [];
  const errors: string[] = [];

  // Fetch events for each account config in parallel
  const fetchPromises = accountConfigs.map(async (config) => {
    try {
      let client: ReturnType<typeof createCalendarClient>;
      
      // Empty accessToken = primary account, use cookie-based auth
      if (!config.accessToken) {
        const authResult = await getAuthenticatedClient();
        if ("error" in authResult) {
          errors.push(`Primary account auth failed: ${authResult.error}`);
          return [];
        }
        client = authResult.client;
      } else {
        // Secondary account, use provided access token
        client = createCalendarClient(config.accessToken);
      }
      
      const calendarsToFetch = config.calendarIds.length > 0 ? config.calendarIds : ["primary"];

      const eventPromises = calendarsToFetch.map((calendarId) =>
        fetchAllCalendarEvents(client, {
          calendarId,
          timeMin,
          timeMax,
        }).catch((error) => {
          console.error(`Failed to fetch events from ${config.accountEmail}/${calendarId}:`, error);
          return [];
        })
      );

      const eventArrays = await Promise.all(eventPromises);
      const events = eventArrays.flat();

      // Tag each event with account info
      return events.map((event) => ({
        ...event,
        accountEmail: config.accountEmail,
        accountColorIndex: config.colorIndex,
      }));
    } catch (error) {
      console.error(`Failed to fetch events for ${config.accountEmail}:`, error);
      errors.push(`Failed to fetch events for ${config.accountEmail}`);
      return [];
    }
  });

  const results = await Promise.all(fetchPromises);
  for (const events of results) {
    allEvents.push(...events);
  }

  // Sort all events by start time
  allEvents.sort((a, b) => {
    const aTime = a.startDate?.getTime() ?? 0;
    const bTime = b.startDate?.getTime() ?? 0;
    return aTime - bTime;
  });

  if (errors.length > 0 && allEvents.length === 0) {
    return { success: false, error: errors.join("; ") };
  }

  return { success: true, data: allEvents };
}

/**
 * Get calendar events for a date range (single account - backwards compatible)
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
