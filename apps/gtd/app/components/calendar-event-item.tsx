"use client";

import { useState } from "react";
import { ExternalLink, Calendar, MapPin, Users, Clock } from "lucide-react";
import {
  Typography,
  Button,
  cn,
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@repo/components";
import {
  type CalendarEventWithParsedDate,
  getColorStyles,
  formatDuration,
} from "@/lib/google-calendar/types";
import { ACCOUNT_COLORS } from "@/lib/firebase/accounts";

type CalendarEventItemProps = {
  event: CalendarEventWithParsedDate;
  isFirstDay?: boolean;
  dayNumber?: number;
  totalDays?: number;
};

/**
 * Get the account color based on the colorIndex
 */
function getAccountColor(colorIndex?: number): { bg: string; hex: string } {
  if (colorIndex === undefined || colorIndex < 0 || colorIndex >= ACCOUNT_COLORS.length) {
    return ACCOUNT_COLORS[0]; // Default to first color (blue)
  }
  return ACCOUNT_COLORS[colorIndex];
}

export function CalendarEventItem({
  event,
  isFirstDay = true,
  dayNumber = 1,
  totalDays = 1,
}: CalendarEventItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const colors = getColorStyles(event.colorId, isFirstDay);
  const accountColor = getAccountColor(event.accountColorIndex);
  const isMultiDay = totalDays > 1;

  // Format time for timed events
  const startTime = event.startDate && !event.isAllDay
    ? event.startDate.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div
          className={cn(
            "flex min-h-9 h-9 items-center border-b-2 border-zinc-100 px-2 cursor-pointer transition-colors hover:bg-zinc-50"
          )}
        >
          {/* Account color indicator (outer ring) + Event color (inner) */}
          <div
            className="size-3 rounded-full mr-2 shrink-0 flex items-center justify-center"
            style={{ backgroundColor: accountColor.hex }}
            title={event.accountEmail ? `From: ${event.accountEmail}` : undefined}
          >
            <div className={cn("size-1.5 rounded-full", colors.background)} />
          </div>
          <Typography
            variant="default"
            className="truncate text-sm flex-1 px-1"
          >
            {event.summary || "Untitled Event"}
          </Typography>
          {startTime && (
            <Typography
              variant="light"
              className="ml-2 text-xs whitespace-nowrap text-zinc-500"
            >
              {startTime}
            </Typography>
          )}
          {isMultiDay && (
            <Typography
              variant="light"
              className="ml-2 text-xs whitespace-nowrap text-zinc-400"
            >
              Day {dayNumber}/{totalDays}
            </Typography>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80">
        <CalendarEventDetail event={event} onClose={() => setIsOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}

type CalendarEventDetailProps = {
  event: CalendarEventWithParsedDate;
  onClose: () => void;
};

function CalendarEventDetail({ event, onClose }: CalendarEventDetailProps) {
  const colors = getColorStyles(event.colorId);
  const accountColor = getAccountColor(event.accountColorIndex);

  // Format date and time
  const formatDateTime = (date: Date | null, isAllDay: boolean) => {
    if (!date) return "";
    if (isAllDay) {
      return date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
    return date.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const duration =
    event.startDate && event.endDate
      ? formatDuration(event.startDate, event.endDate)
      : null;

  const isRecurring = !!event.recurringEventId || (event.recurrence && event.recurrence.length > 0);

  return (
    <div className="space-y-3">
      {/* Title with color indicator */}
      <div className="flex items-start gap-2">
        <div className={cn("w-1 h-14 rounded-full", colors.background)} />
        <div className="flex-1 min-w-0">
          <Typography variant="title" className="wrap-break-word">
            {event.summary || "Untitled Event"}
          </Typography>
          {event.accountEmail && (
            <div className="flex items-center gap-1.5 mt-1">
              <div
                className="size-2 rounded-full"
                style={{ backgroundColor: accountColor.hex }}
              />
              <Typography variant="light" color="muted" className="text-xs">
                {event.accountEmail}
              </Typography>
            </div>
          )}
          {event.status && event.status !== "confirmed" && (
            <Typography variant="light" color="muted" className="mt-1 capitalize">
              {event.status}
            </Typography>
          )}
        </div>
      </div>

      {/* Date and Time */}
      <div className="flex items-start gap-2">
        <Clock className="size-4 text-zinc-500 mt-0.5 shrink-0" />
        <div className="flex-1 flex flex-col min-w-0">
          <Typography variant="default" className="wrap-break-word">
            {formatDateTime(event.startDate, event.isAllDay)}
          </Typography>
          {event.endDate && (
            <>
              <Typography variant="default" color="muted" className="wrap-break-word">
                to {formatDateTime(event.endDate, event.isAllDay)}
              </Typography>
              {duration && (
                <Typography variant="light" color="muted" className="mt-1">
                  Duration: {duration}
                </Typography>
              )}
            </>
          )}
          {isRecurring && (
            <Typography variant="light" color="muted" className="mt-1">
              🔁 Recurring event
            </Typography>
          )}
        </div>
      </div>

      {/* Location */}
      {event.location && (
        <div className="flex items-start gap-2">
          <MapPin className="size-4 text-zinc-500 mt-0.5 shrink-0" />
          <Typography variant="default" className="wrap-break-word flex-1 min-w-0">
            {event.location}
          </Typography>
        </div>
      )}

      {/* Attendees */}
      {event.attendees && event.attendees.length > 0 && (
        <div className="flex items-start gap-2">
          <Users className="size-4 text-zinc-500 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <Typography variant="default">
              {event.attendees.length} {event.attendees.length === 1 ? "attendee" : "attendees"}
            </Typography>
            <div className="mt-1 space-y-0.5">
              {event.attendees.slice(0, 5).map((attendee, i) => (
                <Typography
                  key={i}
                  variant="light"
                  color="muted"
                  className="truncate block"
                >
                  {attendee.displayName || attendee.email}
                  {attendee.responseStatus && attendee.responseStatus !== "needsAction" && (
                    <span className="ml-1 text-xs">
                      ({attendee.responseStatus})
                    </span>
                  )}
                </Typography>
              ))}
              {event.attendees.length > 5 && (
                <Typography variant="light" color="muted">
                  +{event.attendees.length - 5} more
                </Typography>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Description */}
      {event.description && (
        <div>
          <Typography variant="default" className="font-medium mb-1">
            Description
          </Typography>
          <Typography
            variant="default"
            color="muted"
            className="whitespace-pre-wrap wrap-break-word"
          >
            {event.description}
          </Typography>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex justify-between w-full gap-2 pt-2 border-t">
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>

        {event.htmlLink && (
          <Button
            variant="secondary"
            size="sm"
            // className="flex-1"
            asChild
          >
            <a className="block" href={event.htmlLink} target="_blank" rel="noopener noreferrer">
              <Calendar className="mr-2 size-4" />
              View
              <ExternalLink className="ml-2 size-3" />
            </a>
          </Button>
        )}
        
      </div>
    </div>
  );
}
