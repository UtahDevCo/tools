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
import { getAllTasks } from "@/app/actions/tasks";
import {
  type TaskList,
  type TaskWithParsedDate,
  getTasksForDate,
  getTasksWithoutDueDate,
} from "@/lib/google-tasks/types";
import { useAuth } from "@/components/auth-provider";

type TasksState = {
  taskLists: { taskList: TaskList; tasks: TaskWithParsedDate[] }[];
  isLoading: boolean;
  error: string | null;
  needsReauth: boolean;
};

type TasksContextValue = TasksState & {
  allTasks: TaskWithParsedDate[];
  getTasksForDate: (date: Date) => TaskWithParsedDate[];
  getTasksWithoutDueDate: () => TaskWithParsedDate[];
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
    isLoading: false,
    error: null,
    needsReauth: false,
  });
  const hasFetchedRef = useRef(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchTasks = useCallback(async () => {
    if (!isAuthenticated) {
      setState({
        taskLists: [],
        isLoading: false,
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
              setState({
                taskLists: retryResult.data,
                isLoading: false,
                error: null,
                needsReauth: false,
              });
              return;
            }
          } catch {
            // Refresh failed, user needs to sign in again
          }
        }

        setState({
          taskLists: [],
          isLoading: false,
          error: result.error,
          needsReauth: result.needsReauth ?? false,
        });
        return;
      }

      setState({
        taskLists: result.data,
        isLoading: false,
        error: null,
        needsReauth: false,
      });
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
      setState({
        taskLists: [],
        isLoading: false,
        error: "Failed to fetch tasks",
        needsReauth: false,
      });
    }
  }, [isAuthenticated, refreshSession]);

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

  const allTasks = useMemo(
    () => state.taskLists.flatMap(({ tasks }) => tasks),
    [state.taskLists]
  );

  const getTasksForDateFn = useCallback(
    (date: Date) => getTasksForDate(allTasks, date),
    [allTasks]
  );

  const getTasksWithoutDateFn = useCallback(
    () => getTasksWithoutDueDate(allTasks),
    [allTasks]
  );

  const value: TasksContextValue = {
    ...state,
    allTasks,
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
