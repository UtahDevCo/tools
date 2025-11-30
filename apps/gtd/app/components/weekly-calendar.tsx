"use client";

/**
 * WeeklyCalendar - Main GTD app UI component
 * 
 * This is a large component (~2000 lines) that handles the full calendar interface.
 * While large, it's intentionally kept as a single file because:
 * - The calendar logic is tightly coupled (date calculations, task rendering, multi-select)
 * - Splitting would create complex prop drilling
 * - The component is performance-critical and co-location helps optimization
 * 
 * Supporting utilities, hooks, and smaller components have been extracted to:
 * - app/components/calendar/ (reusable calendar pieces)
 * - lib/constants.ts (configuration values)
 * 
 * TODO: Consider extracting task item components if this grows beyond 2500 lines
 */

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, MoreVertical, Pencil, Check, Trash2, ArrowUpDown, Move, X } from "lucide-react";
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
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  useKeydown,
  useLocalforage,
  toast,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/components";
import { UserAvatar } from "@/components/user-avatar";
import { useAuth } from "@/components/auth-provider";
import { useTasks, type TaskWithListInfo } from "@/providers/tasks-provider";
import { type TaskWithParsedDate, type TaskList } from "@/lib/google-tasks/types";
import { type CalendarEventWithParsedDate } from "@/lib/google-calendar/types";
import { TaskEditDrawer } from "./task-edit-drawer";
import { LoginRequiredModal } from "./login-required-modal";
import { LoadingOverlay } from "./loading-overlay";
import { CalendarEventItem } from "./calendar-event-item";
import { CalendarHeader } from "./calendar/calendar-header";
import { moveTasksToList, deleteTasks } from "@/lib/tasks-with-refresh";
import { TIMEOUTS, UI, CACHE_KEYS } from "@/lib/constants";
import { useSettings } from "@/providers/settings-provider";

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

// UI constants imported from lib/constants.ts
const { WEEKDAY_ROWS, WEEKEND_ROWS, SECTION_MIN_ROWS, LIST_MIN_ROWS } = UI;
const { UNDO_WINDOW, CLICK_DEBOUNCE } = TIMEOUTS;

