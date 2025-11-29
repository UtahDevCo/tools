"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, MoreVertical, Circle, CheckCircle2, ChevronDown, ArrowUpDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
  useLocalforage,
} from "@repo/components";
import { UserAvatar } from "@/components/user-avatar";
import { useTasks, type TaskWithListInfo } from "@/providers/tasks-provider";
import { type TaskWithParsedDate, type TaskList } from "@/lib/google-tasks/types";
import { TaskEditDrawer } from "./task-edit-drawer";

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

type ListSortOrder = "alphabetical" | "taskCount" | "updated";
type CollapsedState = Record<string, boolean>;
type SortPreference = { sortOrder: ListSortOrder };

const WEEKDAY_TASK_ROWS = 10;
const WEEKEND_TASK_ROWS = 4;
const LOCALFORAGE_KEYS = {
  COLLAPSED: "gtd-list-collapsed-state",
  SORT: "gtd-list-sort-preference",
};

export function WeeklyCalendar({ className }: WeeklyCalendarProps) {
  const [dayOffset, setDayOffset] = useState(0);
  const { 
    getTasksForDate, 
    nextTasks, 
    waitingTasks, 
    somedayTasks, 
    otherLists,
    isLoading: tasksLoading, 
    error, 
    needsReauth 
  } = useTasks();

  // Selected task for drawer
  const [selectedTask, setSelectedTask] = useState<TaskWithListInfo | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Localforage for collapsed state and sort order
  const {
    values: [collapsedState, sortPreference],
    setItem,
    isLoaded: prefsLoaded,
  } = useLocalforage<[CollapsedState | null, SortPreference | null]>(
    [LOCALFORAGE_KEYS.COLLAPSED, LOCALFORAGE_KEYS.SORT],
    { storeName: "gtd-settings" }
  );

  const currentCollapsed = collapsedState ?? {};
  const currentSortOrder: ListSortOrder = sortPreference?.sortOrder ?? "alphabetical";

  const toggleCollapsed = useCallback(
    (listId: string) => {
      const newState = { ...currentCollapsed, [listId]: !currentCollapsed[listId] };
      setItem(LOCALFORAGE_KEYS.COLLAPSED, newState);
    },
    [currentCollapsed, setItem]
  );

  const setSortOrder = useCallback(
    (order: ListSortOrder) => {
      setItem(LOCALFORAGE_KEYS.SORT, { sortOrder: order });
    },
    [setItem]
  );

  // Sort other lists based on preference
  const sortedOtherLists = useMemo(() => {
    const lists = [...otherLists];
    switch (currentSortOrder) {
      case "alphabetical":
        return lists.sort((a, b) => a.displayName.localeCompare(b.displayName));
      case "taskCount":
        return lists.sort((a, b) => b.tasks.length - a.tasks.length);
      case "updated":
        return lists.sort((a, b) => {
          const aUpdated = a.taskList.updated ?? "";
          const bUpdated = b.taskList.updated ?? "";
          return bUpdated.localeCompare(aUpdated);
        });
      default:
        return lists;
    }
  }, [otherLists, currentSortOrder]);

  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() + dayOffset);

  const { days, columns } = getDaysForFourColumns(startDate);
  const headerText = formatDateRange(days);

  const handlePrevious = useCallback(() => {
    setDayOffset((prev) => prev - 4);
  }, []);

  const handleNext = useCallback(() => {
    setDayOffset((prev) => prev + 4);
  }, []);

  const handleToday = useCallback(() => {
    setDayOffset(0);
  }, []);

  const handleTaskClick = useCallback((task: TaskWithListInfo) => {
    setSelectedTask(task);
    setDrawerOpen(true);
  }, []);

  const handleDrawerClose = useCallback(() => {
    setDrawerOpen(false);
    setSelectedTask(null);
  }, []);

  const handleKeydown = useCallback(
    (event: Event) => {
      const e = event as KeyboardEvent;
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
          nextTasks={nextTasks}
          waitingTasks={waitingTasks}
          somedayTasks={somedayTasks}
          otherLists={sortedOtherLists}
          tasksLoading={tasksLoading}
          collapsedState={currentCollapsed}
          onToggleCollapsed={toggleCollapsed}
          sortOrder={currentSortOrder}
          onSortOrderChange={setSortOrder}
          onTaskClick={handleTaskClick}
        />
      </div>
      <TaskEditDrawer
        task={selectedTask}
        open={drawerOpen}
        onClose={handleDrawerClose}
      />
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

type OtherListData = {
  taskList: TaskList;
  displayName: string;
  tasks: TaskWithListInfo[];
};

type WeekGridProps = {
  columns: DayColumn[];
  getTasksForDate: (date: Date) => TaskWithListInfo[];
  nextTasks: TaskWithListInfo[];
  waitingTasks: TaskWithListInfo[];
  somedayTasks: TaskWithListInfo[];
  otherLists: OtherListData[];
  tasksLoading: boolean;
  collapsedState: CollapsedState;
  onToggleCollapsed: (listId: string) => void;
  sortOrder: ListSortOrder;
  onSortOrderChange: (order: ListSortOrder) => void;
  onTaskClick: (task: TaskWithListInfo) => void;
};

function WeekGrid({ 
  columns, 
  getTasksForDate,
  nextTasks,
  waitingTasks,
  somedayTasks,
  otherLists,
  tasksLoading,
  collapsedState,
  onToggleCollapsed,
  sortOrder,
  onSortOrderChange,
  onTaskClick,
}: WeekGridProps) {
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
                onTaskClick={onTaskClick}
              />
            );
          }
          return (
            <div key={`weekend-${index}`} className="hidden lg:flex lg:flex-1 lg:flex-col">
              <WeekendColumn 
                weekend={column.days}
                getTasksForDate={getTasksForDate}
                tasksLoading={tasksLoading}
                onTaskClick={onTaskClick}
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
                  onTaskClick={onTaskClick}
                />
              );
            })}
        </div>
      </div>

      {/* GTD Sections */}
      <SectionColumn title="Next" tasks={nextTasks} onTaskClick={onTaskClick} />
      <SectionColumn title="Waiting" tasks={waitingTasks} onTaskClick={onTaskClick} />
      <SectionColumn title="Someday" tasks={somedayTasks} onTaskClick={onTaskClick} />

      {/* Other Lists Section */}
      {otherLists.length > 0 && (
        <OtherListsSection
          lists={otherLists}
          collapsedState={collapsedState}
          onToggleCollapsed={onToggleCollapsed}
          sortOrder={sortOrder}
          onSortOrderChange={onSortOrderChange}
          onTaskClick={onTaskClick}
        />
      )}
    </div>
  );
}

