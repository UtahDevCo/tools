import { z } from "zod";

// Calendar list entry schema (for listing user's calendars)
export const CalendarListEntrySchema = z.object({
  id: z.string(),
  summary: z.string().optional(), // Calendar name
  description: z.string().optional(),
  primary: z.boolean().optional(),
  backgroundColor: z.string().optional(), // Hex color like "#9fe1e7"
  foregroundColor: z.string().optional(),
  accessRole: z.enum(["freeBusyReader", "reader", "writer", "owner"]).optional(),
  selected: z.boolean().optional(), // Whether shown in Google Calendar UI
});

export const CalendarListResponseSchema = z.object({
  kind: z.string().default("calendar#calendarList"),
  items: z.array(CalendarListEntrySchema).optional(),
  nextPageToken: z.string().optional(),
});

export type CalendarListEntry = z.infer<typeof CalendarListEntrySchema>;
export type CalendarListResponse = z.infer<typeof CalendarListResponseSchema>;

// Google Calendar API response schemas
export const CalendarEventAttendeeSchema = z.object({
  email: z.string().optional(),
  displayName: z.string().optional(),
  responseStatus: z.enum(["needsAction", "declined", "tentative", "accepted"]).optional(),
});

export const CalendarEventSchema = z.object({
  id: z.string(),
  kind: z.string().default("calendar#event"),
  summary: z.string().optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  colorId: z.string().optional(), // "1" to "11" for Google Calendar colors
  start: z.object({
    dateTime: z.string().optional(), // RFC 3339
    date: z.string().optional(), // YYYY-MM-DD for all-day events
    timeZone: z.string().optional(),
  }),
  end: z.object({
    dateTime: z.string().optional(),
    date: z.string().optional(),
    timeZone: z.string().optional(),
  }),
  status: z.enum(["confirmed", "tentative", "cancelled"]).optional(),
  htmlLink: z.string().optional(),
  attendees: z.array(CalendarEventAttendeeSchema).optional(),
  recurrence: z.array(z.string()).optional(), // RRULE strings
  recurringEventId: z.string().optional(),
});

export const CalendarEventsResponseSchema = z.object({
  kind: z.string().default("calendar#events"),
  items: z.array(CalendarEventSchema).optional(),
  nextPageToken: z.string().optional(),
});

export type CalendarEvent = z.infer<typeof CalendarEventSchema>;
export type CalendarEventAttendee = z.infer<typeof CalendarEventAttendeeSchema>;
export type CalendarEventsResponse = z.infer<typeof CalendarEventsResponseSchema>;

// Parsed version with Date objects and multi-day info
export type CalendarEventWithParsedDate = CalendarEvent & {
  startDate: Date | null;
  endDate: Date | null;
  isAllDay: boolean;
  // Multi-day event info (set when rendering for specific date)
  isFirstDay?: boolean;
  dayNumber?: number;
  totalDays?: number;
  // Account info for multi-account support
  accountEmail?: string;
  accountColorIndex?: number;
};

/**
 * Parse calendar event to add Date objects
 */
export function parseCalendarEvent(event: CalendarEvent): CalendarEventWithParsedDate {
  let startDate: Date | null = null;
  let endDate: Date | null = null;

  if (event.start.dateTime) {
    startDate = new Date(event.start.dateTime);
  } else if (event.start.date) {
    // For all-day events, parse as local date (not UTC)
    // "2025-12-06" should be Dec 6 in local timezone, not UTC
    const [year, month, day] = event.start.date.split("-").map(Number);
    startDate = new Date(year, month - 1, day, 0, 0, 0, 0);
  }

  if (event.end.dateTime) {
    endDate = new Date(event.end.dateTime);
  } else if (event.end.date) {
    // For all-day events, parse as local date (not UTC)
    const [year, month, day] = event.end.date.split("-").map(Number);
    endDate = new Date(year, month - 1, day, 0, 0, 0, 0);
  }

  return {
    ...event,
    startDate,
    endDate,
    isAllDay: !!event.start.date, // All-day if using date field
  };
}

