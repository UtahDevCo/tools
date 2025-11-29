"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, MoreVertical, Circle, CheckCircle2 } from "lucide-react";
import {
  Typography,
  Button,
  cn,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  Popover,
  PopoverTrigger,
  PopoverContent,
  useKeydown,
} from "@repo/components";
import { UserAvatar } from "@/components/user-avatar";
import { useTasks } from "@/providers/tasks-provider";
import { type TaskWithParsedDate } from "@/lib/google-tasks/types";

type WeekDay = {
  date: Date;
  isToday: boolean;
};

type DayColumn = 
  | { type: "weekday"; day: WeekDay }
  | { type: "weekend"; days: WeekDay[] };

type WeeklyCalendarProps = {
  className?: string;
};

const WEEKDAY_TASK_ROWS = 10;
const WEEKEND_TASK_ROWS = 4;

export function WeeklyCalendar({ className }: WeeklyCalendarProps) {
  const [dayOffset, setDayOffset] = useState(0);
  const { getTasksForDate, getTasksWithoutDueDate, isLoading: tasksLoading, error, needsReauth } = useTasks();

  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() + dayOffset);

  const days = getFourDays(startDate);
  const columns = groupDaysIntoColumns(days);
  const headerText = formatDateRange(days);

  // Get tasks without due dates for "Someday" section
  const somedayTasks = getTasksWithoutDueDate();

  const handlePrevious = useCallback(() => {
    setDayOffset((prev) => prev - 4);
  }, []);

  const handleNext = useCallback(() => {
    setDayOffset((prev) => prev + 4);
  }, []);

  const handleToday = useCallback(() => {
    setDayOffset(0);
  }, []);

  const handleKeydown = useCallback(
    (event: Event) => {
      const e = event as KeyboardEvent;
      // Ignore if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        return;
      }

      if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        handlePrevious();
      } else if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        handleNext();
      }
    },
    [handlePrevious, handleNext]
  );

  useKeydown({ isActive: true, callback: handleKeydown }, [handleKeydown]);

  const isAtToday = dayOffset === 0;

  return (
    <div className={cn("flex h-screen flex-col px-1 bg-white", className)}>
      <CalendarHeader
        headerText={headerText}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onToday={handleToday}
        isAtToday={isAtToday}
      />
      {error && (
        <div className="mx-4 mb-2 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {needsReauth ? "Please sign in to view your tasks." : error}
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        <WeekGrid 
          columns={columns} 
          getTasksForDate={getTasksForDate}
          somedayTasks={somedayTasks}
          tasksLoading={tasksLoading}
        />
      </div>
    </div>
  );
}

type CalendarHeaderProps = {
  headerText: string;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  isAtToday: boolean;
};

function CalendarHeader({
  headerText,
  onPrevious,
  onNext,
  onToday,
  isAtToday,
}: CalendarHeaderProps) {
  return (
    <header className="flex items-center justify-between px-3 pt-4 pb-10">
      <Typography variant="headline">{headerText}</Typography>
      <div className="flex items-center gap-2">
        <UserAvatar />
        <SettingsPopover />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-10 rounded-full bg-zinc-800 text-white hover:bg-zinc-700"
              onClick={onPrevious}
            >
              <ChevronLeft className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Previous (P)</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-10 rounded-full px-4 text-white",
                isAtToday
                  ? "bg-zinc-400 cursor-not-allowed"
                  : "bg-orange-500 hover:bg-orange-600"
              )}
              onClick={onToday}
              disabled={isAtToday}
            >
              Today
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Go to today</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-10 rounded-full bg-zinc-800 text-white hover:bg-zinc-700"
              onClick={onNext}
            >
              <ChevronRight className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Next (N)</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
}

function SettingsPopover() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-10 rounded-full bg-orange-300 hover:bg-orange-400"
        >
          <MoreVertical className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-48">
        <nav className="flex flex-col gap-2">
          <Link
            href="/playground/typography"
            className="text-sm hover:text-orange-500 transition-colors"
          >
            Typography Playground
          </Link>
        </nav>
      </PopoverContent>
    </Popover>
  );
}