const SECTION_TASK_ROWS = 4;

type OtherListsSectionProps = {
  lists: OtherListData[];
  collapsedState: CollapsedState;
  onToggleCollapsed: (listId: string) => void;
  sortOrder: ListSortOrder;
  onSortOrderChange: (order: ListSortOrder) => void;
  onTaskClick: (task: TaskWithListInfo) => void;
};

function OtherListsSection({
  lists,
  collapsedState,
  onToggleCollapsed,
  sortOrder,
  onSortOrderChange,
  onTaskClick,
}: OtherListsSectionProps) {
  return (
    <div className="mt-8">
      {/* Section header with sort control */}
      <div className="flex items-center justify-between border-black border-b-2 h-9 mb-4">
        <Typography variant="title" className="text-zinc-900">
          Other Lists
        </Typography>
        <SortOrderDropdown sortOrder={sortOrder} onSortOrderChange={onSortOrderChange} />
      </div>

      {/* Grid of collapsible lists - up to 3 columns, stacks on narrow screens */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {lists.map((list) => (
          <CollapsibleListCard
            key={list.taskList.id}
            list={list}
            isCollapsed={collapsedState[list.taskList.id] ?? false}
            onToggle={() => onToggleCollapsed(list.taskList.id)}
            onTaskClick={onTaskClick}
          />
        ))}
      </div>
    </div>
  );
}

type SortOrderDropdownProps = {
  sortOrder: ListSortOrder;
  onSortOrderChange: (order: ListSortOrder) => void;
};

function SortOrderDropdown({ sortOrder, onSortOrderChange }: SortOrderDropdownProps) {
  const sortOptions: { value: ListSortOrder; label: string }[] = [
    { value: "alphabetical", label: "A-Z" },
    { value: "taskCount", label: "Task Count" },
    { value: "updated", label: "Recently Updated" },
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
          <ArrowUpDown className="h-3 w-3" />
          Sort
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-40 p-1">
        <div className="flex flex-col">
          {sortOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onSortOrderChange(option.value)}
              className={cn(
                "px-2 py-1.5 text-sm text-left rounded hover:bg-zinc-100 transition-colors",
                sortOrder === option.value && "bg-zinc-100 font-medium"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

type CollapsibleListCardProps = {
  list: OtherListData;
  isCollapsed: boolean;
  onToggle: () => void;
  onTaskClick: (task: TaskWithListInfo) => void;
};

function CollapsibleListCard({ list, isCollapsed, onToggle, onTaskClick }: CollapsibleListCardProps) {
  return (
    <div className="border border-zinc-200 rounded-lg overflow-hidden">
      {/* List header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 bg-zinc-50 hover:bg-zinc-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Typography variant="label" className="text-zinc-900 font-medium">
            {list.displayName}
          </Typography>
          <span className="text-xs text-zinc-500">({list.tasks.length})</span>
        </div>
        <motion.div
          animate={{ rotate: isCollapsed ? -90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="h-4 w-4 text-zinc-500" />
        </motion.div>
      </button>

      {/* Collapsible content with AnimatePresence */}
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-1 py-1">
              {list.tasks.length === 0 ? (
                <div className="px-2 py-3 text-sm text-zinc-400 text-center">
                  No tasks
                </div>
              ) : (
                list.tasks.map((task) => (
                  <TaskItem 
                    key={task.id} 
                    task={task} 
                    onClick={() => onTaskClick(task)}
                  />
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function WeekdayColumn({ 
  day, 
  tasks,
  tasksLoading,
  onTaskClick,
}: { 
  day: WeekDay;
  tasks: TaskWithListInfo[];
  tasksLoading: boolean;
  onTaskClick: (task: TaskWithListInfo) => void;
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
          tasks.map((task) => (
            <TaskItem 
              key={task.id} 
              task={task} 
              onClick={() => onTaskClick(task)}
            />
          ))
        ) : (
          <TaskRow />
        )}
      </div>

      {/* Desktop: Task items + empty rows */}
      <div className="hidden lg:block">
        {tasks.map((task) => (
          <TaskItem 
            key={task.id} 
            task={task} 
            onClick={() => onTaskClick(task)}
          />
        ))}
        {Array.from({ length: emptyRowCount }).map((_, i) => (
          <TaskRow key={i} />
        ))}
      </div>
    </div>
  );
}

function SectionColumn({ 
  title, 
  tasks,
  onTaskClick,
}: { 
  title: string; 
  tasks: TaskWithListInfo[];
  onTaskClick: (task: TaskWithListInfo) => void;
}) {
  const emptyRowCount = Math.max(0, SECTION_TASK_ROWS - tasks.length);

  return (
    <div className="flex w-full flex-col">
      {/* Section header */}
      <SectionHeader title={title} />

      {/* Mobile: Single task row or task list */}
      <div className="md:hidden">
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <TaskItem 
              key={task.id} 
              task={task} 
              onClick={() => onTaskClick(task)}
            />
          ))
        ) : (
          <TaskRow />
        )}
      </div>

      {/* Desktop: Task items + empty rows */}
      <div className="hidden md:block">
        {tasks.map((task) => (
          <TaskItem 
            key={task.id} 
            task={task} 
            onClick={() => onTaskClick(task)}
          />
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
  onTaskClick,
}: { 
  weekend: WeekDay[];
  getTasksForDate: (date: Date) => TaskWithListInfo[];
  tasksLoading: boolean;
  onTaskClick: (task: TaskWithListInfo) => void;
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
                  <TaskItem 
                    key={task.id} 
                    task={task} 
                    onClick={() => onTaskClick(task)}
                  />
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

function TaskItem({ 
  task, 
  onClick,
}: { 
  task: TaskWithListInfo | TaskWithParsedDate; 
  onClick?: () => void;
}) {
  const isCompleted = task.status === "completed";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-9 w-full items-center gap-2 border-b-2 border-zinc-100 px-1 text-left transition-colors hover:bg-zinc-50",
        isCompleted && "opacity-50",
        onClick && "cursor-pointer"
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
    </button>
  );
}

// Helper functions

function getDaysForFourColumns(startDate: Date): { days: WeekDay[]; columns: DayColumn[] } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days: WeekDay[] = [];
  const columns: DayColumn[] = [];
  const currentDate = new Date(startDate);

  // Keep adding days until we have 4 columns
  while (columns.length < 4) {
    const day = new Date(currentDate);
    day.setHours(0, 0, 0, 0);

    const weekDay: WeekDay = {
      date: day,
      isToday: day.getTime() === today.getTime(),
    };

    days.push(weekDay);

    if (isWeekend(day)) {
      // Check if the last column is already a weekend we can add to
      const lastColumn = columns[columns.length - 1];
      if (lastColumn && lastColumn.type === "weekend") {
        lastColumn.days.push(weekDay);
      } else {
        columns.push({ type: "weekend", days: [weekDay] });
      }
    } else {
      columns.push({ type: "weekday", day: weekDay });
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return { days, columns };
}

function isWeekend(date: Date): boolean {
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6; // Sunday = 0, Saturday = 6
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
