"use client";

import { cn } from "@repo/components";

type LoadingOverlayProps = {
  className?: string;
};

export function LoadingOverlay({ className }: LoadingOverlayProps) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-white/90",
        className
      )}
    >
      <div className="flex flex-col items-center gap-6">
        <GTDLoadingAnimation />
        <p className="text-sm text-zinc-500 animate-pulse">Loading your tasks...</p>
      </div>
    </div>
  );
}

function GTDLoadingAnimation() {
  return (
    <svg
      width="100"
      height="100"
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* White circle background */}
      <circle cx="50" cy="50" r="40" fill="#ffffff" />

      {/* Orange checkmark */}
      <path
        d="M32 50 L45 63 L68 38"
        fill="none"
        stroke="#f97316"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Spinning border */}
      <g className="animate-gtd-spin" style={{ transformOrigin: "50px 50px" }}>
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke="#f97316"
          strokeWidth="6"
          strokeDasharray="60, 191"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}