function WeekGrid({ 
  columns, 
  getTasksForDate,
  somedayTasks,
  tasksLoading,
}: { 
  columns: DayColumn[];
  getTasksForDate: (date: Date) => TaskWithParsedDate[];
  somedayTasks: TaskWithParsedDate[];
  tasksLoading: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 px-4 pb-4">
      {/* Day columns row */}
      <div className="flex flex-col gap-2 lg:flex-row lg:gap-6 mb-8">
        {columns.map((column, index) => {
          if (column.type === "weekday") {
            const tasks = getTasksForDate(column.day.date);
            return (
              <WeekdayColumn 
                key={column.day.date.toISOString()} 
                day={column.day}
                tasks={tasks}
                tasksLoading={tasksLoading}
              />
            );
          }
          return (
            <div key={`weekend-${index}`} className="hidden lg:flex lg:flex-1 lg:flex-col">
              <WeekendColumn 
                weekend={column.days}
                getTasksForDate={getTasksForDate}
                tasksLoading={tasksLoading}
              />
            </div>
          );
        })}

        {/* Mobile: Weekend days as individual rows */}
        <div className="flex flex-col gap-2 lg:hidden">
          {columns
            .filter((col): col is DayColumn & { type: "weekend" } => col.type === "weekend")
            .flatMap((col) => col.days)
            .map((day) => {
              const tasks = getTasksForDate(day.date);
              return (
                <WeekdayColumn 
                  key={day.date.toISOString()} 
                  day={day}
                  tasks={tasks}
                  tasksLoading={tasksLoading}
                />
              );
            })}
        </div>
      </div>

      {/* Full-width sections */}
      {/* TODO: Implement task filtering for "Next" section (tasks with near-term due dates) */}
      <SectionColumn title="Next" tasks={[]} />
      {/* TODO: Implement task filtering for "Waiting" section (tasks blocked on others) */}
      <SectionColumn title="Waiting" tasks={[]} />
      <SectionColumn title="Someday" tasks={somedayTasks} />
    </div>
  );
}

const SECTION_TASK_ROWS = 4;

function WeekdayColumn({ 
  day, 
  tasks,
  tasksLoading,
}: { 
  day: WeekDay;
  tasks: TaskWithParsedDate[];
  tasksLoading: boolean;
}) {
  const dayNum = day.date.getDate();
  const monthShort = day.date.toLocaleDateString("en-US", { month: "short" });
  const dayName = day.date.toLocaleDateString("en-US", { weekday: "short" });

  // Calculate empty rows needed
  const emptyRowCount = Math.max(0, WEEKDAY_TASK_ROWS - tasks.length);

  return (
    <div className="flex flex-col lg:flex-1">
      {/* Day header */}
      <DayHeader
        dayNum={dayNum}
        monthShort={monthShort}
        dayName={dayName}
        isToday={day.isToday}
      />

      {/* Mobile: Single task row or task list */}
      <div className="lg:hidden">
        {tasksLoading ? (
          <TaskRow />
        ) : tasks.length > 0 ? (
          tasks.map((task) => <TaskItem key={task.id} task={task} />)
        ) : (
          <TaskRow />
        )}
      </div>

      {/* Desktop: Task items + empty rows */}
      <div className="hidden lg:block">
        {tasks.map((task) => (
          <TaskItem key={task.id} task={task} />
        ))}
        {Array.from({ length: emptyRowCount }).map((_, i) => (
          <TaskRow key={i} />
        ))}
      </div>
    </div>
  );
}

