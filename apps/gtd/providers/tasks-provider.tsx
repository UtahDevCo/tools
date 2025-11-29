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
      setState({
        taskLists: [],
        gtdLists: null,
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

  // Fetch tasks on mount and when triggered
  useEffect(() => {
    if (isAuthenticated && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      startTransition(() => {
        fetchTasks();
      });
    }
  }, [isAuthenticated, fetchTasks]);

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
      ? [state.gtdLists.next.id, state.gtdLists.waiting.id, state.gtdLists.someday.id]
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

  const getTasksForDateFn = useCallback(
    (date: Date) => {
      const dateStr = date.toISOString().split("T")[0];
      return allTasks.filter((task) => {
        if (!task.dueDate) return false;
        return task.dueDate.toISOString().split("T")[0] === dateStr;
      });
    },
    [allTasks]
  );

  const getTasksWithoutDateFn = useCallback(
    () => allTasks.filter((task) => !task.dueDate),
    [allTasks]
  );

  const value: TasksContextValue = {
    ...state,
    allTasks,
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
