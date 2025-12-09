"use client";

import { Play } from "lucide-react";
import { Typography } from "@repo/components";

export function StartWorkoutButton() {
  return (
    <button className="w-full text-color-foreground hover:bg-brand-hover hover:border-brand-hover transition-all p-8 active:scale-[0.98] border-8 rounded-full border-brand-border group">
      <div className="flex items-center justify-between">
        <div className="text-left">
          <Typography variant="title">
            Start Workout
          </Typography>
          <Typography variant="light">
            Quick ad-hoc session
          </Typography>
        </div>
        <div className="w-16 h-16 rounded-full bg-foreground/10 flex items-center justify-center group-hover:bg-foreground/20 transition-colors">
          <Play
            className="w-8 h-8 text-color-foreground ml-1"
            strokeWidth={2.5}
            fill="var(--color-background)"
          />
        </div>
      </div>
    </button>
  );
}
