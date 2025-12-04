"use client";

import { Play } from "lucide-react";
import { Typography } from "@repo/components";

export function StartWorkoutButton() {
  return (
    <button className="w-full hover:bg-brand-hover transition-all rounded-2xl p-8 active:scale-[0.98] border-2 border-brand-border group">
      <div className="flex items-center justify-between">
        <div className="text-left">
          <Typography variant="title" className="text-black">
            Start Workout
          </Typography>
          <Typography variant="light" className="text-black/70">
            Quick ad-hoc session
          </Typography>
        </div>
        <div className="w-16 h-16 rounded-full bg-black/10 flex items-center justify-center group-hover:bg-black/20 transition-colors">
          <Play
            className="w-8 h-8 text-black ml-1"
            strokeWidth={2.5}
            fill="black"
          />
        </div>
      </div>
    </button>
  );
}