export function WeeklyCalendar({ className }: WeeklyCalendarProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Read dayOffset from URL, defaulting to 0 (today)
  const dayOffset = useMemo(() => {
    const offsetParam = searchParams.get("offset");
    if (offsetParam === null) return 0;
    const parsed = parseInt(offsetParam, 10);
    return isNaN(parsed) ? 0 : parsed;
  }, [searchParams]);
  
  // Helper to update URL with new offset
  const setDayOffset = useCallback((newOffset: number | ((prev: number) => number)) => {
    const resolvedOffset = typeof newOffset === "function" ? newOffset(dayOffset) : newOffset;
    const params = new URLSearchParams(searchParams.toString());
    if (resolvedOffset === 0) {
      params.delete("offset");
    } else {
      params.set("offset", resolvedOffset.toString());
    }
    const queryString = params.toString();
    router.replace(queryString ? `?${queryString}` : "/", { scroll: false });
  }, [dayOffset, searchParams, router]);
  
  const { isAuthenticated } = useAuth();
  const { settings } = useSettings();
  const { 
    getTasksForDate,
    getEventsForDate,
    nextTasks, 
    waitingTasks, 
    somedayTasks,
    overdueTasks,
    otherLists,
    isLoading: tasksLoading, 
    error, 
    needsReauth,
    showLoadingOverlay,
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

  // Multi-select state
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [isMoveTargetingActive, setIsMoveTargetingActive] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMoveConfirm, setShowMoveConfirm] = useState<{ listId: string; listName: string; dueDate?: string } | null>(null);

  // Localforage for user preferences
  const {
    values: [sortPreference, skipMoveConfirm],
    setItem,
  } = useLocalforage<[SortPreference | null, boolean | null]>(
    [CACHE_KEYS.SORT_PREFERENCE, CACHE_KEYS.SKIP_MOVE_CONFIRM],
    { storeName: "gtd-settings" }
  );

  const currentSortOrder: ListSortOrder = sortPreference?.sortOrder ?? "alphabetical";

  const setSortOrder = useCallback(
    (order: ListSortOrder) => {
      setItem(CACHE_KEYS.SORT_PREFERENCE, { sortOrder: order });
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
  const headerText = formatDateRange(days, false);
  const headerTextShort = formatDateRange(days, true);

  const handlePrevious = useCallback(() => {
    setDayOffset((prev) => prev - 4);
    // Clear selection on navigation
    setIsMultiSelectMode(false);
    setSelectedTaskIds(new Set());
    setIsMoveTargetingActive(false);
  }, [setDayOffset]);

  const handleNext = useCallback(() => {
    setDayOffset((prev) => prev + 4);
    // Clear selection on navigation
    setIsMultiSelectMode(false);
    setSelectedTaskIds(new Set());
    setIsMoveTargetingActive(false);
  }, [setDayOffset]);

  const handleToday = useCallback(() => {
    setDayOffset(0);
    // Clear selection on navigation
    setIsMultiSelectMode(false);
    setSelectedTaskIds(new Set());
    setIsMoveTargetingActive(false);
  }, [setDayOffset]);

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

  // Multi-select handlers
  const handleEnterMultiSelect = useCallback((taskId: string) => {
    setIsMultiSelectMode(true);
    setSelectedTaskIds(new Set([taskId]));
    // Default to move targeting mode when entering via move button
    setIsMoveTargetingActive(true);
  }, []);

  const handleToggleTaskSelection = useCallback((taskId: string) => {
    setSelectedTaskIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  }, []);

  const handleExitMultiSelect = useCallback(() => {
    setIsMultiSelectMode(false);
    setSelectedTaskIds(new Set());
    setIsMoveTargetingActive(false);
  }, []);

  const handleStartMoveTargeting = useCallback(() => {
    setIsMoveTargetingActive(true);
  }, []);

  const handleCancelMoveTargeting = useCallback(() => {
    setIsMoveTargetingActive(false);
  }, []);

  // Get all tasks for the selected IDs
  const { allTasks, refresh } = useTasks();

  const getSelectedTasks = useCallback(() => {
    return allTasks.filter((task) => selectedTaskIds.has(task.id));
  }, [allTasks, selectedTaskIds]);

  // Core move function used by both direct move and confirmed move
  const performMove = useCallback(async (targetListId: string, targetListName: string, targetDueDate?: string) => {
    const selectedTasks = getSelectedTasks();
    const tasksToMove = selectedTasks.map((task) => ({
      listId: task.listId,
      taskId: task.id,
      title: task.title,
      notes: task.notes ?? undefined,
      // Use the target due date if moving to a date column, otherwise keep existing
      due: targetDueDate ?? task.due ?? undefined,
    }));

    const result = await moveTasksToList(tasksToMove, targetListId);

    if (result.success) {
      toast(`Moved ${result.data.moved} task${result.data.moved !== 1 ? "s" : ""} to ${targetListName}`);
      if (result.data.failed > 0) {
        toast(`Failed to move ${result.data.failed} task${result.data.failed !== 1 ? "s" : ""}`, { duration: 5000 });
      }
      refresh();
    } else {
      toast("Failed to move tasks", { duration: 5000 });
    }

    handleExitMultiSelect();
  }, [getSelectedTasks, refresh, handleExitMultiSelect]);

  const handleSelectMoveTarget = useCallback((listId: string, listName: string, dueDate?: string) => {
    if (skipMoveConfirm) {
      // Skip confirmation and move directly
      performMove(listId, listName, dueDate);
    } else {
      // Show confirmation dialog
      setShowMoveConfirm({ listId, listName, dueDate });
    }
  }, [skipMoveConfirm, performMove]);

  const handleConfirmMove = useCallback(async () => {
    if (!showMoveConfirm) return;
    await performMove(showMoveConfirm.listId, showMoveConfirm.listName, showMoveConfirm.dueDate);
    setShowMoveConfirm(null);
  }, [showMoveConfirm, performMove]);

  const handleToggleSkipMoveConfirm = useCallback((skip: boolean) => {
    setItem(CACHE_KEYS.SKIP_MOVE_CONFIRM, skip);
  }, [setItem]);

  const handleConfirmDelete = useCallback(async () => {
    const selectedTasks = getSelectedTasks();
    const tasksToDelete = selectedTasks.map((task) => ({
      listId: task.listId,
      taskId: task.id,
    }));

    const result = await deleteTasks(tasksToDelete);

    if (result.success) {
      toast(`Deleted ${result.data.deleted} task${result.data.deleted !== 1 ? "s" : ""}`);
      if (result.data.failed > 0) {
        toast(`Failed to delete ${result.data.failed} task${result.data.failed !== 1 ? "s" : ""}`, { duration: 5000 });
      }
      refresh();
    } else {
      toast("Failed to delete tasks", { duration: 5000 });
    }

    setShowDeleteConfirm(false);
    handleExitMultiSelect();
  }, [getSelectedTasks, refresh, handleExitMultiSelect]);

  const handleKeydown = useCallback(
    (event: Event) => {
      const e = event as KeyboardEvent;
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        return;
      }

      // Escape exits multi-select mode entirely
      if (e.key === "Escape") {
        if (isMultiSelectMode) {
          e.preventDefault();
          handleExitMultiSelect();
          return;
        }
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
    [handlePrevious, handleNext, handleToday, isMultiSelectMode, handleExitMultiSelect]
  );

  useKeydown({ isActive: true, callback: handleKeydown }, [handleKeydown]);

  const isAtToday = dayOffset === 0;

  // Track scroll state for header border
  const [isScrolled, setIsScrolled] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setIsScrolled(container.scrollTop > 0);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className={cn("flex h-screen flex-col px-1 bg-white", className)}>
      <CalendarHeader
        headerText={headerText}
        headerTextShort={headerTextShort}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onToday={handleToday}
        isAtToday={isAtToday}
        isScrolled={isScrolled}
      />
      {error && (
        <div className="mx-4 mb-2 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {needsReauth ? "Please sign in to view your tasks." : error}
        </div>
      )}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        <WeekGrid 
          columns={columns} 
          getTasksForDate={getTasksForDate}
          getEventsForDate={getEventsForDate}
          showCalendarEvents={settings.showCalendarEvents}
          nextTasks={nextTasks}
          waitingTasks={waitingTasks}
          somedayTasks={somedayTasks}
          overdueTasks={overdueTasks}
          otherLists={sortedOtherLists}
          tasksLoading={tasksLoading}
          sortOrder={currentSortOrder}
          onSortOrderChange={setSortOrder}
          onTaskClick={handleTaskClick}
          onNewTaskClick={handleNewTaskClick}
          isMultiSelectMode={isMultiSelectMode}
          selectedTaskIds={selectedTaskIds}
          isMoveTargetingActive={isMoveTargetingActive}
          onEnterMultiSelect={handleEnterMultiSelect}
          onToggleTaskSelection={handleToggleTaskSelection}
          onSelectMoveTarget={handleSelectMoveTarget}
        />
      </div>

      {/* Multi-select actions bar */}
      {isMultiSelectMode && selectedTaskIds.size > 0 && (
        <MultiSelectActionsBar
          selectedCount={selectedTaskIds.size}
          isMoveTargetingActive={isMoveTargetingActive}
          onMove={handleStartMoveTargeting}
          onDelete={() => setShowDeleteConfirm(true)}
          onCancel={isMoveTargetingActive ? handleCancelMoveTargeting : handleExitMultiSelect}
        />
      )}

      {/* Delete confirmation dialog */}
      <ConfirmDeleteDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        selectedCount={selectedTaskIds.size}
        onConfirm={handleConfirmDelete}
      />

      {/* Move confirmation dialog */}
      <ConfirmMoveDialog
        open={!!showMoveConfirm}
        onOpenChange={(open) => !open && setShowMoveConfirm(null)}
        selectedCount={selectedTaskIds.size}
        targetListName={showMoveConfirm?.listName ?? ""}
        onConfirm={handleConfirmMove}
        skipConfirm={skipMoveConfirm ?? false}
        onSkipConfirmChange={handleToggleSkipMoveConfirm}
      />

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
      {showLoadingOverlay && <LoadingOverlay />}
    </div>
  );
}

type StickyHeaderProps = {
  children: React.ReactNode;
  className?: string;
};

function StickyHeader({ children, className }: StickyHeaderProps) {
  const [isStuck, setIsStuck] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // When sentinel is not intersecting (scrolled out of view), header is stuck
        setIsStuck(!entry.isIntersecting);
      },
      { threshold: 0 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* Sentinel element - when this scrolls out of view, the header is "stuck" */}
      <div ref={sentinelRef} className="h-0" />
      <div
        className={cn(
          "sticky top-0 z-20 bg-white flex items-center py-2 mb-10 border-b-2 transition-colors duration-200",
          isStuck ? "border-black" : "border-transparent",
          className
        )}
      >
        {children}
      </div>
    </>
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
  getEventsForDate: (date: Date) => CalendarEventWithParsedDate[];
  showCalendarEvents: boolean;
  nextTasks: TaskWithListInfo[];
  waitingTasks: TaskWithListInfo[];
  somedayTasks: TaskWithListInfo[];
  overdueTasks: TaskWithListInfo[];
  otherLists: OtherListData[];
  tasksLoading: boolean;
  sortOrder: ListSortOrder;
  onSortOrderChange: (order: ListSortOrder) => void;
  onTaskClick: (task: TaskWithListInfo) => void;
  onNewTaskClick: (listId: string, listDisplayName: string, dueDate?: string) => void;
  // Multi-select props
  isMultiSelectMode: boolean;
  selectedTaskIds: Set<string>;
  isMoveTargetingActive: boolean;
  onEnterMultiSelect: (taskId: string) => void;
  onToggleTaskSelection: (taskId: string) => void;
  onSelectMoveTarget: (listId: string, listName: string, dueDate?: string) => void;
};

function WeekGrid({ 
  columns, 
  getTasksForDate,
  getEventsForDate,
  showCalendarEvents,
  nextTasks,
  waitingTasks,
  somedayTasks,
  overdueTasks,
  otherLists,
  tasksLoading,
  sortOrder,
  onSortOrderChange,
  onTaskClick,
  onNewTaskClick,
  isMultiSelectMode,
  selectedTaskIds,
  isMoveTargetingActive,
  onEnterMultiSelect,
  onToggleTaskSelection,
  onSelectMoveTarget,
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
    <div className="flex flex-col gap-2 px-4 pb-4 pt-4">
      {/* Desktop: Day columns row */}
      <div className="hidden lg:flex lg:flex-row lg:gap-6 mb-8">
        {columns.map((column, index) => {
          if (column.type === "weekday") {
            const tasks = getTasksForDate(column.day.date);
            const events = showCalendarEvents ? getEventsForDate(column.day.date) : [];
            return (
              <WeekdayColumn 
                key={column.day.date.toISOString()} 
                day={column.day}
                tasks={tasks}
                events={events}
                tasksLoading={tasksLoading}
                onTaskClick={onTaskClick}
                onNewTaskClick={onNewTaskClick}
                activeListId={gtdLists?.active.id}
                isMultiSelectMode={isMultiSelectMode}
                selectedTaskIds={selectedTaskIds}
                isMoveTargetingActive={isMoveTargetingActive}
                onEnterMultiSelect={onEnterMultiSelect}
                onToggleTaskSelection={onToggleTaskSelection}
                onSelectMoveTarget={onSelectMoveTarget}
              />
            );
          }
          return (
            <div key={`weekend-${index}`} className="flex flex-1 flex-col">
              <WeekendColumn 
                weekend={column.days}
                getTasksForDate={getTasksForDate}
                getEventsForDate={getEventsForDate}
                showCalendarEvents={showCalendarEvents}
                tasksLoading={tasksLoading}
                onTaskClick={onTaskClick}
                onNewTaskClick={onNewTaskClick}
                activeListId={gtdLists?.active.id}
                isMultiSelectMode={isMultiSelectMode}
                selectedTaskIds={selectedTaskIds}
                isMoveTargetingActive={isMoveTargetingActive}
                onEnterMultiSelect={onEnterMultiSelect}
                onToggleTaskSelection={onToggleTaskSelection}
                onSelectMoveTarget={onSelectMoveTarget}
              />
            </div>
          );
        })}
      </div>

      {/* Mobile: All days in chronological order */}
      <div className="flex flex-col gap-2 lg:hidden mb-8">
        {allDaysInOrder.map((day) => {
          const tasks = getTasksForDate(day.date);
          const events = showCalendarEvents ? getEventsForDate(day.date) : [];
          return (
            <WeekdayColumn 
              key={day.date.toISOString()} 
              day={day}
              tasks={tasks}
              events={events}
              tasksLoading={tasksLoading}
              onTaskClick={onTaskClick}
              onNewTaskClick={onNewTaskClick}
              activeListId={gtdLists?.active.id}
              isMultiSelectMode={isMultiSelectMode}
              selectedTaskIds={selectedTaskIds}
              isMoveTargetingActive={isMoveTargetingActive}
              onEnterMultiSelect={onEnterMultiSelect}
              onToggleTaskSelection={onToggleTaskSelection}
              onSelectMoveTarget={onSelectMoveTarget}
            />
          );
        })}
      </div>

      {/* GTD Sections with CSS columns masonry layout */}
      <div className="mt-8">
        <StickyHeader>
          <Typography variant="headline" className="text-zinc-900">
            GTD Lists
          </Typography>
        </StickyHeader>
        <div className={cn(
          "columns-1 md:columns-2 gap-6",
          overdueTasks.length > 0 ? "lg:columns-4" : "lg:columns-3"
        )}>
          {overdueTasks.length > 0 && (
            <OverdueColumn
              tasks={overdueTasks}
              onTaskClick={onTaskClick}
              isMultiSelectMode={isMultiSelectMode}
              selectedTaskIds={selectedTaskIds}
              onEnterMultiSelect={onEnterMultiSelect}
              onToggleTaskSelection={onToggleTaskSelection}
            />
          )}
          <SectionColumn 
            title="Next" 
            tasks={nextTasks} 
            listId={gtdLists?.next.id} 
            onTaskClick={onTaskClick} 
            onNewTaskClick={onNewTaskClick}
            isMultiSelectMode={isMultiSelectMode}
            selectedTaskIds={selectedTaskIds}
            isMoveTargetingActive={isMoveTargetingActive}
            onEnterMultiSelect={onEnterMultiSelect}
            onToggleTaskSelection={onToggleTaskSelection}
            onSelectMoveTarget={onSelectMoveTarget}
          />
          <SectionColumn 
            title="Waiting" 
            tasks={waitingTasks} 
            listId={gtdLists?.waiting.id} 
            onTaskClick={onTaskClick} 
            onNewTaskClick={onNewTaskClick}
            isMultiSelectMode={isMultiSelectMode}
            selectedTaskIds={selectedTaskIds}
            isMoveTargetingActive={isMoveTargetingActive}
            onEnterMultiSelect={onEnterMultiSelect}
            onToggleTaskSelection={onToggleTaskSelection}
            onSelectMoveTarget={onSelectMoveTarget}
          />
          <SectionColumn 
            title="Someday" 
            tasks={somedayTasks} 
            listId={gtdLists?.someday.id} 
            onTaskClick={onTaskClick} 
            onNewTaskClick={onNewTaskClick}
            isMultiSelectMode={isMultiSelectMode}
            selectedTaskIds={selectedTaskIds}
            isMoveTargetingActive={isMoveTargetingActive}
            onEnterMultiSelect={onEnterMultiSelect}
            onToggleTaskSelection={onToggleTaskSelection}
            onSelectMoveTarget={onSelectMoveTarget}
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
          isMultiSelectMode={isMultiSelectMode}
          selectedTaskIds={selectedTaskIds}
          isMoveTargetingActive={isMoveTargetingActive}
          onEnterMultiSelect={onEnterMultiSelect}
          onToggleTaskSelection={onToggleTaskSelection}
          onSelectMoveTarget={onSelectMoveTarget}
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
  isMultiSelectMode: boolean;
  selectedTaskIds: Set<string>;
  isMoveTargetingActive: boolean;
  onEnterMultiSelect: (taskId: string) => void;
  onToggleTaskSelection: (taskId: string) => void;
  onSelectMoveTarget: (listId: string, listName: string, dueDate?: string) => void;
};

function OtherListsSection({
  lists,
  sortOrder,
  onSortOrderChange,
  onTaskClick,
  onNewTaskClick,
  isMultiSelectMode,
  selectedTaskIds,
  isMoveTargetingActive,
  onEnterMultiSelect,
  onToggleTaskSelection,
  onSelectMoveTarget,
}: OtherListsSectionProps) {
  return (
    <div className="mt-8">
      {/* Section header with sort control */}
      <StickyHeader className="justify-between">
        <Typography variant="headline" className="text-zinc-900">
          Other Lists
        </Typography>
        <SortOrderDropdown sortOrder={sortOrder} onSortOrderChange={onSortOrderChange} />
      </StickyHeader>

      {/* CSS columns masonry layout */}
      <div className="columns-1 md:columns-2 lg:columns-3 gap-6">
        {lists.map((list) => (
          <ListColumn
            key={list.taskList.id}
            list={list}
            onTaskClick={onTaskClick}
            onNewTaskClick={onNewTaskClick}
            isMultiSelectMode={isMultiSelectMode}
            selectedTaskIds={selectedTaskIds}
            isMoveTargetingActive={isMoveTargetingActive}
            onEnterMultiSelect={onEnterMultiSelect}
            onToggleTaskSelection={onToggleTaskSelection}
            onSelectMoveTarget={onSelectMoveTarget}
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
  isMultiSelectMode: boolean;
  selectedTaskIds: Set<string>;
  isMoveTargetingActive: boolean;
  onEnterMultiSelect: (taskId: string) => void;
  onToggleTaskSelection: (taskId: string) => void;
  onSelectMoveTarget: (listId: string, listName: string, dueDate?: string) => void;
};

// Use imported constant

function ListColumn({ 
  list, 
  onTaskClick, 
  onNewTaskClick,
  isMultiSelectMode,
  selectedTaskIds,
  isMoveTargetingActive,
  onEnterMultiSelect,
  onToggleTaskSelection,
  onSelectMoveTarget,
}: ListColumnProps) {
  const emptyRowCount = Math.max(LIST_MIN_ROWS, LIST_MIN_ROWS - list.tasks.length);

  const handleHeaderClick = isMoveTargetingActive
    ? () => onSelectMoveTarget(list.taskList.id, list.displayName)
    : undefined;

  return (
    <div className="flex flex-col break-inside-avoid mb-6">
      {/* List header - matches DayHeader styling */}
      <ColumnHeader 
        title={list.displayName} 
        isMoveTargetingActive={isMoveTargetingActive}
        onClick={handleHeaderClick}
      />

      {/* Task items */}
      {list.tasks.map((task) => (
        <ConnectedTaskItem
          key={task.id}
          task={task}
          onEdit={() => onTaskClick(task)}
          isMultiSelectMode={isMultiSelectMode}
          isSelected={selectedTaskIds.has(task.id)}
          onEnterMultiSelect={onEnterMultiSelect}
          onToggleSelection={onToggleTaskSelection}
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
  events,
  tasksLoading,
  onTaskClick,
  onNewTaskClick,
  activeListId,
  isMultiSelectMode,
  selectedTaskIds,
  isMoveTargetingActive,
  onEnterMultiSelect,
  onToggleTaskSelection,
  onSelectMoveTarget,
}: { 
  day: WeekDay;
  tasks: TaskWithListInfo[];
  events: CalendarEventWithParsedDate[];
  tasksLoading: boolean;
  onTaskClick: (task: TaskWithListInfo) => void;
  onNewTaskClick: (listId: string, listDisplayName: string, dueDate?: string) => void;
  activeListId?: string;
  isMultiSelectMode: boolean;
  selectedTaskIds: Set<string>;
  isMoveTargetingActive: boolean;
  onEnterMultiSelect: (taskId: string) => void;
  onToggleTaskSelection: (taskId: string) => void;
  onSelectMoveTarget: (listId: string, listName: string, dueDate?: string) => void;
}) {
  const dayNum = day.date.getDate();
  const monthShort = day.date.toLocaleDateString("en-US", { month: "short" });
  const dayName = day.date.toLocaleDateString("en-US", { weekday: "short" });
  const dateStr = day.date.toISOString().split("T")[0];

  // Calculate empty rows needed
  const emptyRowCount = Math.max(0, WEEKDAY_ROWS - tasks.length - events.length);

  const handleEmptyRowClick = activeListId 
    ? () => onNewTaskClick(activeListId, "Active", dateStr)
    : undefined;

  const handleHeaderClick = isMoveTargetingActive && activeListId
    ? () => onSelectMoveTarget(activeListId, `Active (${dayNum} ${monthShort})`, dateStr)
    : undefined;

  return (
    <div className="flex flex-col lg:flex-1">
      {/* Day header */}
      <DayHeader
        dayNum={dayNum}
        monthShort={monthShort}
        dayName={dayName}
        isToday={day.isToday}
        isMoveTargetingActive={isMoveTargetingActive}
        onClick={handleHeaderClick}
      />

      {/* Mobile: Task items + always at least one empty row */}
      <div className="lg:hidden">
        {tasksLoading ? (
          <TaskRow />
        ) : (
          <>
            {events.map((event) => (
              <CalendarEventItem
                key={`${event.id}-${event.dayNumber}`}
                event={event}
                isFirstDay={event.isFirstDay}
                dayNumber={event.dayNumber}
                totalDays={event.totalDays}
              />
            ))}
            {tasks.map((task) => (
              <ConnectedTaskItem 
                key={task.id} 
                task={task} 
                onEdit={() => onTaskClick(task)}
                isMultiSelectMode={isMultiSelectMode}
                isSelected={selectedTaskIds.has(task.id)}
                onEnterMultiSelect={onEnterMultiSelect}
                onToggleSelection={onToggleTaskSelection}
                showCircleIndicator
              />
            ))}
            {/* Always show at least one empty row on mobile */}
            <TaskRow onClick={handleEmptyRowClick} />
          </>
        )}
      </div>

      {/* Desktop: Task items + empty rows */}
      <div className="hidden lg:block">
        {events.map((event) => (
          <CalendarEventItem
            key={`${event.id}-${event.dayNumber}`}
            event={event}
            isFirstDay={event.isFirstDay}
            dayNumber={event.dayNumber}
            totalDays={event.totalDays}
          />
        ))}
        {tasks.map((task) => (
          <ConnectedTaskItem 
            key={task.id} 
            task={task} 
            onEdit={() => onTaskClick(task)}
            isMultiSelectMode={isMultiSelectMode}
            isSelected={selectedTaskIds.has(task.id)}
            onEnterMultiSelect={onEnterMultiSelect}
            onToggleSelection={onToggleTaskSelection}
            showCircleIndicator
          />
        ))}
        {Array.from({ length: emptyRowCount }).map((_, i) => (
          <TaskRow key={i} onClick={handleEmptyRowClick} />
        ))}
      </div>
    </div>
  );
}

function SectionColumn({ 
  title, 
  tasks,
  listId,
  onTaskClick,
  onNewTaskClick,
  isMultiSelectMode,
  selectedTaskIds,
  isMoveTargetingActive,
  onEnterMultiSelect,
  onToggleTaskSelection,
  onSelectMoveTarget,
}: { 
  title: string; 
  tasks: TaskWithListInfo[];
  listId?: string;
  onTaskClick: (task: TaskWithListInfo) => void;
  onNewTaskClick: (listId: string, listDisplayName: string, dueDate?: string) => void;
  isMultiSelectMode: boolean;
  selectedTaskIds: Set<string>;
  isMoveTargetingActive: boolean;
  onEnterMultiSelect: (taskId: string) => void;
  onToggleTaskSelection: (taskId: string) => void;
  onSelectMoveTarget: (listId: string, listName: string, dueDate?: string) => void;
}) {
  const desktopEmptyRowCount = Math.max(0, SECTION_MIN_ROWS - tasks.length);
  const mobileEmptyRowCount = Math.max(0, 1 - tasks.length);

  const handleHeaderClick = isMoveTargetingActive && listId
    ? () => onSelectMoveTarget(listId, title)
    : undefined;

  return (
    <div className="flex flex-col break-inside-avoid mb-6">
      {/* Section header - matches ColumnHeader styling */}
      <ColumnHeader 
        title={title} 
        isMoveTargetingActive={isMoveTargetingActive}
        onClick={handleHeaderClick}
      />

      {/* Task items */}
      {tasks.map((task) => (
        <ConnectedTaskItem
          key={task.id}
          task={task}
          onEdit={() => onTaskClick(task)}
          isMultiSelectMode={isMultiSelectMode}
          isSelected={selectedTaskIds.has(task.id)}
          onEnterMultiSelect={onEnterMultiSelect}
          onToggleSelection={onToggleTaskSelection}
        />
      ))}

      {/* Empty rows - 1 on mobile, up to configured minimum on desktop */}
      <div className="md:hidden">
        {Array.from({ length: mobileEmptyRowCount }).map((_, i) => (
          <TaskRow 
            key={`empty-mobile-${i}`} 
            onClick={listId ? () => onNewTaskClick(listId, title) : undefined}
          />
        ))}
        {/* Always show at least one empty row on mobile for adding tasks */}
        {tasks.length > 0 && (
          <TaskRow 
            onClick={listId ? () => onNewTaskClick(listId, title) : undefined}
          />
        )}
      </div>
      <div className="hidden md:block">
        {Array.from({ length: desktopEmptyRowCount }).map((_, i) => (
          <TaskRow 
            key={`empty-desktop-${i}`} 
            onClick={listId ? () => onNewTaskClick(listId, title) : undefined}
          />
        ))}
      </div>
    </div>
  );
}

type OverdueColumnProps = {
  tasks: TaskWithListInfo[];
  onTaskClick: (task: TaskWithListInfo) => void;
  isMultiSelectMode: boolean;
  selectedTaskIds: Set<string>;
  onEnterMultiSelect: (taskId: string) => void;
  onToggleTaskSelection: (taskId: string) => void;
};

function OverdueColumn({ 
  tasks, 
  onTaskClick,
  isMultiSelectMode,
  selectedTaskIds,
  onEnterMultiSelect,
  onToggleTaskSelection,
}: OverdueColumnProps) {
  const desktopEmptyRowCount = Math.max(0, SECTION_MIN_ROWS - tasks.length);

  return (
    <div className="flex flex-col break-inside-avoid mb-6">
      {/* Overdue header - red warning styling */}
      <div className="flex h-9 items-center border-red-500 border-b-2">
        <Typography variant="title" className="text-red-600">
          Overdue
        </Typography>
      </div>

      {/* Task items with undo toast on complete */}
      {tasks.map((task) => (
        <OverdueTaskItem
          key={task.id}
          task={task}
          onEdit={() => onTaskClick(task)}
          isMultiSelectMode={isMultiSelectMode}
          isSelected={selectedTaskIds.has(task.id)}
          onEnterMultiSelect={onEnterMultiSelect}
          onToggleSelection={onToggleTaskSelection}
        />
      ))}

      {/* Empty rows for consistent height on desktop */}
      <div className="hidden md:block">
        {Array.from({ length: desktopEmptyRowCount }).map((_, i) => (
          <TaskRow key={`empty-desktop-${i}`} />
        ))}
      </div>
    </div>
  );
}

function WeekendColumn({ 
  weekend,
  getTasksForDate,
  getEventsForDate,
  showCalendarEvents,
  tasksLoading,
  onTaskClick,
  onNewTaskClick,
  activeListId,
  isMultiSelectMode,
  selectedTaskIds,
  isMoveTargetingActive,
  onEnterMultiSelect,
  onToggleTaskSelection,
  onSelectMoveTarget,
}: { 
  weekend: WeekDay[];
  getTasksForDate: (date: Date) => TaskWithListInfo[];
  getEventsForDate: (date: Date) => CalendarEventWithParsedDate[];
  showCalendarEvents: boolean;
  tasksLoading: boolean;
  onTaskClick: (task: TaskWithListInfo) => void;
  onNewTaskClick: (listId: string, listDisplayName: string, dueDate?: string) => void;
  activeListId?: string;
  isMultiSelectMode: boolean;
  selectedTaskIds: Set<string>;
  isMoveTargetingActive: boolean;
  onEnterMultiSelect: (taskId: string) => void;
  onToggleTaskSelection: (taskId: string) => void;
  onSelectMoveTarget: (listId: string, listName: string, dueDate?: string) => void;
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
        const events = showCalendarEvents ? getEventsForDate(day.date) : [];
        const emptyRowCount = Math.max(0, WEEKEND_ROWS - tasks.length - events.length);

        const handleEmptyRowClick = activeListId 
          ? () => onNewTaskClick(activeListId, "Active", dateStr)
          : undefined;

        const handleHeaderClick = isMoveTargetingActive && activeListId
          ? () => onSelectMoveTarget(activeListId, `Active (${dayNum} ${monthShort})`, dateStr)
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
              isMoveTargetingActive={isMoveTargetingActive}
              onClick={handleHeaderClick}
            />

            {tasksLoading ? (
              Array.from({ length: WEEKEND_ROWS }).map((_, i) => (
                <TaskRow key={`${dayName}-${i}`} />
              ))
            ) : (
              <>
                {events.map((event) => (
                  <CalendarEventItem
                    key={`${event.id}-${event.dayNumber}`}
                    event={event}
                    isFirstDay={event.isFirstDay}
                    dayNumber={event.dayNumber}
                    totalDays={event.totalDays}
                  />
                ))}
                {tasks.map((task) => (
                  <ConnectedTaskItem 
                    key={task.id} 
                    task={task} 
                    onEdit={() => onTaskClick(task)}
                    isMultiSelectMode={isMultiSelectMode}
                    isSelected={selectedTaskIds.has(task.id)}
                    onEnterMultiSelect={onEnterMultiSelect}
                    onToggleSelection={onToggleTaskSelection}
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

function ColumnHeader({ 
  title,
  isMoveTargetingActive,
  onClick,
}: { 
  title: string;
  isMoveTargetingActive?: boolean;
  onClick?: () => void;
}) {
  const isClickable = isMoveTargetingActive && onClick;
  
  return (
    <div 
      className={cn(
        "flex h-9 items-center border-black border-b-2 transition-colors",
        isClickable && "cursor-pointer bg-orange-100 hover:bg-orange-300"
      )}
      onClick={onClick}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
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
  isMoveTargetingActive,
  onClick,
}: {
  className?: string;
  dayNum: number;
  monthShort: string;
  dayName: string;
  isToday: boolean;
  isMoveTargetingActive?: boolean;
  onClick?: () => void;
}) {
  const isClickable = isMoveTargetingActive && onClick;

  return (
    <div
      className={cn(
        "flex h-9 items-center justify-between border-black border-b-2 transition-colors",
        isToday && "border-b-orange-500",
        isClickable && "cursor-pointer bg-orange-100 hover:bg-orange-300",
        className
      )}
      onClick={onClick}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      } : undefined}
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

const CLICK_DEBOUNCE_MS = CLICK_DEBOUNCE;

function TaskRow({ className, onClick }: { className?: string; onClick?: () => void }) {
  const lastClickRef = useRef<number>(0);

  const handleClick = useCallback(() => {
    const now = Date.now();
    if (now - lastClickRef.current < CLICK_DEBOUNCE_MS) {
      return; // Ignore clicks within debounce window
    }
    lastClickRef.current = now;
    onClick?.();
  }, [onClick]);

  if (onClick) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "block h-9 w-full border-b-2 border-zinc-100 transition-colors hover:bg-zinc-50 cursor-pointer",
          className
        )}
      />
    );
  }
  return <div className={cn("block h-9 border-b-2 border-zinc-100", className)} />;
}

// Undo timeout: 5 seconds provides good balance between preventing accidental
// deletions and not being annoying. Based on UX research showing 3-7s is optimal.
// See: https://www.nngroup.com/articles/undo-patterns/
const UNDO_TIMEOUT_MS = UNDO_WINDOW;

type TaskItemProps = {
  task: TaskWithListInfo | TaskWithParsedDate;
  onEdit?: () => void;
  onToggleComplete?: () => void;
  onDelete?: () => void;
  isDemo?: boolean;
  // Multi-select props
  isMultiSelectMode?: boolean;
  isSelected?: boolean;
  onEnterMultiSelect?: (taskId: string) => void;
  onToggleSelection?: (taskId: string) => void;
  // Show circle indicator (for calendar view alignment with events)
  showCircleIndicator?: boolean;
};

function TaskItem({ 
  task, 
  onEdit,
  onToggleComplete,
  onDelete,
  isDemo = false,
  isMultiSelectMode = false,
  isSelected = false,
  onEnterMultiSelect,
  onToggleSelection,
  showCircleIndicator = false,
}: TaskItemProps) {
  const isCompleted = task.status === "completed";
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDoubleClick = useCallback(() => {
    if (isDemo || isMultiSelectMode) return;
    onEdit?.();
  }, [isDemo, isMultiSelectMode, onEdit]);

  const handleCheckboxChange = useCallback(() => {
    onToggleSelection?.(task.id);
  }, [task.id, onToggleSelection]);

  const handleMoveClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onEnterMultiSelect?.(task.id);
  }, [task.id, onEnterMultiSelect]);

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className={cn(
        "group/task relative flex min-h-9 h-9 w-full items-center border-b-2 border-zinc-100 text-left transition-colors",
        "hover:bg-zinc-50 focus-within:bg-zinc-50",
        "focus:outline-none focus:ring-0",
        isCompleted && "opacity-60",
        isSelected && "bg-orange-50"
      )}
    >
      {/* Circle indicator for calendar view alignment */}
      {showCircleIndicator && !isMultiSelectMode && (
        <div className="size-2.5 rounded-full border border-zinc-400 bg-white ml-2 mr-2 shrink-0" />
      )}

      {/* Checkbox for multi-select mode */}
      {isMultiSelectMode && (
        <div className="flex items-center justify-center w-7 shrink-0">
          <Checkbox
            checked={isSelected}
            onCheckedChange={handleCheckboxChange}
            className="size-4"
          />
        </div>
      )}

      {/* Task title - double-click opens edit drawer */}
      <Typography
        variant="default"
        className={cn(
          "truncate text-sm px-1 flex-1 cursor-pointer",
          isCompleted && "line-through text-zinc-400"
        )}
        onDoubleClick={handleDoubleClick}
      >
        {task.title}
      </Typography>

      {/* Action buttons overlay - appears on hover/focus, hidden in multi-select mode */}
      {!isMultiSelectMode && (
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
          {/* Move button - enters multi-select mode */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleMoveClick}
                className="flex size-7 items-center justify-center rounded text-zinc-500 hover:text-orange-600 hover:bg-orange-100 transition-colors"
                disabled={isDemo}
              >
                <Move className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Move</p>
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
      )}
    </div>
  );
}

// Connected TaskItem that uses the TasksProvider for actions
type ConnectedTaskItemProps = {
  task: TaskWithListInfo;
  onEdit: () => void;
  isDemo?: boolean;
  isMultiSelectMode?: boolean;
  isSelected?: boolean;
  onEnterMultiSelect?: (taskId: string) => void;
  onToggleSelection?: (taskId: string) => void;
  showCircleIndicator?: boolean;
};

function ConnectedTaskItem({ 
  task, 
  onEdit, 
  isDemo = false,
  isMultiSelectMode = false,
  isSelected = false,
  onEnterMultiSelect,
  onToggleSelection,
  showCircleIndicator = false,
}: ConnectedTaskItemProps) {
  const { optimisticToggleComplete, optimisticDelete, isOffline } = useTasks();
  const deleteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleToggleComplete = useCallback(() => {
    if (isDemo || isOffline) return;
    optimisticToggleComplete(task);
  }, [task, optimisticToggleComplete, isDemo, isOffline]);

  const handleDelete = useCallback(() => {
    if (isDemo || isOffline) return;
    
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
  }, [task, optimisticDelete, isDemo, isOffline]);

  return (
    <TaskItem
      task={task}
      onEdit={onEdit}
      onToggleComplete={handleToggleComplete}
      onDelete={handleDelete}
      isDemo={isDemo || isOffline}
      isMultiSelectMode={isMultiSelectMode}
      isSelected={isSelected}
      onEnterMultiSelect={onEnterMultiSelect}
      onToggleSelection={onToggleSelection}
      showCircleIndicator={showCircleIndicator}
    />
  );
}

// OverdueTaskItem - shows undo toast when completing overdue tasks
type OverdueTaskItemProps = {
  task: TaskWithListInfo;
  onEdit: () => void;
  isMultiSelectMode?: boolean;
  isSelected?: boolean;
  onEnterMultiSelect?: (taskId: string) => void;
  onToggleSelection?: (taskId: string) => void;
};

function OverdueTaskItem({ 
  task, 
  onEdit,
  isMultiSelectMode = false,
  isSelected = false,
  onEnterMultiSelect,
  onToggleSelection,
}: OverdueTaskItemProps) {
  const { optimisticToggleComplete, optimisticDelete, isOffline } = useTasks();
  const completeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deleteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isPendingComplete, setIsPendingComplete] = useState(false);

  const handleToggleComplete = useCallback(() => {
    if (isOffline) return;
    
    // Clear any existing timeout
    if (completeTimeoutRef.current) {
      clearTimeout(completeTimeoutRef.current);
    }

    // Mark as pending complete (hides from view immediately via optimistic update)
    setIsPendingComplete(true);
    optimisticToggleComplete(task);

    // Show toast with undo action
    toast(`"${task.title}" completed`, {
      duration: UNDO_TIMEOUT_MS,
      action: {
        label: "Undo",
        onClick: () => {
          if (completeTimeoutRef.current) {
            clearTimeout(completeTimeoutRef.current);
            completeTimeoutRef.current = null;
          }
          setIsPendingComplete(false);
          // Uncomplete the task
          optimisticToggleComplete({ ...task, status: "completed" });
        },
      },
    });

    // Set timeout to finalize (task is already marked complete on server, 
    // undo will revert it if clicked)
    completeTimeoutRef.current = setTimeout(() => {
      completeTimeoutRef.current = null;
      setIsPendingComplete(false);
    }, UNDO_TIMEOUT_MS);
  }, [task, optimisticToggleComplete, isOffline]);

  const handleDelete = useCallback(() => {
    if (isOffline) return;
    
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
  }, [task, optimisticDelete, isOffline]);

  // Don't render if pending complete (will disappear when status updates)
  if (isPendingComplete) {
    return null;
  }

  return (
    <TaskItem
      task={task}
      onEdit={onEdit}
      onToggleComplete={handleToggleComplete}
      onDelete={handleDelete}
      isDemo={isOffline}
      isMultiSelectMode={isMultiSelectMode}
      isSelected={isSelected}
      onEnterMultiSelect={onEnterMultiSelect}
      onToggleSelection={onToggleSelection}
    />
  );
}

// Multi-select actions bar - fixed position top right
type MultiSelectActionsBarProps = {
  selectedCount: number;
  isMoveTargetingActive: boolean;
  onMove: () => void;
  onDelete: () => void;
  onCancel: () => void;
};

function MultiSelectActionsBar({
  selectedCount,
  isMoveTargetingActive,
  onMove,
  onDelete,
  onCancel,
}: MultiSelectActionsBarProps) {
  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-white border border-zinc-200 rounded-lg shadow-lg px-3 py-2">
      <Typography variant="default" className="text-sm text-zinc-600">
        {selectedCount} selected
      </Typography>
      
      <div className="w-px h-6 bg-zinc-200" />
      
      {/* Move button - highlighted when active, clickable to activate if not */}
      <Button
        variant="ghost"
        size="sm"
        onClick={isMoveTargetingActive ? undefined : onMove}
        className={cn(
          "h-8 gap-1.5",
          isMoveTargetingActive 
            ? "bg-orange-100 text-orange-700 cursor-default" 
            : "text-orange-600 hover:text-orange-700 hover:bg-orange-50"
        )}
      >
        <Move className="size-4" />
        Move
      </Button>
      
      {/* Delete button - always available */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onDelete}
        className="h-8 gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50"
      >
        <Trash2 className="size-4" />
        Delete
      </Button>
      
      <div className="w-px h-6 bg-zinc-200" />
      
      <Button
        variant="ghost"
        size="sm"
        onClick={onCancel}
        className="h-8 gap-1.5"
      >
        <X className="size-4" />
        Cancel
      </Button>
    </div>
  );
}

// Confirmation dialogs
type ConfirmDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  onConfirm: () => void;
};

function ConfirmDeleteDialog({
  open,
  onOpenChange,
  selectedCount,
  onConfirm,
}: ConfirmDeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {selectedCount} task{selectedCount !== 1 ? "s" : ""}?</DialogTitle>
          <DialogDescription>
            This action cannot be undone. The selected task{selectedCount !== 1 ? "s" : ""} will be permanently deleted.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type ConfirmMoveDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  targetListName: string;
  onConfirm: () => void;
  skipConfirm: boolean;
  onSkipConfirmChange: (skip: boolean) => void;
};

function ConfirmMoveDialog({
  open,
  onOpenChange,
  selectedCount,
  targetListName,
  onConfirm,
  skipConfirm,
  onSkipConfirmChange,
}: ConfirmMoveDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move {selectedCount} task{selectedCount !== 1 ? "s" : ""}?</DialogTitle>
          <DialogDescription>
            Move the selected task{selectedCount !== 1 ? "s" : ""} to <strong>{targetListName}</strong>?
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 py-2">
          <Checkbox
            id="skip-move-confirm"
            checked={skipConfirm}
            onCheckedChange={(checked) => onSkipConfirmChange(checked === true)}
          />
          <label 
            htmlFor="skip-move-confirm" 
            className="text-sm text-zinc-600 cursor-pointer select-none"
          >
            Don&apos;t ask again
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>
            Move
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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

function formatDateRange(days: WeekDay[], short: boolean = false): string {
  if (days.length === 0) return "";

  const firstDay = days[0];
  const firstMonth = firstDay.date.toLocaleDateString("en-US", { month: short ? "short" : "long" });
  const year = firstDay.date.getFullYear();

  return `${firstMonth} ${year}`;
}
