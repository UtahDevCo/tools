"use client";

import { Typography } from "@repo/components";

type RoutineCardProps = {
  name: string;
  lastDone?: string;
  exercises?: number;
  variant?: "repeat-last" | "saved";
};

export function RoutineCard({
  name,
  lastDone,
  exercises,
  variant = "saved",
}: RoutineCardProps) {
  const isRepeatLast = variant === "repeat-last";

  return (
    <button      className={`w-full bg-app-surface-raised hover:bg-app-surface-hover transition-all p-5 border-8 border-app-border active:scale-[0.98] group text-left`}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-left">
            <Typography variant="strong">{name}</Typography>
          </div>
          {!isRepeatLast && lastDone && (
            <div className="flex items-center gap-4">
              <Typography
                variant="light"
                color="muted"
                className="tracking-wider"
              >
                {lastDone}
              </Typography>
              {exercises !== undefined && (
                <>
                  <span className="text-muted-foreground">•</span>
                  <Typography
                    variant="light"
                    color="muted"
                    className="tracking-wider"
                  >
                    {exercises} Exercises
                  </Typography>
                </>
              )}
            </div>
          )}
        </div>
        <div className="text-brand text-xl group-hover:translate-x-1 transition-transform">
          →
        </div>
      </div>
    </button>
  );
}