/**
 * Google Calendar color mapping to Tailwind classes
 * Based on Google Calendar's 11 standard event colors
 */
type ColorStyles = {
  background: string; // Full opacity background
  backgroundLight: string; // 30% opacity for continuation days
  text: string;
  border: string;
};

const COLOR_MAP: Record<string, ColorStyles> = {
  "1": {
    // Lavender
    background: "bg-purple-200",
    backgroundLight: "bg-purple-100",
    text: "text-purple-900",
    border: "border-purple-300",
  },
  "2": {
    // Sage
    background: "bg-green-200",
    backgroundLight: "bg-green-100",
    text: "text-green-900",
    border: "border-green-300",
  },
  "3": {
    // Grape
    background: "bg-purple-300",
    backgroundLight: "bg-purple-100",
    text: "text-purple-950",
    border: "border-purple-400",
  },
  "4": {
    // Flamingo
    background: "bg-pink-200",
    backgroundLight: "bg-pink-100",
    text: "text-pink-900",
    border: "border-pink-300",
  },
  "5": {
    // Banana
    background: "bg-yellow-200",
    backgroundLight: "bg-yellow-100",
    text: "text-yellow-900",
    border: "border-yellow-300",
  },
  "6": {
    // Tangerine
    background: "bg-orange-200",
    backgroundLight: "bg-orange-100",
    text: "text-orange-900",
    border: "border-orange-300",
  },
  "7": {
    // Peacock
    background: "bg-cyan-200",
    backgroundLight: "bg-cyan-100",
    text: "text-cyan-900",
    border: "border-cyan-300",
  },
  "8": {
    // Graphite
    background: "bg-gray-300",
    backgroundLight: "bg-gray-100",
    text: "text-gray-900",
    border: "border-gray-400",
  },
  "9": {
    // Blueberry
    background: "bg-blue-300",
    backgroundLight: "bg-blue-100",
    text: "text-blue-900",
    border: "border-blue-400",
  },
  "10": {
    // Basil
    background: "bg-emerald-200",
    backgroundLight: "bg-emerald-100",
    text: "text-emerald-900",
    border: "border-emerald-300",
  },
  "11": {
    // Tomato
    background: "bg-red-200",
    backgroundLight: "bg-red-100",
    text: "text-red-900",
    border: "border-red-300",
  },
};

// Default color for events without colorId
const DEFAULT_COLOR: ColorStyles = {
  background: "bg-blue-200",
  backgroundLight: "bg-blue-100",
  text: "text-blue-900",
  border: "border-blue-300",
};

/**
 * Get Tailwind color classes for a calendar event
 */
export function getColorStyles(colorId?: string, isFirstDay = true): ColorStyles {
  const colors = colorId && COLOR_MAP[colorId] ? COLOR_MAP[colorId] : DEFAULT_COLOR;

  return {
    ...colors,
    background: isFirstDay ? colors.background : colors.backgroundLight,
  };
}

/**
 * Calculate duration between two dates in human-readable format
 */
export function formatDuration(start: Date, end: Date): string {
  const diffMs = end.getTime() - start.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    const remainingHours = diffHours % 24;
    return remainingHours > 0
      ? `${diffDays} day${diffDays > 1 ? "s" : ""}, ${remainingHours} hour${remainingHours > 1 ? "s" : ""}`
      : `${diffDays} day${diffDays > 1 ? "s" : ""}`;
  }

  if (diffHours > 0) {
    const remainingMins = diffMins % 60;
    return remainingMins > 0
      ? `${diffHours} hour${diffHours > 1 ? "s" : ""}, ${remainingMins} min${remainingMins > 1 ? "s" : ""}`
      : `${diffHours} hour${diffHours > 1 ? "s" : ""}`;
  }

  return `${diffMins} min${diffMins > 1 ? "s" : ""}`;
}
