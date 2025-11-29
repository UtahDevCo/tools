"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, MoreVertical, Pencil, Check, Trash2, GripVertical, ArrowUpDown } from "lucide-react";
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
  toast,
} from "@repo/components";
import { UserAvatar } from "@/components/user-avatar";
import { useAuth } from "@/components/auth-provider";
import { useTasks, type TaskWithListInfo } from "@/providers/tasks-provider";
import { type TaskWithParsedDate, type TaskList } from "@/lib/google-tasks/types";
import { TaskEditDrawer } from "./task-edit-drawer";
import { LoginRequiredModal } from "./login-required-modal";

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
type SortPreference = { sortOrder: ListSortOrder };

const WEEKDAY_TASK_ROWS = 10;
const WEEKEND_TASK_ROWS = 4;
const LOCALFORAGE_KEYS = {
  SORT: "gtd-list-sort-preference",
};

export function WeeklyCalendar({ className }: WeeklyCalendarProps) {
  const [dayOffset, setDayOffset] = useState(0);
  const { isAuthenticated } = useAuth();
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
  
  // Login required modal
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  // New task creation context
  const [newTaskContext, setNewTaskContext] = useState<{
    listId: string;
    listDisplayName: string;
    dueDate?: string;
  } | null>(null);

  // Localforage for sort order preference
  const {
    values: [sortPreference],
    setItem,
  } = useLocalforage<[SortPreference | null]>(
    [LOCALFORAGE_KEYS.SORT],
    { storeName: "gtd-settings" }
  );

  const currentSortOrder: ListSortOrder = sortPreference?.sortOrder ?? "alphabetical";

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
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }
    setSelectedTask(task);
    setDrawerOpen(true);
  }, [isAuthenticated]);

  const handleDrawerClose = useCallback(() => {
    setDrawerOpen(false);
    setSelectedTask(null);
    setNewTaskContext(null);
  }, []);

  const handleNewTaskClick = useCallback((listId: string, listDisplayName: string, dueDate?: string) => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }
    setSelectedTask(null);
    setNewTaskContext({ listId, listDisplayName, dueDate });
    setDrawerOpen(true);
  }, [isAuthenticated]);

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
      } else if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        handleToday();
      }
    },
    [handlePrevious, handleNext, handleToday]
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
          sortOrder={currentSortOrder}
          onSortOrderChange={setSortOrder}
          onTaskClick={handleTaskClick}
          onNewTaskClick={handleNewTaskClick}
        />
      </div>
      <TaskEditDrawer
        task={selectedTask}
        open={drawerOpen}
        onClose={handleDrawerClose}
        defaultListId={newTaskContext?.listId}
        defaultDueDate={newTaskContext?.dueDate}
        defaultListDisplayName={newTaskContext?.listDisplayName}
      />
      <LoginRequiredModal
        open={showLoginModal}
        onClose={() => setShowLoginModal(false)}
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
            <p>Today (T)</p>
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
            href="/playground"
            className="text-sm hover:text-orange-500 transition-colors"
          >
            Playground
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
  sortOrder: ListSortOrder;
  onSortOrderChange: (order: ListSortOrder) => void;
  onTaskClick: (task: TaskWithListInfo) => void;
  onNewTaskClick: (listId: string, listDisplayName: string, dueDate?: string) => void;
};

