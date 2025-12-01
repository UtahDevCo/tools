"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  startTransition,
  type ReactNode,
} from "react";
import {
  getAllTasks,
  ensureGTDLists,
  completeTask,
  uncompleteTask,
  deleteTask,
  updateTask,
  createSubtask,
  type GTDLists,
} from "@/lib/tasks-with-refresh";
import {
  type TaskList,
  type TaskWithParsedDate,
} from "@/lib/google-tasks/types";
import { isGTDList, getTaskListDisplayName } from "@/lib/google-tasks/gtd-utils";
import { useAuth } from "@/components/auth-provider";
import { useOffline } from "@/providers/offline-provider";
import { useSettings } from "@/providers/settings-provider";
import { useLocalforage } from "@repo/components";
import { getCalendarEventsForMonth, getMonthKey } from "@/lib/calendar-with-refresh";
import type { CalendarEventWithParsedDate } from "@/lib/google-calendar/types";

// Extended task with list info
export type TaskWithListInfo = TaskWithParsedDate & {
  listId: string;
  listDisplayName: string;
  isGTDList: boolean;
};

// Demo data for signed-out users - Han Solo's Kessel Run preparation
function createDemoData(): {
  taskLists: { taskList: TaskList; tasks: TaskWithParsedDate[] }[];
  gtdLists: GTDLists;
  completedTasksWithDueDates: TaskWithParsedDate[];
} {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const dayAfterTomorrow = new Date(today);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  const demoGtdLists: GTDLists = {
    active: { id: "demo-active", title: "GTD: Active", kind: "tasks#taskList" },
    next: { id: "demo-next", title: "GTD: Next", kind: "tasks#taskList" },
    waiting: { id: "demo-waiting", title: "GTD: Waiting", kind: "tasks#taskList" },
    someday: { id: "demo-someday", title: "GTD: Someday", kind: "tasks#taskList" },
  };

  // Active tasks with due dates (for calendar view) - includes overdue tasks
  const activeTasks: TaskWithParsedDate[] = [
    // Overdue tasks
    {
      id: "demo-overdue-1",
      title: "Pay Jabba's bounty (URGENT!)",
      status: "needsAction",
      kind: "tasks#task",
      selfLink: "",
      position: "00000000000000000000",
      due: twoDaysAgo.toISOString(),
      dueDate: twoDaysAgo,
    },
    {
      id: "demo-overdue-2",
      title: "Return Lando's cape",
      status: "needsAction",
      kind: "tasks#task",
      selfLink: "",
      position: "00000000000000000000",
      due: yesterday.toISOString(),
      dueDate: yesterday,
    },
    // Today's tasks
    {
      id: "demo-1",
      title: "Run diagnostic on hyperdrive motivator",
      status: "needsAction",
      kind: "tasks#task",
      selfLink: "",
      position: "00000000000000000001",
      due: today.toISOString(),
      dueDate: today,
    },
    {
      id: "demo-2", 
      title: "Calibrate navicomputer for Kessel route",
      status: "needsAction",
      kind: "tasks#task",
      selfLink: "",
      position: "00000000000000000002",
      due: today.toISOString(),
      dueDate: today,
    },
    {
      id: "demo-3",
      title: "Stock up on Corellian ale for the trip",
      status: "needsAction",
      kind: "tasks#task",
      selfLink: "",
      position: "00000000000000000003",
      due: today.toISOString(),
      dueDate: today,
    },
    {
      id: "demo-4",
      title: "Check shield generator power cells",
      status: "needsAction",
      kind: "tasks#task",
      selfLink: "",
      position: "00000000000000000004",
      due: today.toISOString(),
      dueDate: today,
    },
    {
      id: "demo-5",
      title: "Refuel with tibanna gas",
      status: "needsAction",
      kind: "tasks#task",
      selfLink: "",
      position: "00000000000000000005",
      due: tomorrow.toISOString(),
      dueDate: tomorrow,
    },
    {
      id: "demo-6",
      title: "Bribe docking official for priority departure",
      status: "needsAction",
      kind: "tasks#task",
      selfLink: "",
      position: "00000000000000000006",
      due: tomorrow.toISOString(),
      dueDate: tomorrow,
    },
    {
      id: "demo-7",
      title: "Install backup hyperdrive unit",
      status: "needsAction",
      kind: "tasks#task",
      selfLink: "",
      position: "00000000000000000007",
      due: dayAfterTomorrow.toISOString(),
      dueDate: dayAfterTomorrow,
    },
  ];

  // Next actions (no due date, just next things to do)
  const nextTasks: TaskWithParsedDate[] = [
    {
      id: "demo-next-1",
      title: "Find co-pilot (Chewie busy with Life Day)",
      status: "needsAction",
      kind: "tasks#task",
      selfLink: "",
      position: "00000000000000000001",
      dueDate: null,
    },
    {
      id: "demo-next-2",
      title: "Update bounty hunter tracking database",
      status: "needsAction",
      kind: "tasks#task",
      selfLink: "",
      position: "00000000000000000002",
      dueDate: null,
    },
    {
      id: "demo-next-3",
      title: "Test rear deflector shields",
      status: "needsAction",
      kind: "tasks#task",
      selfLink: "",
      position: "00000000000000000003",
      dueDate: null,
    },
  ];

  // Waiting for (delegated or blocked)
  const waitingTasks: TaskWithParsedDate[] = [
    {
      id: "demo-waiting-1",
      title: "Lando to return borrowed sensor dish",
      status: "needsAction",
      kind: "tasks#task",
      selfLink: "",
      position: "00000000000000000001",
      dueDate: null,
    },
    {
      id: "demo-waiting-2",
      title: "Imperial clearance codes from contact",
      status: "needsAction",
      kind: "tasks#task",
      selfLink: "",
      position: "00000000000000000002",
      dueDate: null,
    },
  ];

  // Someday/Maybe
  const somedayTasks: TaskWithParsedDate[] = [
    {
      id: "demo-someday-1",
      title: "Pay off Jabba (when credits allow)",
      status: "needsAction",
      kind: "tasks#task",
      selfLink: "",
      position: "00000000000000000001",
      dueDate: null,
    },
    {
      id: "demo-someday-2",
      title: "Upgrade to Class 0.5 hyperdrive",
      status: "needsAction",
      kind: "tasks#task",
      selfLink: "",
      position: "00000000000000000002",
      dueDate: null,
    },
    {
      id: "demo-someday-3",
      title: "Visit Corellia for ship registry update",
      status: "needsAction",
      kind: "tasks#task",
      selfLink: "",
      position: "00000000000000000003",
      dueDate: null,
    },
    {
      id: "demo-someday-4",
      title: "Learn to speak Shyriiwook fluently",
      status: "needsAction",
      kind: "tasks#task",
      selfLink: "",
      position: "00000000000000000004",
      dueDate: null,
    },
  ];

  const taskLists: { taskList: TaskList; tasks: TaskWithParsedDate[] }[] = [
    { taskList: demoGtdLists.active, tasks: activeTasks },
    { taskList: demoGtdLists.next, tasks: nextTasks },
    { taskList: demoGtdLists.waiting, tasks: waitingTasks },
    { taskList: demoGtdLists.someday, tasks: somedayTasks },
  ];

  // Completed tasks with due dates (for calendar view only)
  const completedTasksWithDueDates: TaskWithParsedDate[] = [
    {
      id: "demo-completed-1",
      title: "Pick up replacement power coupling",
      status: "completed",
      kind: "tasks#task",
      selfLink: "",
      position: "00000000000000000001",
      due: yesterday.toISOString(),
      dueDate: yesterday,
    },
    {
      id: "demo-completed-2",
      title: "Clear debris from cargo hold",
      status: "completed",
      kind: "tasks#task",
      selfLink: "",
      position: "00000000000000000002",
      due: yesterday.toISOString(),
      dueDate: yesterday,
    },
    {
      id: "demo-completed-3",
      title: "Update star charts for Kessel sector",
      status: "completed",
      kind: "tasks#task",
      selfLink: "",
      position: "00000000000000000003",
      due: twoDaysAgo.toISOString(),
      dueDate: twoDaysAgo,
    },
    {
      id: "demo-completed-4",
      title: "Repair hull breach in cargo bay 3",
      status: "completed",
      kind: "tasks#task",
      selfLink: "",
      position: "00000000000000000004",
      due: today.toISOString(),
      dueDate: today,
    },
  ];

  return { taskLists, gtdLists: demoGtdLists, completedTasksWithDueDates };
}

