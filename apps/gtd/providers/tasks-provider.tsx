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
import { getAllTasks, ensureGTDLists, type GTDLists } from "@/app/actions/tasks";
import {
  type TaskList,
  type TaskWithParsedDate,
} from "@/lib/google-tasks/types";
import { isGTDList, getTaskListDisplayName } from "@/lib/google-tasks/gtd-utils";
import { useAuth } from "@/components/auth-provider";

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
} {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const dayAfterTomorrow = new Date(today);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

  const demoGtdLists: GTDLists = {
    active: { id: "demo-active", title: "GTD: Active", kind: "tasks#taskList" },
    next: { id: "demo-next", title: "GTD: Next", kind: "tasks#taskList" },
    waiting: { id: "demo-waiting", title: "GTD: Waiting", kind: "tasks#taskList" },
    someday: { id: "demo-someday", title: "GTD: Someday", kind: "tasks#taskList" },
  };

  // Active tasks with due dates (for calendar view)
  const activeTasks: TaskWithParsedDate[] = [
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

  return { taskLists, gtdLists: demoGtdLists };
}

type TasksState = {
  taskLists: { taskList: TaskList; tasks: TaskWithParsedDate[] }[];
  gtdLists: GTDLists | null;
  isLoading: boolean;
  isInitializingGTD: boolean;
  error: string | null;
  needsReauth: boolean;
};

type TasksContextValue = TasksState & {
  // All tasks flattened with list info
  allTasks: TaskWithListInfo[];
  // GTD-specific task getters
  activeTasks: TaskWithListInfo[];
  nextTasks: TaskWithListInfo[];
  waitingTasks: TaskWithListInfo[];
  somedayTasks: TaskWithListInfo[];
  // Non-GTD lists with their tasks
  otherLists: { taskList: TaskList; displayName: string; tasks: TaskWithListInfo[] }[];
  // Date-based getters (for calendar)
  getTasksForDate: (date: Date) => TaskWithListInfo[];
  getTasksWithoutDueDate: () => TaskWithListInfo[];
  refresh: () => void;
};

const TasksContext = createContext<TasksContextValue | null>(null);

type TasksProviderProps = {
  children: ReactNode;
};

export function TasksProvider({ children }: TasksProviderProps) {
  const { isAuthenticated, refreshSession } = useAuth();
  const [state, setState] = useState<TasksState>({
    taskLists: [],
    gtdLists: null,
    isLoading: false,
    isInitializingGTD: false,
    error: null,
    needsReauth: false,
  });
  const hasFetchedRef = useRef(false);
  const hasInitializedGTDRef = useRef(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Initialize GTD lists on mount
  const initializeGTDLists = useCallback(async () => {
    if (!isAuthenticated || hasInitializedGTDRef.current) return;

    hasInitializedGTDRef.current = true;
    setState((prev) => ({ ...prev, isInitializingGTD: true }));

    try {
      const result = await ensureGTDLists();

      if (result.success) {
        setState((prev) => ({
          ...prev,
          gtdLists: result.data,
          isInitializingGTD: false,
        }));
      } else {
        console.error("Failed to initialize GTD lists:", result.error);
        setState((prev) => ({ ...prev, isInitializingGTD: false }));
      }
    } catch (error) {
      console.error("Error initializing GTD lists:", error);
      setState((prev) => ({ ...prev, isInitializingGTD: false }));
    }
  }, [isAuthenticated]);

  const fetchTasks = useCallback(async () => {
    if (!isAuthenticated) {
      // Use demo data for signed-out users
      const demoData = createDemoData();
      setState({
        taskLists: demoData.taskLists,
        gtdLists: demoData.gtdLists,
        isLoading: false,
        isInitializingGTD: false,
        error: null,
        needsReauth: false,
      });
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await getAllTasks({ showCompleted: false });

      if (!result.success) {
        // If token expired, try to refresh session
        if (result.needsReauth) {
          try {
            await refreshSession();
            // Retry after refresh
            const retryResult = await getAllTasks({ showCompleted: false });
            if (retryResult.success) {
              setState((prev) => ({
                ...prev,
                taskLists: retryResult.data,
                isLoading: false,
                error: null,
                needsReauth: false,
              }));
              return;
            }
          } catch {
            // Refresh failed, user needs to sign in again
          }
        }

        setState((prev) => ({
          ...prev,
          taskLists: [],
          isLoading: false,
          error: result.error,
          needsReauth: result.needsReauth ?? false,
        }));
        return;
      }

      setState((prev) => ({
        ...prev,
        taskLists: result.data,
        isLoading: false,
        error: null,
        needsReauth: false,
      }));
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
      setState((prev) => ({
        ...prev,
        taskLists: [],
        isLoading: false,
        error: "Failed to fetch tasks",
        needsReauth: false,
      }));
    }
  }, [isAuthenticated, refreshSession]);

  // Initialize GTD lists on mount
  useEffect(() => {
    if (isAuthenticated && !hasInitializedGTDRef.current) {
      startTransition(() => {
        initializeGTDLists();
      });
    }
  }, [isAuthenticated, initializeGTDLists]);

  // Fetch tasks on mount and when triggered (including demo data for signed-out users)
  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      startTransition(() => {
        fetchTasks();
      });
    }
  }, [fetchTasks]);

  // Re-fetch when refresh is triggered
  useEffect(() => {
    if (refreshTrigger > 0 && hasFetchedRef.current) {
      startTransition(() => {
        fetchTasks();
      });
    }
  }, [refreshTrigger, fetchTasks]);

  const refresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  // Convert tasks to include list info
  const allTasks = useMemo<TaskWithListInfo[]>(() => {
    return state.taskLists.flatMap(({ taskList, tasks }) =>
      tasks.map((task) => ({
        ...task,
        listId: taskList.id,
        listDisplayName: getTaskListDisplayName(taskList),
        isGTDList: isGTDList(taskList),
      }))
    );
  }, [state.taskLists]);

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

  // Get tasks for a specific date - returns Active list tasks and Other list tasks that have this due date
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
      
      return [...activeTasksForDate, ...otherTasksForDate];
    },
    [activeTasks, otherLists]
  );

  const getTasksWithoutDateFn = useCallback(
    () => allTasks.filter((task) => !task.dueDate),
    [allTasks]
  );

  const value: TasksContextValue = {
    ...state,
    allTasks,
    activeTasks,
    nextTasks,
    waitingTasks,
    somedayTasks,
    otherLists,
    getTasksForDate: getTasksForDateFn,
    getTasksWithoutDueDate: getTasksWithoutDateFn,
    refresh,
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