function WeekGrid({ 
  columns, 
  getTasksForDate,
  nextTasks,
  waitingTasks,
  somedayTasks,
  otherLists,
  tasksLoading,
  sortOrder,
  onSortOrderChange,
  onTaskClick,
  onNewTaskClick,
}: WeekGridProps) {
  const { gtdLists } = useTasks();

  // Flatten all days in order for mobile view
  const allDaysInOrder = useMemo(() => {
    return columns.flatMap((column) => {
      if (column.type === "weekday") {
        return [column.day];
      }
      return column.days;
    });
  }, [columns]);

  return (
    <div className="flex flex-col gap-2 px-4 pb-4">
      {/* Desktop: Day columns row */}
      <div className="hidden lg:flex lg:flex-row lg:gap-6 mb-8">
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
                onNewTaskClick={onNewTaskClick}
                activeListId={gtdLists?.active.id}
              />
            );
          }
          return (
            <div key={`weekend-${index}`} className="flex flex-1 flex-col">
              <WeekendColumn 
                weekend={column.days}
                getTasksForDate={getTasksForDate}
                tasksLoading={tasksLoading}
                onTaskClick={onTaskClick}
                onNewTaskClick={onNewTaskClick}
                activeListId={gtdLists?.active.id}
              />
            </div>
          );
        })}
      </div>

      {/* Mobile: All days in chronological order */}
      <div className="flex flex-col gap-2 lg:hidden mb-8">
        {allDaysInOrder.map((day) => {
          const tasks = getTasksForDate(day.date);
          return (
            <WeekdayColumn 
              key={day.date.toISOString()} 
              day={day}
              tasks={tasks}
              tasksLoading={tasksLoading}
              onTaskClick={onTaskClick}
              onNewTaskClick={onNewTaskClick}
              activeListId={gtdLists?.active.id}
            />
          );
        })}
      </div>

      {/* GTD Sections with CSS columns masonry layout */}
      <div className="mt-8">
        <div className="flex items-center h-9 mb-10">
          <Typography variant="headline" className="text-zinc-900">
            GTD Lists
          </Typography>
        </div>
        <div className="columns-1 md:columns-2 lg:columns-3 gap-6">
          <SectionColumn 
            title="Next" 
            tasks={nextTasks} 
            listId={gtdLists?.next.id} 
            onTaskClick={onTaskClick} 
            onNewTaskClick={onNewTaskClick} 
          />
          <SectionColumn 
            title="Waiting" 
            tasks={waitingTasks} 
            listId={gtdLists?.waiting.id} 
            onTaskClick={onTaskClick} 
            onNewTaskClick={onNewTaskClick} 
          />
          <SectionColumn 
            title="Someday" 
            tasks={somedayTasks} 
            listId={gtdLists?.someday.id} 
            onTaskClick={onTaskClick} 
            onNewTaskClick={onNewTaskClick} 
          />
        </div>
      </div>

      {/* Other Lists Section */}
      {otherLists.length > 0 && (
        <OtherListsSection
          lists={otherLists}
          sortOrder={sortOrder}
          onSortOrderChange={onSortOrderChange}
          onTaskClick={onTaskClick}
          onNewTaskClick={onNewTaskClick}
        />
      )}
    </div>
  );
}

type OtherListsSectionProps = {
  lists: OtherListData[];
  sortOrder: ListSortOrder;
  onSortOrderChange: (order: ListSortOrder) => void;
  onTaskClick: (task: TaskWithListInfo) => void;
  onNewTaskClick: (listId: string, listDisplayName: string, dueDate?: string) => void;
};

function OtherListsSection({
  lists,
  sortOrder,
  onSortOrderChange,
  onTaskClick,
  onNewTaskClick,
}: OtherListsSectionProps) {
  return (
    <div className="mt-8">
      {/* Section header with sort control */}
      <div className="flex items-center justify-between h-9 mb-10">
        <Typography variant="headline" className="text-zinc-900">
          Other Lists
        </Typography>
        <SortOrderDropdown sortOrder={sortOrder} onSortOrderChange={onSortOrderChange} />
      </div>

      {/* CSS columns masonry layout */}
      <div className="columns-1 md:columns-2 lg:columns-3 gap-6">
        {lists.map((list) => (
          <ListColumn
            key={list.taskList.id}
            list={list}
            onTaskClick={onTaskClick}
            onNewTaskClick={onNewTaskClick}
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

type ListColumnProps = {
  list: OtherListData;
  onTaskClick: (task: TaskWithListInfo) => void;
  onNewTaskClick: (listId: string, listDisplayName: string, dueDate?: string) => void;
};

const LIST_MIN_ROWS = 1;

function ListColumn({ list, onTaskClick, onNewTaskClick }: ListColumnProps) {
  const emptyRowCount = Math.max(LIST_MIN_ROWS, LIST_MIN_ROWS - list.tasks.length);

  return (
    <div className="flex flex-col break-inside-avoid mb-6">
      {/* List header - matches DayHeader styling */}
      <ColumnHeader title={list.displayName} />

      {/* Task items */}
      {list.tasks.map((task) => (
        <ConnectedTaskItem
          key={task.id}
          task={task}
          onEdit={() => onTaskClick(task)}
        />
      ))}

      {/* Empty rows for adding new tasks */}
      {Array.from({ length: emptyRowCount }).map((_, i) => (
        <TaskRow 
          key={`empty-${i}`} 
          onClick={() => onNewTaskClick(list.taskList.id, list.displayName)}
        />
      ))}
    </div>
  );
}

function WeekdayColumn({ 
  day, 
  tasks,
  tasksLoading,
  onTaskClick,
  onNewTaskClick,
  activeListId,
}: { 
  day: WeekDay;
  tasks: TaskWithListInfo[];
  tasksLoading: boolean;
  onTaskClick: (task: TaskWithListInfo) => void;
  onNewTaskClick: (listId: string, listDisplayName: string, dueDate?: string) => void;
  activeListId?: string;
}) {
  const dayNum = day.date.getDate();
  const monthShort = day.date.toLocaleDateString("en-US", { month: "short" });
  const dayName = day.date.toLocaleDateString("en-US", { weekday: "short" });
  const dateStr = day.date.toISOString().split("T")[0];

  // Calculate empty rows needed
  const emptyRowCount = Math.max(0, WEEKDAY_TASK_ROWS - tasks.length);

  const handleEmptyRowClick = activeListId 
    ? () => onNewTaskClick(activeListId, "Active", dateStr)
    : undefined;

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
            <ConnectedTaskItem 
              key={task.id} 
              task={task} 
              onEdit={() => onTaskClick(task)}
            />
          ))
        ) : (
          <TaskRow onClick={handleEmptyRowClick} />
        )}
      </div>

      {/* Desktop: Task items + empty rows */}
      <div className="hidden lg:block">
        {tasks.map((task) => (
          <ConnectedTaskItem 
            key={task.id} 
            task={task} 
            onEdit={() => onTaskClick(task)}
          />
        ))}
        {Array.from({ length: emptyRowCount }).map((_, i) => (
          <TaskRow key={i} onClick={handleEmptyRowClick} />
        ))}
      </div>
    </div>
  );
}

