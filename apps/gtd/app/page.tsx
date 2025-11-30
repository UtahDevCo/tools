import { Suspense } from "react";
import { OfflineBanner } from "./components/offline-banner";
import { WeeklyCalendar } from "./components/weekly-calendar";

export default function Home() {
  return (
    <>
      <OfflineBanner />
      <Suspense fallback={<CalendarSkeleton />}>
        <WeeklyCalendar />
      </Suspense>
    </>
  );
}

function CalendarSkeleton() {
  return (
    <div className="flex h-screen flex-col px-1 bg-white">
      <div className="h-14 border-b border-zinc-100 animate-pulse bg-zinc-50" />
      <div className="flex-1 p-4">
        <div className="grid grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-9 border-b-2 border-zinc-200 animate-pulse bg-zinc-50" />
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="h-9 border-b-2 border-zinc-100 animate-pulse bg-zinc-50" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