// LocalForage cache keys
const CACHE_KEYS = {
  TASK_LISTS: "gtd-task-lists",
  GTD_LISTS: "gtd-lists",
  COMPLETED_TASKS: "gtd-completed-tasks",
  CALENDAR_EVENTS_PREFIX: "gtd-calendar-events-",
} as const;

type TasksState = {
  taskLists: { taskList: TaskList; tasks: TaskWithParsedDate[] }[];
  gtdLists: GTDLists | null;
  // Completed tasks with due dates (for calendar view only, last 30 days)
  completedTasksWithDueDates: TaskWithListInfo[];
  // Calendar events by month (YYYY-MM -> events)
  calendarEventsByMonth: Map<string, CalendarEventWithParsedDate[]>;
  calendarEventsLoading: boolean;
  isLoading: boolean;
  isInitializing: boolean; // True when authenticated but haven't loaded real data yet
  isInitializingGTD: boolean;
  error: string | null;
  needsReauth: boolean;
  // Pending deletions - tasks that are "soft deleted" awaiting undo timeout
  pendingDeletions: Set<string>;
};

type TasksContextValue = TasksState & {
  // All tasks flattened with list info (excludes subtasks - they show in parent drawer only)
  allTasks: TaskWithListInfo[];
  // GTD-specific task getters
  activeTasks: TaskWithListInfo[];
  nextTasks: TaskWithListInfo[];
  waitingTasks: TaskWithListInfo[];
  somedayTasks: TaskWithListInfo[];
  // Overdue tasks (incomplete tasks with due date before today)
  overdueTasks: TaskWithListInfo[];
  // Non-GTD lists with their tasks
  otherLists: { taskList: TaskList; displayName: string; tasks: TaskWithListInfo[] }[];
  // Date-based getters (for calendar)
  getTasksForDate: (date: Date) => TaskWithListInfo[];
  getEventsForDate: (date: Date) => CalendarEventWithParsedDate[];
  getTasksWithoutDueDate: () => TaskWithListInfo[];
  // Subtask getters
  getSubtasks: (parentTaskId: string, listId: string) => TaskWithListInfo[];
  hasSubtasks: (taskId: string, listId: string) => boolean;
  getSubtaskCount: (taskId: string, listId: string) => number;
  refresh: () => void;
  refreshCalendar: () => Promise<void>;
  // Expose gtdLists for components that need to check list IDs
  gtdLists: GTDLists | null;
  // Optimistic updates
  optimisticToggleComplete: (task: TaskWithListInfo) => void;
  optimisticDelete: (task: TaskWithListInfo) => { undo: () => void; commit: () => Promise<void> };
  optimisticUpdate: (task: TaskWithListInfo, updates: { title?: string; notes?: string }) => void;
  // Subtask operations
  addSubtask: (parentTask: TaskWithListInfo, title: string) => Promise<boolean>;
  // Offline state
  isOffline: boolean;
  // Show loading overlay when authenticated but initializing
  showLoadingOverlay: boolean;
};