const SECTION_MIN_ROWS = 4;

function SectionColumn({ 
  title, 
  tasks,
  listId,
  onTaskClick,
  onNewTaskClick,
}: { 
  title: string; 
  tasks: TaskWithListInfo[];
  listId?: string;
  onTaskClick: (task: TaskWithListInfo) => void;
  onNewTaskClick: (listId: string, listDisplayName: string, dueDate?: string) => void;
}) {
  const emptyRowCount = Math.max(0, SECTION_MIN_ROWS - tasks.length);

  return (
    <div className="flex flex-col break-inside-avoid mb-6">
      {/* Section header - matches ColumnHeader styling */}
      <ColumnHeader title={title} />

      {/* Task items */}
      {tasks.map((task) => (
        <ConnectedTaskItem
          key={task.id}
          task={task}
          onEdit={() => onTaskClick(task)}
        />
      ))}

      {/* Empty rows to fill minimum height - clickable for new tasks */}
      {Array.from({ length: emptyRowCount }).map((_, i) => (
        <TaskRow 
          key={`empty-${i}`} 
          onClick={listId ? () => onNewTaskClick(listId, title) : undefined}
        />
      ))}
    </div>
  );
}

function WeekendColumn({ 
  weekend,
  getTasksForDate,
  tasksLoading,
  onTaskClick,
  onNewTaskClick,
  activeListId,
}: { 
  weekend: WeekDay[];
  getTasksForDate: (date: Date) => TaskWithListInfo[];
  tasksLoading: boolean;
  onTaskClick: (task: TaskWithListInfo) => void;
  onNewTaskClick: (listId: string, listDisplayName: string, dueDate?: string) => void;
  activeListId?: string;
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
        const dateStr = day.date.toISOString().split("T")[0];
        const tasks = getTasksForDate(day.date);
        const emptyRowCount = Math.max(0, WEEKEND_TASK_ROWS - tasks.length);

        const handleEmptyRowClick = activeListId 
          ? () => onNewTaskClick(activeListId, "Active", dateStr)
          : undefined;

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
                  <ConnectedTaskItem 
                    key={task.id} 
                    task={task} 
                    onEdit={() => onTaskClick(task)}
                  />
                ))}
                {Array.from({ length: emptyRowCount }).map((_, i) => (
                  <TaskRow key={`${dayName}-${i}`} onClick={handleEmptyRowClick} />
                ))}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ColumnHeader({ title }: { title: string }) {
  return (
    <div className="flex h-9 items-center border-black border-b-2">
      <Typography variant="title" className="text-zinc-900">
        {title}
      </Typography>
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

function TaskRow({ className, onClick }: { className?: string; onClick?: () => void }) {
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "block h-9 w-full border-b-2 border-zinc-100 transition-colors hover:bg-zinc-50 cursor-pointer",
          className
        )}
      />
    );
  }
  return <div className={cn("block h-9 border-b-2 border-zinc-100", className)} />;
}