function SectionColumn({ title, tasks }: { title: string; tasks: TaskWithParsedDate[] }) {
  const emptyRowCount = Math.max(0, SECTION_TASK_ROWS - tasks.length);

  return (
    <div className="flex w-full flex-col">
      {/* Section header */}
      <SectionHeader title={title} />

      {/* Mobile: Single task row or task list */}
      <div className="md:hidden">
        {tasks.length > 0 ? (
          tasks.map((task) => <TaskItem key={task.id} task={task} />)
        ) : (
          <TaskRow />
        )}
      </div>

      {/* Desktop: Task items + empty rows */}
      <div className="hidden md:block">
        {tasks.map((task) => (
          <TaskItem key={task.id} task={task} />
        ))}
        {Array.from({ length: emptyRowCount }).map((_, i) => (
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

function WeekendColumn({ 
  weekend,
  getTasksForDate,
  tasksLoading,
}: { 
  weekend: WeekDay[];
  getTasksForDate: (date: Date) => TaskWithParsedDate[];
  tasksLoading: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col">
      {weekend.map((day, index) => {
        const dayNum = day.date.getDate();
        const monthShort = day.date.toLocaleDateString("en-US", {
          month: "short",
        });
        const dayName = day.date.toLocaleDateString("en-US", {
          weekday: "short",
        });
        const tasks = getTasksForDate(day.date);
        const emptyRowCount = Math.max(0, WEEKEND_TASK_ROWS - tasks.length);

        return (
          <div key={day.date.toISOString()}>
            {/* Add spacing between weekend days */}
            {index > 0 && <TaskRow className="border-0" />}
            
            <DayHeader
              dayNum={dayNum}
              monthShort={monthShort}
              dayName={dayName}
              isToday={day.isToday}
            />

            {tasksLoading ? (
              Array.from({ length: WEEKEND_TASK_ROWS }).map((_, i) => (
                <TaskRow key={`${dayName}-${i}`} />
              ))
            ) : (
              <>
                {tasks.map((task) => (
                  <TaskItem key={task.id} task={task} />
                ))}
                {Array.from({ length: emptyRowCount }).map((_, i) => (
                  <TaskRow key={`${dayName}-${i}`} />
                ))}
              </>
            )}
          </div>
        );
      })}
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

function TaskItem({ task }: { task: TaskWithParsedDate }) {
  const isCompleted = task.status === "completed";

  return (
    <div
      className={cn(
        "flex h-9 items-center gap-2 border-b-2 border-zinc-100 px-1",
        isCompleted && "opacity-50"
      )}
    >
      {isCompleted ? (
        <CheckCircle2 className="size-4 shrink-0 text-green-500" />
      ) : (
        <Circle className="size-4 shrink-0 text-zinc-400" />
      )}
      <Typography
        variant="default"
        className={cn(
          "truncate text-sm",
          isCompleted && "line-through text-zinc-400"
        )}
      >
        {task.title}
      </Typography>
    </div>
  );
}

// Helper functions

function getFourDays(startDate: Date): WeekDay[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days: WeekDay[] = [];

  for (let i = 0; i < 4; i++) {
    const day = new Date(startDate);
    day.setDate(startDate.getDate() + i);
    day.setHours(0, 0, 0, 0);

    days.push({
      date: day,
      isToday: day.getTime() === today.getTime(),
    });
  }

  return days;
}

function isWeekend(date: Date): boolean {
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6; // Sunday = 0, Saturday = 6
}

function groupDaysIntoColumns(days: WeekDay[]): DayColumn[] {
  const columns: DayColumn[] = [];
  let i = 0;

  while (i < days.length) {
    const currentDay = days[i];

    if (isWeekend(currentDay.date)) {
      // Collect consecutive weekend days
      const weekendDays: WeekDay[] = [currentDay];
      i++;

      while (i < days.length && isWeekend(days[i].date)) {
        weekendDays.push(days[i]);
        i++;
      }

      columns.push({ type: "weekend", days: weekendDays });
    } else {
      columns.push({ type: "weekday", day: currentDay });
      i++;
    }
  }

  return columns;
}

function formatDateRange(days: WeekDay[]): string {
  if (days.length === 0) return "";

  const firstDay = days[0];
  const lastDay = days[days.length - 1];

  const firstMonth = firstDay.date.toLocaleDateString("en-US", { month: "long" });
  const lastMonth = lastDay.date.toLocaleDateString("en-US", { month: "long" });
  const year = lastDay.date.getFullYear();

  // If same month, show "November 2025"
  // If different months, show "Nov - Dec 2025"
  if (firstMonth === lastMonth) {
    return `${firstMonth} ${year}`;
  }

  const firstMonthShort = firstDay.date.toLocaleDateString("en-US", { month: "short" });
  const lastMonthShort = lastDay.date.toLocaleDateString("en-US", { month: "short" });
  return `${firstMonthShort} - ${lastMonthShort} ${year}`;
}