const TasksContext = createContext<TasksContextValue | null>(null);

type TasksProviderProps = {
  children: ReactNode;
};

// Serializable version of tasks for caching (dates as ISO strings)
type CachedTaskLists = {
  taskList: TaskList;
  tasks: (Omit<TaskWithParsedDate, "dueDate"> & { dueDate: string | null })[];
}[];

type CachedCompletedTasks = (Omit<TaskWithListInfo, "dueDate"> & { dueDate: string | null })[];

// Helper to serialize task lists for caching
function serializeTaskLists(
  taskLists: { taskList: TaskList; tasks: TaskWithParsedDate[] }[]
): CachedTaskLists {
  return taskLists.map(({ taskList, tasks }) => ({
    taskList,
    tasks: tasks.map((task) => ({
      ...task,
      dueDate: task.dueDate?.toISOString() ?? null,
    })),
  }));
}

// Helper to deserialize task lists from cache
function deserializeTaskLists(
  cached: CachedTaskLists
): { taskList: TaskList; tasks: TaskWithParsedDate[] }[] {
  return cached.map(({ taskList, tasks }) => ({
    taskList,
    tasks: tasks.map((task) => ({
      ...task,
      dueDate: task.dueDate ? new Date(task.dueDate) : null,
    })),
  }));
}

// Helper to serialize completed tasks for caching
function serializeCompletedTasks(tasks: TaskWithListInfo[]): CachedCompletedTasks {
  return tasks.map((task) => ({
    ...task,
    dueDate: task.dueDate?.toISOString() ?? null,
  }));
}

// Helper to deserialize completed tasks from cache
function deserializeCompletedTasks(cached: CachedCompletedTasks): TaskWithListInfo[] {
  return cached.map((task) => ({
    ...task,
    dueDate: task.dueDate ? new Date(task.dueDate) : null,
  }));
}