const UNDO_TIMEOUT_MS = 5000;

type TaskItemProps = {
  task: TaskWithListInfo | TaskWithParsedDate;
  onEdit?: () => void;
  onToggleComplete?: () => void;
  onDelete?: () => void;
  isDemo?: boolean;
};

function TaskItem({ 
  task, 
  onEdit,
  onToggleComplete,
  onDelete,
  isDemo = false,
}: TaskItemProps) {
  const isCompleted = task.status === "completed";
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className={cn(
        "group/task relative flex min-h-9 h-9 w-full items-center border-b-2 border-zinc-100 text-left transition-colors",
        "hover:bg-zinc-50 focus-within:bg-zinc-50",
        "focus:outline-none focus:ring-0",
        isCompleted && "opacity-60"
      )}
    >
      {/* Task title */}
      <Typography
        variant="default"
        className={cn(
          "truncate text-sm px-1 flex-1",
          isCompleted && "line-through text-zinc-400"
        )}
      >
        {task.title}
      </Typography>

      {/* Action buttons overlay - appears on hover/focus */}
      <div
        className={cn(
          "absolute right-0 top-0 bottom-0 flex items-center gap-0.5 pr-1",
          "opacity-0 group-hover/task:opacity-100 group-focus-within/task:opacity-100",
          "transition-opacity duration-150",
          // Gradient background to fade over text
          "bg-linear-to-l from-zinc-50 via-zinc-50 to-transparent",
          "pl-6"
        )}
      >
        {/* Drag handle (placeholder - not functional yet) */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="flex size-7 items-center justify-center rounded text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200 transition-colors cursor-grab"
              tabIndex={-1}
              disabled
            >
              <GripVertical className="size-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Drag (coming soon)</p>
          </TooltipContent>
        </Tooltip>

        {/* Edit button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.();
              }}
              className="flex size-7 items-center justify-center rounded text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200 transition-colors"
              disabled={isDemo}
            >
              <Pencil className="size-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Edit</p>
          </TooltipContent>
        </Tooltip>

        {/* Mark complete/incomplete button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleComplete?.();
              }}
              className={cn(
                "flex size-7 items-center justify-center rounded transition-colors",
                isCompleted 
                  ? "text-green-600 hover:text-green-700 hover:bg-green-100"
                  : "text-zinc-500 hover:text-green-600 hover:bg-green-100"
              )}
              disabled={isDemo}
            >
              <Check className="size-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>{isCompleted ? "Mark incomplete" : "Mark complete"}</p>
          </TooltipContent>
        </Tooltip>

        {/* Delete button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.();
              }}
              className="flex size-7 items-center justify-center rounded text-zinc-500 hover:text-red-600 hover:bg-red-100 transition-colors"
              disabled={isDemo}
            >
              <Trash2 className="size-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Delete</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

// Connected TaskItem that uses the TasksProvider for actions
type ConnectedTaskItemProps = {
  task: TaskWithListInfo;
  onEdit: () => void;
  isDemo?: boolean;
};

function ConnectedTaskItem({ task, onEdit, isDemo = false }: ConnectedTaskItemProps) {
  const { optimisticToggleComplete, optimisticDelete } = useTasks();
  const deleteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleToggleComplete = useCallback(() => {
    if (isDemo) return;
    optimisticToggleComplete(task);
  }, [task, optimisticToggleComplete, isDemo]);

  const handleDelete = useCallback(() => {
    if (isDemo) return;
    
    const { undo, commit } = optimisticDelete(task);
    
    // Clear any existing timeout for this task
    if (deleteTimeoutRef.current) {
      clearTimeout(deleteTimeoutRef.current);
    }

    // Show toast with undo action
    toast(`"${task.title}" deleted`, {
      duration: UNDO_TIMEOUT_MS,
      action: {
        label: "Undo",
        onClick: () => {
          if (deleteTimeoutRef.current) {
            clearTimeout(deleteTimeoutRef.current);
            deleteTimeoutRef.current = null;
          }
          undo();
        },
      },
    });

    // Set timeout to commit the deletion
    deleteTimeoutRef.current = setTimeout(() => {
      commit();
      deleteTimeoutRef.current = null;
    }, UNDO_TIMEOUT_MS);
  }, [task, optimisticDelete, isDemo]);

  return (
    <TaskItem
      task={task}
      onEdit={onEdit}
      onToggleComplete={handleToggleComplete}
      onDelete={handleDelete}
      isDemo={isDemo}
    />
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
