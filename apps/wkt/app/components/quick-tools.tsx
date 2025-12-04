"use client";

import { IconButton } from "@repo/components";
import NextImage from "next/image";

export function QuickTools() {
  return (
    <section>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <IconButton
            icon={
              <NextImage
                src="/icons/stopwatch.svg"
                alt="Stopwatch"
                width={64}
                height={64}
              />
            }
            size="fill"
            variant="secondary"
            aria-label="Stopwatch"
          />
        </div>

        <div>
          <IconButton
            icon={
              <NextImage
                src="/icons/timer.svg"
                alt="Timer"
                width={64}
                height={64}
              />
            }
            size="fill"
            variant="secondary"
            aria-label="Timer"
          />
        </div>
      </div>
    </section>
  );
}