export function TasksProvider({ children }: TasksProviderProps) {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { isOffline } = useOffline();
  const { settings } = useSettings();
  
  // LocalForage for caching tasks
  const { values: cachedValues, setItem: setCacheItem, isLoaded: isCacheLoaded } = useLocalforage<
    [CachedTaskLists | null, GTDLists | null, CachedCompletedTasks | null]
  >(
    [CACHE_KEYS.TASK_LISTS, CACHE_KEYS.GTD_LISTS, CACHE_KEYS.COMPLETED_TASKS],
    { name: "gtd-tasks-cache" }
  );
  const [cachedTaskLists, cachedGtdLists, cachedCompletedTasks] = cachedValues;
  
  const [state, setState] = useState<TasksState>({
    taskLists: [],
    gtdLists: null,
    completedTasksWithDueDates: [],
    calendarEventsByMonth: new Map(),
    calendarEventsLoading: false,
    isLoading: false,
    isInitializing: true, // Start as initializing until we determine auth state
    isInitializingGTD: false,
    error: null,
    needsReauth: false,
    pendingDeletions: new Set(),
  });
  const hasFetchedRef = useRef(false);
  const hasInitializedGTDRef = useRef(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const calendarRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize GTD lists
  const initializeGTDLists = useCallback(async () => {
    if (!isAuthenticated || isOffline) return;

    setState((prev) => ({ ...prev, isInitializingGTD: true }));

    try {
      const result = await ensureGTDLists();

      if (result.success) {
        setState((prev) => ({
          ...prev,
          gtdLists: result.data,
          isInitializingGTD: false,
        }));
        // Cache GTD lists
        setCacheItem(CACHE_KEYS.GTD_LISTS, result.data);
      } else {
        console.error("Failed to initialize GTD lists:", result.error);
        setState((prev) => ({ ...prev, isInitializingGTD: false }));
      }
    } catch (error) {
      console.error("Error initializing GTD lists:", error);
      setState((prev) => ({ ...prev, isInitializingGTD: false }));
    }
  }, [isAuthenticated, isOffline, setCacheItem]);

  // Fetch completed tasks with due dates (last 30 days) for calendar view
  const fetchCompletedTasks = useCallback(async () => {
    if (!isAuthenticated || isOffline) return;

    // Calculate date range: last 30 days
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    try {
      const result = await getAllTasks({
        showCompleted: true,
        dueMin: thirtyDaysAgo.toISOString(),
      });

      if (!result.success) {
        console.error("Failed to fetch completed tasks:", result.error);
        return;
      }

      // Extract only completed tasks with due dates
      const completedWithDueDates: TaskWithListInfo[] = result.data.flatMap(
        ({ taskList, tasks }) =>
          tasks
            .filter((task) => task.status === "completed" && task.dueDate)
            .map((task) => ({
              ...task,
              listId: taskList.id,
              listDisplayName: getTaskListDisplayName(taskList),
              isGTDList: isGTDList(taskList),
            }))
      );

      setState((prev) => ({
        ...prev,
        completedTasksWithDueDates: completedWithDueDates,
      }));
      
      // Cache completed tasks
      setCacheItem(CACHE_KEYS.COMPLETED_TASKS, serializeCompletedTasks(completedWithDueDates));
    } catch (error) {
      console.error("Failed to fetch completed tasks:", error);
    }
  }, [isAuthenticated, isOffline, setCacheItem]);

  const fetchCalendarEventsForMonth = useCallback(async (year: number, month: number) => {
    if (!isAuthenticated || isOffline || !settings.showCalendarEvents) return;

    const date = new Date(year, month - 1);
    const monthKey = getMonthKey(date);
    
    // Get selected calendar IDs from settings (empty = primary only)
    const calendarIds = settings.selectedCalendarIds ?? [];
    
    // Check cache first
    const cacheKey = `${CACHE_KEYS.CALENDAR_EVENTS_PREFIX}${monthKey}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const events = JSON.parse(cached) as CalendarEventWithParsedDate[];
        setState((prev) => {
          const newMap = new Map(prev.calendarEventsByMonth);
          newMap.set(monthKey, events);
          return { ...prev, calendarEventsByMonth: newMap };
        });
      }
    } catch (error) {
      console.error("Failed to parse cached calendar events:", error);
    }

    setState((prev) => ({ ...prev, calendarEventsLoading: true }));

    try {
      // Convert from 1-indexed month to 0-indexed for the action
      const result = await getCalendarEventsForMonth(year, month - 1, calendarIds);

      if (!result.success) {
        console.error("Failed to fetch calendar events:", result.error);
        setState((prev) => ({ ...prev, calendarEventsLoading: false }));
        return;
      }

      setState((prev) => {
        const newMap = new Map(prev.calendarEventsByMonth);
        newMap.set(monthKey, result.data);
        return { ...prev, calendarEventsByMonth: newMap, calendarEventsLoading: false };
      });
      
      // Cache the events
      try {
        localStorage.setItem(cacheKey, JSON.stringify(result.data));
      } catch (error) {
        console.error("Failed to cache calendar events:", error);
      }
    } catch (error) {
      console.error("Failed to fetch calendar events:", error);
      setState((prev) => ({ ...prev, calendarEventsLoading: false }));
    }
  }, [isAuthenticated, isOffline, settings.showCalendarEvents, settings.selectedCalendarIds]);

  const refreshCalendar = useCallback(async () => {
    if (!settings.showCalendarEvents) return;

    // Clear cache
    const keysToDelete: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(CACHE_KEYS.CALENDAR_EVENTS_PREFIX)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => localStorage.removeItem(key));

    // Clear state
    setState((prev) => ({ ...prev, calendarEventsByMonth: new Map() }));

    // Refetch visible months (current month ± 1)
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
    const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;

    await Promise.all([
      fetchCalendarEventsForMonth(prevYear, prevMonth),
      fetchCalendarEventsForMonth(currentYear, currentMonth),
      fetchCalendarEventsForMonth(nextYear, nextMonth),
    ]);
  }, [settings.showCalendarEvents, fetchCalendarEventsForMonth]);

  const fetchTasks = useCallback(async () => {
    if (!isAuthenticated) {
      // Use demo data for signed-out users
      const demoData = createDemoData();
      // Add list info to completed demo tasks
      const completedWithListInfo: TaskWithListInfo[] = demoData.completedTasksWithDueDates.map((task) => ({
        ...task,
        listId: demoData.gtdLists.active.id,
        listDisplayName: "Active",
        isGTDList: true,
      }));
      setState({
        taskLists: demoData.taskLists,
        gtdLists: demoData.gtdLists,
        completedTasksWithDueDates: completedWithListInfo,
        calendarEventsByMonth: new Map(),
        calendarEventsLoading: false,
        isLoading: false,
        isInitializing: false,
        isInitializingGTD: false,
        error: null,
        needsReauth: false,
        pendingDeletions: new Set(),
      });
      return;
    }

    // If offline, use cached data
    if (isOffline && isCacheLoaded && cachedTaskLists) {
      const taskLists = deserializeTaskLists(cachedTaskLists);
      const completedWithListInfo: TaskWithListInfo[] = cachedCompletedTasks
        ? deserializeCompletedTasks(cachedCompletedTasks)
        : [];
      setState({
        taskLists,
        gtdLists: cachedGtdLists ?? null,
        completedTasksWithDueDates: completedWithListInfo,
        calendarEventsByMonth: new Map(),
        calendarEventsLoading: false,
        isLoading: false,
        isInitializing: false,
        isInitializingGTD: false,
        error: null,
        needsReauth: false,
        pendingDeletions: new Set(),
      });
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, isInitializing: false, error: null }));

    try {
      // Token refresh is handled automatically by withAutoRefresh wrapper
      const result = await getAllTasks({ showCompleted: false });

      if (!result.success) {
        // If we have cached data, use it even on error
        if (isCacheLoaded && cachedTaskLists) {
          const taskLists = deserializeTaskLists(cachedTaskLists);
          const completedWithListInfo: TaskWithListInfo[] = cachedCompletedTasks
            ? deserializeCompletedTasks(cachedCompletedTasks)
            : [];
          setState({
            taskLists,
            gtdLists: cachedGtdLists ?? null,
            completedTasksWithDueDates: completedWithListInfo,
            calendarEventsByMonth: new Map(),
            calendarEventsLoading: false,
            isLoading: false,
            isInitializing: false,
            isInitializingGTD: false,
            error: null,
            needsReauth: result.needsReauth ?? false,
            pendingDeletions: new Set(),
          });
          return;
        }

        setState((prev) => ({
          ...prev,
          taskLists: [],
          isLoading: false,
          isInitializing: false,
          error: result.error,
          needsReauth: result.needsReauth ?? false,
        }));
        return;
      }

      setState((prev) => ({
        ...prev,
        taskLists: result.data,
        isLoading: false,
        isInitializing: false,
        error: null,
        needsReauth: false,
      }));
      
      // Cache the successful results
      setCacheItem(CACHE_KEYS.TASK_LISTS, serializeTaskLists(result.data));

      // Fetch completed tasks with due dates (for calendar view)
      fetchCompletedTasks();
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
      
      // If network error and we have cached data, use it
      if (isCacheLoaded && cachedTaskLists) {
        const taskLists = deserializeTaskLists(cachedTaskLists);
        const completedWithListInfo: TaskWithListInfo[] = cachedCompletedTasks
          ? deserializeCompletedTasks(cachedCompletedTasks)
          : [];
        setState({
          taskLists,
          gtdLists: cachedGtdLists ?? null,
          completedTasksWithDueDates: completedWithListInfo,
          calendarEventsByMonth: new Map(),
          calendarEventsLoading: false,
          isLoading: false,
          isInitializing: false,
          isInitializingGTD: false,
          error: null,
          needsReauth: false,
          pendingDeletions: new Set(),
        });
        return;
      }
      
      setState((prev) => ({
        ...prev,
        taskLists: [],
        isLoading: false,
        isInitializing: false,
        error: "Failed to fetch tasks",
        needsReauth: false,
      }));
    }
  }, [isAuthenticated, fetchCompletedTasks, isOffline, isCacheLoaded, cachedTaskLists, cachedGtdLists, cachedCompletedTasks, setCacheItem]);

  // Reset refs when authentication state changes
  useEffect(() => {
    hasFetchedRef.current = false;
    hasInitializedGTDRef.current = false;
  }, [isAuthenticated]);

  // Initialize GTD lists when authenticated
  useEffect(() => {
    if (isAuthenticated && !hasInitializedGTDRef.current) {
      hasInitializedGTDRef.current = true;
      startTransition(() => {
        initializeGTDLists();
      });
    }
  }, [isAuthenticated, initializeGTDLists]);

  // Fetch tasks on mount and when authentication changes (including demo data for signed-out users)
  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      startTransition(() => {
        fetchTasks();
      });
    }
  }, [isAuthenticated, fetchTasks]);

  // Re-fetch when refresh is triggered
  // Note: fetchTasks is intentionally omitted from deps to prevent infinite loops
  // when cache values change. We only want to re-fetch when refreshTrigger changes.
  useEffect(() => {
    if (refreshTrigger > 0 && hasFetchedRef.current) {
      startTransition(() => {
        fetchTasks();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  const refresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  // Auto-refresh calendar events based on settings interval
  useEffect(() => {
    // Clear existing interval
    if (calendarRefreshIntervalRef.current) {
      clearInterval(calendarRefreshIntervalRef.current);
      calendarRefreshIntervalRef.current = null;
    }

    if (!settings.showCalendarEvents || !isAuthenticated || isOffline) {
      return;
    }

    // Set up new interval
    const intervalMinutes = settings.calendarRefreshIntervalMinutes || 5;
    const intervalMs = intervalMinutes * 60 * 1000;

    calendarRefreshIntervalRef.current = setInterval(() => {
      refreshCalendar();
    }, intervalMs);

    // Initial fetch
    refreshCalendar();

    // Cleanup on unmount or when dependencies change
    return () => {
      if (calendarRefreshIntervalRef.current) {
        clearInterval(calendarRefreshIntervalRef.current);
        calendarRefreshIntervalRef.current = null;
      }
    };
  }, [settings.showCalendarEvents, settings.calendarRefreshIntervalMinutes, isAuthenticated, isOffline, refreshCalendar]);

  // All tasks with list info (including subtasks) - used internally
  const allTasksIncludingSubtasks = useMemo<TaskWithListInfo[]>(() => {
    return state.taskLists.flatMap(({ taskList, tasks }) =>
      tasks
        .filter((task) => !state.pendingDeletions.has(task.id))
        .map((task) => ({
          ...task,
          listId: taskList.id,
          listDisplayName: getTaskListDisplayName(taskList),
          isGTDList: isGTDList(taskList),
        }))
    );
  }, [state.taskLists, state.pendingDeletions]);

  // Convert tasks to include list info (excluding pending deletions and subtasks)
  // Subtasks are only shown in the parent task's edit drawer
  const allTasks = useMemo<TaskWithListInfo[]>(() => {
    return allTasksIncludingSubtasks.filter((task) => !task.parent);
  }, [allTasksIncludingSubtasks]);

  // Get subtasks for a parent task
  const getSubtasks = useCallback(
    (parentTaskId: string, listId: string): TaskWithListInfo[] => {
      return allTasksIncludingSubtasks.filter(
        (task) => task.parent === parentTaskId && task.listId === listId
      );
    },
    [allTasksIncludingSubtasks]
  );

  // Check if a task has subtasks
  const hasSubtasks = useCallback(
    (taskId: string, listId: string): boolean => {
      return allTasksIncludingSubtasks.some(
        (task) => task.parent === taskId && task.listId === listId
      );
    },
    [allTasksIncludingSubtasks]
  );

  // Get count of subtasks for a task
  const getSubtaskCount = useCallback(
    (taskId: string, listId: string): number => {
      return allTasksIncludingSubtasks.filter(
        (task) => task.parent === taskId && task.listId === listId
      ).length;
    },
    [allTasksIncludingSubtasks]
  );

  // Add a subtask to a parent task
  const addSubtask = useCallback(
    async (parentTask: TaskWithListInfo, title: string): Promise<boolean> => {
      const result = await createSubtask(parentTask.listId, parentTask.id, { title });
      if (result.success) {
        refresh();
        return true;
      }
      console.error("Failed to add subtask:", result.error);
      return false;
    },
    [refresh]
  );

  // GTD-specific task lists
  const activeTasks = useMemo<TaskWithListInfo[]>(() => {
    if (!state.gtdLists) return [];
    return allTasks.filter((task) => task.listId === state.gtdLists?.active.id);
  }, [allTasks, state.gtdLists]);

  const nextTasks = useMemo<TaskWithListInfo[]>(() => {
    if (!state.gtdLists) return [];
    return allTasks.filter((task) => task.listId === state.gtdLists?.next.id);
  }, [allTasks, state.gtdLists]);

  const waitingTasks = useMemo<TaskWithListInfo[]>(() => {
    if (!state.gtdLists) return [];
    return allTasks.filter((task) => task.listId === state.gtdLists?.waiting.id);
  }, [allTasks, state.gtdLists]);

  const somedayTasks = useMemo<TaskWithListInfo[]>(() => {
    if (!state.gtdLists) return [];
    return allTasks.filter((task) => task.listId === state.gtdLists?.someday.id);
  }, [allTasks, state.gtdLists]);

  // Overdue tasks - incomplete tasks with due date before today
  const overdueTasks = useMemo<TaskWithListInfo[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return allTasks.filter((task) => {
      // Must be incomplete
      if (task.status === "completed") return false;
      // Must have a due date
      if (!task.dueDate) return false;
      // Due date must be before today
      const dueDate = new Date(task.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate < today;
    });
  }, [allTasks]);

  // Non-GTD lists with their tasks
  const otherLists = useMemo(() => {
    const gtdListIds = state.gtdLists
      ? [state.gtdLists.active.id, state.gtdLists.next.id, state.gtdLists.waiting.id, state.gtdLists.someday.id]
      : [];

    return state.taskLists
      .filter(({ taskList }) => !isGTDList(taskList) && !gtdListIds.includes(taskList.id))
      .map(({ taskList, tasks }) => ({
        taskList,
        displayName: getTaskListDisplayName(taskList),
        tasks: tasks.map((task) => ({
          ...task,
          listId: taskList.id,
          listDisplayName: getTaskListDisplayName(taskList),
          isGTDList: false,
        })),
      }));
  }, [state.taskLists, state.gtdLists]);

  // Get tasks for a specific date - returns Active list tasks, Other list tasks, and completed tasks that have this due date
  const getTasksForDateFn = useCallback(
    (date: Date) => {
      const dateStr = date.toISOString().split("T")[0];
      
      // Get Active list tasks with this due date
      const activeTasksForDate = activeTasks.filter((task) => {
        if (!task.dueDate) return false;
        return task.dueDate.toISOString().split("T")[0] === dateStr;
      });
      
      // Get Other list tasks with this due date
      const otherTasksForDate = otherLists.flatMap((list) =>
        list.tasks.filter((task) => {
          if (!task.dueDate) return false;
          return task.dueDate.toISOString().split("T")[0] === dateStr;
        })
      );
      
      // Get completed tasks with this due date (for calendar view)
      const completedTasksForDate = state.completedTasksWithDueDates.filter((task) => {
        if (!task.dueDate) return false;
        return task.dueDate.toISOString().split("T")[0] === dateStr;
      });
      
      return [...activeTasksForDate, ...otherTasksForDate, ...completedTasksForDate];
    },
    [activeTasks, otherLists, state.completedTasksWithDueDates]
  );

  const getTasksWithoutDateFn = useCallback(
    () => allTasks.filter((task) => !task.dueDate),
    [allTasks]
  );

  // Optimistic toggle complete - immediately updates UI, then syncs with server
  const optimisticToggleComplete = useCallback(
    (task: TaskWithListInfo) => {
      const newStatus = task.status === "completed" ? "needsAction" : "completed";
      
      // Optimistically update the task status in state
      setState((prev) => ({
        ...prev,
        taskLists: prev.taskLists.map(({ taskList, tasks }) => ({
          taskList,
          tasks: tasks.map((t) =>
            t.id === task.id ? { ...t, status: newStatus } : t
          ),
        })),
      }));

      // Call server action
      const serverAction = newStatus === "completed" 
        ? completeTask(task.listId, task.id)
        : uncompleteTask(task.listId, task.id);

      serverAction.then((result) => {
        if (!result.success) {
          // Rollback on error
          setState((prev) => ({
            ...prev,
            taskLists: prev.taskLists.map(({ taskList, tasks }) => ({
              taskList,
              tasks: tasks.map((t) =>
                t.id === task.id ? { ...t, status: task.status } : t
              ),
            })),
          }));
          console.error("Failed to toggle task completion:", result.error);
        }
      });
    },
    []
  );

  // Optimistic delete - hides task immediately, returns undo/commit functions
  // Note: Google Tasks API automatically deletes subtasks when parent is deleted
  const optimisticDelete = useCallback(
    (task: TaskWithListInfo) => {
      // Find all subtasks of this task (they will be deleted too)
      const subtaskIds = new Set<string>();
      setState((prev) => {
        const listData = prev.taskLists.find(
          ({ taskList }) => taskList.id === task.listId
        );
        if (listData) {
          for (const t of listData.tasks) {
            if (t.parent === task.id) {
              subtaskIds.add(t.id);
            }
          }
        }
        return prev;
      });

      // Add task and its subtasks to pending deletions (hides them)
      const allIdsToDelete = [task.id, ...subtaskIds];
      setState((prev) => ({
        ...prev,
        pendingDeletions: new Set([...prev.pendingDeletions, ...allIdsToDelete]),
      }));

      const undo = () => {
        // Remove task and subtasks from pending deletions (shows them again)
        setState((prev) => {
          const newPendingDeletions = new Set(prev.pendingDeletions);
          for (const id of allIdsToDelete) {
            newPendingDeletions.delete(id);
          }
          return { ...prev, pendingDeletions: newPendingDeletions };
        });
      };

      const commit = async () => {
        const result = await deleteTask(task.listId, task.id);
        
        if (result.success) {
          // Remove task and subtasks from task lists permanently
          setState((prev) => {
            const newPendingDeletions = new Set(prev.pendingDeletions);
            for (const id of allIdsToDelete) {
              newPendingDeletions.delete(id);
            }
            return {
              ...prev,
              pendingDeletions: newPendingDeletions,
              taskLists: prev.taskLists.map(({ taskList, tasks }) => ({
                taskList,
                tasks: tasks.filter((t) => !allIdsToDelete.includes(t.id)),
              })),
            };
          });
        } else {
          // Rollback on error - remove from pending deletions
          undo();
          console.error("Failed to delete task:", result.error);
        }
      };

      return { undo, commit };
    },
    []
  );

  // Optimistic update - immediately updates UI, then syncs with server
  const optimisticUpdate = useCallback(
    (task: TaskWithListInfo, updates: { title?: string; notes?: string }) => {
      const previousTitle = task.title;
      const previousNotes = task.notes;
      
      // Optimistically update the task in state
      setState((prev) => ({
        ...prev,
        taskLists: prev.taskLists.map(({ taskList, tasks }) => ({
          taskList,
          tasks: tasks.map((t) =>
            t.id === task.id ? { ...t, ...updates } : t
          ),
        })),
      }));

      // Call server action
      updateTask(task.listId, task.id, updates).then((result) => {
        if (!result.success) {
          // Rollback on error
          setState((prev) => ({
            ...prev,
            taskLists: prev.taskLists.map(({ taskList, tasks }) => ({
              taskList,
              tasks: tasks.map((t) =>
                t.id === task.id ? { ...t, title: previousTitle, notes: previousNotes } : t
              ),
            })),
          }));
          console.error("Failed to update task:", result.error);
        }
      });
    },
    []
  );

  // Show loading overlay when:
  // 1. Auth is still loading (we don't know if user is authenticated yet)
  // 2. User is authenticated but tasks are still initializing (haven't loaded real data)
  const showLoadingOverlay = isAuthLoading || (isAuthenticated && state.isInitializing);

  const getEventsForDate = useCallback((date: Date): CalendarEventWithParsedDate[] => {
    const monthKey = getMonthKey(date);
    
    const eventsForMonth = state.calendarEventsByMonth.get(monthKey) || [];
    
    // Filter events to those that overlap with the date
    const dateStart = new Date(date);
    dateStart.setHours(0, 0, 0, 0);
    const dateEnd = new Date(date);
    dateEnd.setHours(23, 59, 59, 999);
    
    return eventsForMonth
      .filter(event => {
        if (!event.startDate || !event.endDate) return false;
        const eventStart = new Date(event.startDate);
        const eventEnd = new Date(event.endDate);
        // Event overlaps with date if: event starts before date ends AND event ends after date starts
        return eventStart <= dateEnd && eventEnd >= dateStart;
      })
      .map(event => {
        // Calculate multi-day information
        if (!event.startDate || !event.endDate) {
          return { ...event, isFirstDay: true, dayNumber: 1, totalDays: 1 };
        }
        const eventStart = new Date(event.startDate);
        eventStart.setHours(0, 0, 0, 0);
        const eventEnd = new Date(event.endDate);
        eventEnd.setHours(0, 0, 0, 0);
        
        const daysDiff = Math.floor((eventEnd.getTime() - eventStart.getTime()) / (1000 * 60 * 60 * 24));
        const totalDays = daysDiff + 1;
        const isFirstDay = dateStart.getTime() === eventStart.getTime();
        
        let dayNumber = 1;
        if (!isFirstDay) {
          dayNumber = Math.floor((dateStart.getTime() - eventStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        }
        
        return {
          ...event,
          isFirstDay,
          dayNumber,
          totalDays,
        };
      });
  }, [state.calendarEventsByMonth]);

  const value: TasksContextValue = {
    ...state,
    allTasks,
    activeTasks,
    nextTasks,
    waitingTasks,
    somedayTasks,
    overdueTasks,
    otherLists,
    getTasksForDate: getTasksForDateFn,
    getTasksWithoutDueDate: getTasksWithoutDateFn,
    getEventsForDate,
    getSubtasks,
    hasSubtasks,
    getSubtaskCount,
    refreshCalendar,
    refresh,
    optimisticToggleComplete,
    optimisticDelete,
    optimisticUpdate,
    addSubtask,
    isOffline,
    showLoadingOverlay,
  };

  return (
    <TasksContext.Provider value={value}>{children}</TasksContext.Provider>
  );
}

export function useTasks(): TasksContextValue {
  const context = useContext(TasksContext);

  if (!context) {
    throw new Error("useTasks must be used within a TasksProvider");
  }

  return context;
}
