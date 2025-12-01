import { tasks_v1, auth } from "@googleapis/tasks";
import {
  TaskListsResponseSchema,
  TasksResponseSchema,
  TaskListSchema,
  type TaskList,
  type Task,
  type TaskInput,
} from "./types";
import {
  GTD_LIST_PREFIX,
  GTD_LISTS,
  GTD_DISPLAY_NAMES,
  isGTDList,
  getTaskListDisplayName,
} from "./gtd-utils";

// Re-export GTD utilities for backwards compatibility
export { GTD_LIST_PREFIX, GTD_LISTS, GTD_DISPLAY_NAMES, isGTDList, getTaskListDisplayName };

export function createTasksClient(accessToken: string): tasks_v1.Tasks {
  const oauth2Client = new auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  return new tasks_v1.Tasks({ auth: oauth2Client });
}

export async function fetchTaskLists(
  client: tasks_v1.Tasks
): Promise<TaskList[]> {
  const response = await client.tasklists.list({
    maxResults: 100,
  });

  const parsed = TaskListsResponseSchema.parse(response.data, {
    reportInput: true,
  });

  return parsed.items ?? [];
}

export async function createTaskList(
  client: tasks_v1.Tasks,
  title: string
): Promise<TaskList> {
  const response = await client.tasklists.insert({
    requestBody: {
      title,
    },
  });

  return TaskListSchema.parse(response.data, { reportInput: true });
}

export async function ensureGTDListsExist(
  client: tasks_v1.Tasks
): Promise<{ active: TaskList; next: TaskList; waiting: TaskList; someday: TaskList }> {
  const existingLists = await fetchTaskLists(client);

  const findList = (gtdName: string) =>
    existingLists.find((list) => list.title === gtdName);

  let activeList = findList(GTD_LISTS.ACTIVE);
  let nextList = findList(GTD_LISTS.NEXT);
  let waitingList = findList(GTD_LISTS.WAITING);
  let somedayList = findList(GTD_LISTS.SOMEDAY);

  // Create missing lists
  if (!activeList) {
    activeList = await createTaskList(client, GTD_LISTS.ACTIVE);
  }
  if (!nextList) {
    nextList = await createTaskList(client, GTD_LISTS.NEXT);
  }
  if (!waitingList) {
    waitingList = await createTaskList(client, GTD_LISTS.WAITING);
  }
  if (!somedayList) {
    somedayList = await createTaskList(client, GTD_LISTS.SOMEDAY);
  }

  return {
    active: activeList,
    next: nextList,
    waiting: waitingList,
    someday: somedayList,
  };
}

export async function fetchTasks(
  client: tasks_v1.Tasks,
  taskListId: string,
  options?: {
    showCompleted?: boolean;
    showHidden?: boolean;
    dueMin?: string; // RFC 3339 timestamp
    dueMax?: string; // RFC 3339 timestamp
  }
): Promise<Task[]> {
  const response = await client.tasks.list({
    tasklist: taskListId,
    maxResults: 100,
    showCompleted: options?.showCompleted ?? false,
    showHidden: options?.showHidden ?? false,
    dueMin: options?.dueMin,
    dueMax: options?.dueMax,
  });

  const parsed = TasksResponseSchema.parse(response.data, { reportInput: true });

  return parsed.items ?? [];
}

export async function fetchAllTasks(
  client: tasks_v1.Tasks,
  options?: {
    showCompleted?: boolean;
    dueMin?: string;
    dueMax?: string;
  }
): Promise<{ taskList: TaskList; tasks: Task[] }[]> {
  const taskLists = await fetchTaskLists(client);

  const results = await Promise.all(
    taskLists.map(async (taskList) => {
      const tasks = await fetchTasks(client, taskList.id, options);
      return { taskList, tasks };
    })
  );

  return results;
}

export async function createTask(
  client: tasks_v1.Tasks,
  taskListId: string,
  task: TaskInput
): Promise<Task> {
  const response = await client.tasks.insert({
    tasklist: taskListId,
    requestBody: {
      title: task.title,
      notes: task.notes,
      due: task.due,
      status: task.status,
    },
  });

  return response.data as Task;
}

export async function updateTask(
  client: tasks_v1.Tasks,
  taskListId: string,
  taskId: string,
  task: Partial<TaskInput>
): Promise<Task> {
  const response = await client.tasks.patch({
    tasklist: taskListId,
    task: taskId,
    requestBody: {
      title: task.title,
      notes: task.notes,
      due: task.due,
      status: task.status,
    },
  });

  return response.data as Task;
}

export async function deleteTask(
  client: tasks_v1.Tasks,
  taskListId: string,
  taskId: string
): Promise<void> {
  await client.tasks.delete({
    tasklist: taskListId,
    task: taskId,
  });
}

export async function completeTask(
  client: tasks_v1.Tasks,
  taskListId: string,
  taskId: string
): Promise<Task> {
  return updateTask(client, taskListId, taskId, { status: "completed" });
}

export async function uncompleteTask(
  client: tasks_v1.Tasks,
  taskListId: string,
  taskId: string
): Promise<Task> {
  return updateTask(client, taskListId, taskId, { status: "needsAction" });
}

export async function moveTask(
  client: tasks_v1.Tasks,
  taskListId: string,
  taskId: string,
  options?: {
    parent?: string;
    previous?: string;
    destinationTasklist?: string;
  }
): Promise<Task> {
  const response = await client.tasks.move({
    tasklist: taskListId,
    task: taskId,
    parent: options?.parent,
    previous: options?.previous,
    destinationTasklist: options?.destinationTasklist,
  });

  return response.data as Task;
}

/**
 * Create a task as a subtask of another task.
 * Uses the insert API with the parent parameter.
 */
export async function createSubtask(
  client: tasks_v1.Tasks,
  taskListId: string,
  parentTaskId: string,
  task: TaskInput
): Promise<Task> {
  const response = await client.tasks.insert({
    tasklist: taskListId,
    parent: parentTaskId,
    requestBody: {
      title: task.title,
      notes: task.notes,
      due: task.due,
      status: task.status,
    },
  });

  return response.data as Task;
}
