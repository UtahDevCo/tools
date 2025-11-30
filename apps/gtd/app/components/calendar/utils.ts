/**
 * Helper functions for calendar date calculations
 */

import type { WeekDay, DayColumn } from "./types";

/**
 * Generate days and columns for a 4-column week view.
 * Combines weekdays as individual columns and groups weekends together.
 */
export function getDaysForFourColumns(startDate: Date): { days: WeekDay[]; columns: DayColumn[] } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days: WeekDay[] = [];
  const columns: DayColumn[] = [];
  const currentDate = new Date(startDate);

  // Keep adding days until we have 4 columns
  while (columns.length < 4) {
    const day = new Date(currentDate);
    day.setHours(0, 0, 0, 0);

    const weekDay: WeekDay = {
      date: day,
      isToday: day.getTime() === today.getTime(),
    };

    days.push(weekDay);

    if (isWeekend(day)) {
      // Check if the last column is already a weekend we can add to
      const lastColumn = columns[columns.length - 1];
      if (lastColumn && lastColumn.type === "weekend") {
        lastColumn.days.push(weekDay);
      } else {
        columns.push({ type: "weekend", days: [weekDay] });
      }
    } else {
      columns.push({ type: "weekday", day: weekDay });
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return { days, columns };
}

/**
 * Check if a date falls on a weekend (Saturday or Sunday)
 */
export function isWeekend(date: Date): boolean {
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6; // Sunday = 0, Saturday = 6
}

/**
 * Format a date range as a string (e.g., "January 15-18, 2024")
 */
export function formatDateRange(days: WeekDay[], short: boolean = false): string {
  if (days.length === 0) return "";

  const firstDay = days[0];
  const lastDay = days[days.length - 1];

  const firstMonth = firstDay.date.toLocaleDateString("en-US", { month: short ? "short" : "long" });
  const lastMonth = lastDay.date.toLocaleDateString("en-US", { month: short ? "short" : "long" });
  const firstDate = firstDay.date.getDate();
  const lastDate = lastDay.date.getDate();
  const year = firstDay.date.getFullYear();

  // Same month
  if (firstMonth === lastMonth) {
    return `${firstMonth} ${firstDate}-${lastDate}, ${year}`;
  }

  // Different months
  return `${firstMonth} ${firstDate} - ${lastMonth} ${lastDate}, ${year}`;
}
