"use client";

import { IconButton } from "@repo/components";
import { StopwatchIcon, TimerIcon } from "./icons";

export function QuickTools() {
  return (
    <section>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <IconButton
            icon={<StopwatchIcon className="w-16 h-16" />}
            size="fill"
            variant="ghost"
            aria-label="Stopwatch"
          />
        </div>

        <div>
          <IconButton
            icon={<TimerIcon className="w-16 h-16" />}
            size="fill"
            variant="ghost"
            aria-label="Timer"
          />
        </div>
      </div>
    </section>
  );
}
