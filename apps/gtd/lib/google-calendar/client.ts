import { calendar_v3, auth } from "@googleapis/calendar";
import {
  CalendarEventsResponseSchema,
  type CalendarEvent,
  type CalendarEventWithParsedDate,
  parseCalendarEvent,
} from "./types";

export function createCalendarClient(accessToken: string): calendar_v3.Calendar {
  const oauth2Client = new auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  return new calendar_v3.Calendar({ auth: oauth2Client });
}

/**
 * Fetch calendar events for a specific date range
 */
export async function fetchCalendarEvents(
  client: calendar_v3.Calendar,
  options: {
    calendarId?: string; // Default: "primary"
    timeMin: string; // RFC 3339
    timeMax: string; // RFC 3339
    maxResults?: number; // Default: 100
    pageToken?: string; // For pagination
  }
): Promise<{ events: CalendarEvent[]; nextPageToken?: string }> {
  const response = await client.events.list({
    calendarId: options.calendarId ?? "primary",
    timeMin: options.timeMin,
    timeMax: options.timeMax,
    maxResults: options.maxResults ?? 100,
    pageToken: options.pageToken,
    singleEvents: true, // Expand recurring events
    orderBy: "startTime",
  });

  const parsed = CalendarEventsResponseSchema.parse(response.data, {
    reportInput: true,
  });

  return {
    events: parsed.items ?? [],
    nextPageToken: parsed.nextPageToken,
  };
}

/**
 * Fetch all calendar events for a date range (handles pagination)
 */
export async function fetchAllCalendarEvents(
  client: calendar_v3.Calendar,
  options: {
    calendarId?: string;
    timeMin: string;
    timeMax: string;
  }
): Promise<CalendarEventWithParsedDate[]> {
  const allEvents: CalendarEvent[] = [];
  let pageToken: string | undefined = undefined;

  do {
    const result = await fetchCalendarEvents(client, {
      ...options,
      pageToken,
    });

    allEvents.push(...result.events);
    pageToken = result.nextPageToken;
  } while (pageToken);

  return allEvents.map(parseCalendarEvent);
}

/**
 * Get month key for caching (YYYY-MM format)
 */
export function getMonthKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * Get start and end of month in RFC 3339 format
 */
export function getMonthBounds(year: number, month: number): { timeMin: string; timeMax: string } {
  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

  return {
    timeMin: startOfMonth.toISOString(),
    timeMax: endOfMonth.toISOString(),
  };
}
