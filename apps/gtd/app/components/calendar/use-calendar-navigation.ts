"use client";

import { useState, useCallback } from "react";

type CalendarState = {
  dayOffset: number;
};

/**
 * Hook to manage calendar navigation state (previous, next, today)
 */
export function useCalendarNavigation() {
  const [dayOffset, setDayOffset] = useState(0);

  const handlePrevious = useCallback(() => {
    setDayOffset((prev) => prev - 4);
  }, []);

  const handleNext = useCallback(() => {
    setDayOffset((prev) => prev + 4);
  }, []);

  const handleToday = useCallback(() => {
    setDayOffset(0);
  }, []);

  const isAtToday = dayOffset === 0;

  return {
    dayOffset,
    isAtToday,
    handlePrevious,
    handleNext,
    handleToday,
  };
}
