"use client";

import { useEffect } from "react";

/**
 * Freezes scroll on the body when active.
 * Useful for modals and overlay drawers to prevent background scrolling.
 */
export function useFreezeScroll(isActive: boolean) {
  useEffect(() => {
    if (!isActive) return;

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;

    // Calculate scrollbar width to prevent layout shift
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [isActive]);
}
