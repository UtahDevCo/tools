"use client";

import { ChevronLeft, ChevronRight, MoreVertical } from "lucide-react";
import {
  Typography,
  Avatar,
  AvatarFallback,
  Button,
  cn,
} from "@repo/components";

type WeekDay = {
  date: Date;
  isToday: boolean;
};

type WeeklyCalendarProps = {
  className?: string;
};

const WEEKDAY_TASK_ROWS = 10;
const WEEKEND_TASK_ROWS = 4;

export function WeeklyCalendar({ className }: WeeklyCalendarProps) {
  const today = new Date();
  const weekDays = getWeekDays(today);
  const monthYear = formatMonthYear(today);

  // Split into weekdays (Mon-Fri) and weekend (Sat-Sun)
  const weekdays = weekDays.slice(0, 5);
  const weekend = weekDays.slice(5);

  return (
    <div className={cn("flex h-screen flex-col px-1 bg-white", className)}>
      <CalendarHeader monthYear={monthYear} />
      <div className="flex-1 overflow-y-auto">
        <WeekGrid weekdays={weekdays} weekend={weekend} />
      </div>
    </div>  
  );
}

function CalendarHeader({ monthYear }: { monthYear: string }) {
  return (
    <header className="flex items-center justify-between px-3 pt-4 pb-10">
      <Typography variant="headline">{monthYear}</Typography>
      <div className="flex items-center gap-2">
        <Avatar className="size-10 bg-zinc-800 text-white">
          <AvatarFallback className="bg-zinc-800 text-xs font-medium text-white">
            CE
          </AvatarFallback>
        </Avatar>
        <Button
          variant="ghost"
          size="icon"
          className="size-10 rounded-full bg-orange-300 hover:bg-orange-400"
        >
          <MoreVertical className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-10 rounded-full bg-zinc-800 text-white hover:bg-zinc-700"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-10 rounded-full bg-zinc-800 text-white hover:bg-zinc-700"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </header>
  );
}

function WeekGrid({
  weekdays,
  weekend,
}: {
  weekdays: WeekDay[];
  weekend: WeekDay[];
}) {
  return (
    <div className="flex flex-col gap-2 px-4 pb-4">
      {/* Week days row */}
      <div className="flex flex-col gap-2 lg:flex-row lg:gap-6 mb-8">
        {/* Mobile: All days stacked vertically */}
        {/* Desktop: Weekday columns (Mon-Fri) */}
        {weekdays.map((day) => (
          <DayColumn key={day.date.toISOString()} day={day} />
        ))}

        {/* Mobile: Weekend days as individual rows */}
        {/* Desktop: Weekend column (Sat + Sun stacked) */}
        <div className="hidden lg:flex lg:flex-1 lg:flex-col">
          <WeekendColumn weekend={weekend} />
        </div>
        <div className="flex flex-col gap-2 lg:hidden">
          {weekend.map((day) => (
            <DayColumn key={day.date.toISOString()} day={day} />
          ))}
        </div>
      </div>

      {/* Full-width sections */}
      <SectionColumn title="Next" />
      <SectionColumn title="Waiting" />
      <SectionColumn title="Someday" />
    </div>
  );
}

const SECTION_TASK_ROWS = 4;

function DayColumn({ day }: { day: WeekDay }) {
  const dayNum = day.date.getDate();
  const monthShort = day.date.toLocaleDateString("en-US", { month: "short" });
  const dayName = day.date.toLocaleDateString("en-US", { weekday: "short" });

  return (
    <div className="flex flex-col lg:flex-1">
      {/* Day header */}
      <DayHeader
        dayNum={dayNum}
        monthShort={monthShort}
        dayName={dayName}
        isToday={day.isToday}
      />

      {/* Mobile: Single task row */}
      <div className="lg:hidden">
        <TaskRow />
      </div>

      {/* Desktop: Multiple task rows */}
      <div className="hidden lg:block">
        {Array.from({ length: WEEKDAY_TASK_ROWS }).map((_, i) => (
          <TaskRow key={i} />
        ))}
      </div>
    </div>
  );
}

function SectionColumn({ title }: { title: string }) {
  return (
    <div className="flex w-full flex-col">
      {/* Section header */}
      <SectionHeader title={title} />

      {/* Mobile: Single task row */}
      <div className="md:hidden">
        <TaskRow />
      </div>

      {/* Desktop: Multiple task rows */}
      <div className="hidden md:block">
        {Array.from({ length: SECTION_TASK_ROWS }).map((_, i) => (
          <TaskRow key={i} />
        ))}
      </div>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex h-9 items-center border-black border-b-2">
      <Typography variant="title" className="text-zinc-900">
        {title}
      </Typography>
    </div>
  );
}

function WeekendColumn({ weekend }: { weekend: WeekDay[] }) {
  const [saturday, sunday] = weekend;

  const satDayNum = saturday.date.getDate();
  const satMonthShort = saturday.date.toLocaleDateString("en-US", {
    month: "short",
  });
  const satDayName = saturday.date.toLocaleDateString("en-US", {
    weekday: "short",
  });

  const sunDayNum = sunday.date.getDate();
  const sunMonthShort = sunday.date.toLocaleDateString("en-US", {
    month: "short",
  });
  const sunDayName = sunday.date.toLocaleDateString("en-US", {
    weekday: "short",
  });

  return (
    <div className="flex flex-1 flex-col">
      {/* Saturday header */}
      <DayHeader
        dayNum={satDayNum}
        monthShort={satMonthShort}
        dayName={satDayName}
        isToday={saturday.isToday}
      />

      {/* Saturday task rows */}
      {Array.from({ length: WEEKEND_TASK_ROWS }).map((_, i) => (
        <TaskRow key={`sat-${i}`} />
      ))}

      {/* Sunday header */}

      <TaskRow className="border-0" key={`sun-padding`} />
      <DayHeader
        dayNum={sunDayNum}
        monthShort={sunMonthShort}
        dayName={sunDayName}
        isToday={sunday.isToday}
      />

      {/* Sunday task rows */}
      {Array.from({ length: WEEKEND_TASK_ROWS }).map((_, i) => (
        <TaskRow key={`sun-${i}`} />
      ))}
    </div>
  );
}

function DayHeader({
  className,
  dayNum,
  monthShort,
  dayName,
  isToday,
}: {
  className?: string;
  dayNum: number;
  monthShort: string;
  dayName: string;
  isToday: boolean;
}) {
  return (
    <div
      className={cn(
        "flex h-9 items-center justify-between border-black border-b-2",
        isToday && "border-b-orange-500",
        className
      )}
    >
      <Typography
        variant="title"
        className={cn(isToday ? "text-orange-500" : "text-zinc-900")}
      >
        {dayNum} {monthShort}
      </Typography>
      <Typography
        variant="title"
        color="muted"
        className={cn('font-light', isToday && "text-orange-500")}
      >
        {dayName}
      </Typography>
    </div>
  );
}

function TaskRow({ className }: { className?: string }) {
  return <div className={cn("h-9 border-b-2 border-zinc-100", className)} />;
}

// Helper functions

function getWeekDays(date: Date): WeekDay[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get Monday of the current week
  const dayOfWeek = date.getDay();
  const monday = new Date(date);
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  monday.setDate(date.getDate() + diff);
  monday.setHours(0, 0, 0, 0);

  const weekDays: WeekDay[] = [];

  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    day.setHours(0, 0, 0, 0);

    weekDays.push({
      date: day,
      isToday: day.getTime() === today.getTime(),
    });
  }

  return weekDays;
}

function formatMonthYear(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}
