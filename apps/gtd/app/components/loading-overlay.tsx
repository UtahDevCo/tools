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
      width="140"
      height="140"
      viewBox="0 0 140 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer orbit ring */}
      <circle
        cx="70"
        cy="70"
        r="64"
        stroke="#f4f4f5"
        strokeWidth="3"
        fill="none"
      />
      
      {/* Animated progress arc - spins slowly */}
      <circle
        cx="70"
        cy="70"
        r="64"
        stroke="url(#loadingGradient)"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        strokeDasharray="402"
        strokeDashoffset="301"
        className="animate-spin-slow origin-center"
        style={{ transformOrigin: "70px 70px" }}
      />
      
      {/* Inner content area */}
      <g className="animate-bounce-subtle">
        {/* Clipboard/task list base */}
        <rect
          x="45"
          y="40"
          width="50"
          height="65"
          rx="4"
          fill="#fff"
          stroke="#f97316"
          strokeWidth="2.5"
        />
        
        {/* Clipboard clip */}
        <rect
          x="55"
          y="36"
          width="30"
          height="12"
          rx="2"
          fill="#fb923c"
        />
        <circle cx="70" cy="42" r="3" fill="#fff" />
        
        {/* Task lines with checkboxes - animated opacity */}
        <g className="animate-task-check">
          {/* Task 1 - checked */}
          <rect x="52" y="56" width="8" height="8" rx="1.5" stroke="#22c55e" strokeWidth="1.5" fill="none" />
          <path d="M54 60L56.5 62.5L59 57.5" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="64" y="58" width="24" height="4" rx="2" fill="#e4e4e7" />
          
          {/* Task 2 - in progress */}
          <rect x="52" y="70" width="8" height="8" rx="1.5" stroke="#f97316" strokeWidth="1.5" fill="none" />
          <rect x="64" y="72" width="24" height="4" rx="2" fill="#fed7aa" className="animate-pulse" />
          
          {/* Task 3 - pending */}
          <rect x="52" y="84" width="8" height="8" rx="1.5" stroke="#d4d4d8" strokeWidth="1.5" fill="none" />
          <rect x="64" y="86" width="24" height="4" rx="2" fill="#f4f4f5" />
        </g>
      </g>
      
      {/* Floating checkmark particles - orbit around the clipboard */}
      <g className="animate-orbit" style={{ transformOrigin: "70px 70px" }}>
        <circle cx="70" cy="8" r="6" fill="#f97316" opacity="0.8" />
        <path d="M67 8L69 10L73 6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      
      <g className="animate-orbit-delayed" style={{ transformOrigin: "70px 70px" }}>
        <circle cx="70" cy="132" r="5" fill="#fb923c" opacity="0.6" />
        <path d="M68 132L69.5 133.5L72 131" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      
      {/* Gradient definition */}
      <defs>
        <linearGradient id="loadingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f97316" />
          <stop offset="50%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#fdba74" />
        </linearGradient>
      </defs>
    </svg>
  );
}
