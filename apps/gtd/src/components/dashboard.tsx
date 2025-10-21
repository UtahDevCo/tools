import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Header } from "./header";
import { Button } from "@/components/ui/button";
import { QueueList } from "./queue-list";
import {
  ApiClientError,
  createQueue,
  createTask,
  deleteQueue,
  deleteTask,
  getQueue,
  getQueues,
  updateQueue,
  updateTask,
  type CreateTaskRequest,
  type Queue,
  type Task,
} from "../lib/api-client";
import type { TaskCategory, NewTaskCategory } from "../schemas/queues";

export function Dashboard() {
  const queryClient = useQueryClient();
  const queuesQuery = useQuery({
    queryKey: ["queues"],
    queryFn: getQueues,
    staleTime: 1000 * 30,
  });

  const [selectedQueueId, setSelectedQueueId] = useState<string | null>(null);

  const queues = queuesQuery.data ?? [];

  useEffect(() => {
    if (queues.length === 0) {
      setSelectedQueueId(null);
      return;
    }

    if (
      !selectedQueueId ||
      !queues.some((queue) => queue.id === selectedQueueId)
    ) {
      setSelectedQueueId(queues[0]?.id ?? null);
    }
  }, [queues, selectedQueueId]);

  const queueDetailQuery = useQuery({
    queryKey: ["queues", selectedQueueId],
    queryFn: () => getQueue(selectedQueueId!),
    enabled: Boolean(selectedQueueId),
  });

  const createQueueMutation = useMutation({
    mutationFn: createQueue,
    onSuccess: (queue) => {
      queryClient.invalidateQueries({ queryKey: ["queues"] });
      toast.success(`Queue "${queue.name}" created`);
      setSelectedQueueId(queue.id);
    },
    onError: (error) => handleApiError(error, "Unable to create queue"),
  });

  const updateQueueMutation = useMutation({
    mutationFn: ({
      queueId,
      updates,
    }: {
      queueId: string;
      updates: Parameters<typeof updateQueue>[1];
    }) => updateQueue(queueId, updates),
    onSuccess: (queue) => {
      queryClient.invalidateQueries({ queryKey: ["queues"] });
      queryClient.invalidateQueries({ queryKey: ["queues", queue.id] });
    },
    onError: (error) => handleApiError(error, "Unable to update queue"),
  });

  const deleteQueueMutation = useMutation({
    mutationFn: deleteQueue,
    onSuccess: (_, queueId) => {
      queryClient.invalidateQueries({ queryKey: ["queues"] });
      queryClient.removeQueries({ queryKey: ["queues", queueId] });
    },
    onError: (error) => handleApiError(error, "Unable to delete queue"),
  });

  const createTaskMutation = useMutation({
    mutationFn: ({
      queueId,
      payload,
    }: {
      queueId: string;
      payload: CreateTaskRequest;
    }) => createTask(queueId, payload),
    onSuccess: (_, { queueId }) => {
      queryClient.invalidateQueries({ queryKey: ["queues", queueId] });
    },
    onError: (error) => handleApiError(error, "Unable to create task"),
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({
      taskId,
      updates,
    }: {
      queueId: string;
      taskId: string;
      updates: Parameters<typeof updateTask>[1];
    }) => updateTask(taskId, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["queues", variables.queueId],
      });
    },
    onError: (error) => handleApiError(error, "Unable to update task"),
  });

  const deleteTaskMutation = useMutation({
    mutationFn: ({ queueId, taskId }: { queueId: string; taskId: string }) =>
      deleteTask(taskId),
    onSuccess: (_, { queueId }) => {
      queryClient.invalidateQueries({ queryKey: ["queues", queueId] });
    },
    onError: (error) => handleApiError(error, "Unable to delete task"),
  });

  const currentQueue = useMemo<Queue | null>(() => {
    if (!selectedQueueId) {
      return null;
    }
    return queues.find((queue) => queue.id === selectedQueueId) ?? null;
  }, [queues, selectedQueueId]);

  const currentQueueIndex = useMemo(() => {
    if (!currentQueue) {
      return 0;
    }
    const index = queues.findIndex((queue) => queue.id === currentQueue.id);
    return index === -1 ? 0 : index;
  }, [queues, currentQueue]);

  const tasks = queueDetailQuery.data?.tasks ?? [];
  const isLoading = queuesQuery.isLoading || queueDetailQuery.isLoading;

  function handlePreviousQueue() {
    if (!currentQueue) {
      return;
    }
    const index = queues.findIndex((queue) => queue.id === currentQueue.id);
    if (index > 0) {
      setSelectedQueueId(queues[index - 1]?.id ?? null);
    }
  }

  function handleNextQueue() {
    if (!currentQueue) {
      return;
    }
    const index = queues.findIndex((queue) => queue.id === currentQueue.id);
    if (index < queues.length - 1) {
      setSelectedQueueId(queues[index + 1]?.id ?? null);
    }
  }

  async function handleQueueNameChange(name: string) {
    if (!currentQueue) {
      return;
    }
    if (!name || name === currentQueue.name) {
      return;
    }

    await updateQueueMutation.mutateAsync({
      queueId: currentQueue.id,
      updates: { name },
    });
    toast.success("Queue name updated");
  }

  async function handleAddQueue() {
    await createQueueMutation.mutateAsync({
      name: "New Queue",
      color: "#3b82f6",
    });
  }

  async function handleDeleteQueue() {
    if (!currentQueue) {
      return;
    }
    if (queues.length <= 1) {
      toast.error("Cannot delete the last queue");
      return;
    }

    const index = queues.findIndex((queue) => queue.id === currentQueue.id);
    const fallbackQueue = queues[index + 1] ?? queues[index - 1] ?? null;

    await deleteQueueMutation.mutateAsync(currentQueue.id);
    toast.success(`"${currentQueue.name}" deleted`);
    setSelectedQueueId(fallbackQueue?.id ?? null);
  }

  async function handleCreateTask(category: NewTaskCategory, title: string) {
    if (!currentQueue) {
      return;
    }
    const payload: CreateTaskRequest = {
      category,
      title,
    };

    await createTaskMutation.mutateAsync({ queueId: currentQueue.id, payload });
    toast.success("Task created");
  }

  async function handleRenameTask(taskId: string, title: string) {
    if (!currentQueue) {
      return;
    }
    await updateTaskMutation.mutateAsync({
      queueId: currentQueue.id,
      taskId,
      updates: { title },
    });
    toast.success("Task updated");
  }

  async function handleToggleTask(taskId: string, completed: boolean) {
    if (!currentQueue) {
      return;
    }
    await updateTaskMutation.mutateAsync({
      queueId: currentQueue.id,
      taskId,
      updates: { completed },
    });
  }

  return (
    <div className="flex min-h-screen flex-col pt-4">
      <Header
        currentQueueIndex={currentQueueIndex}
        totalQueues={queues.length}
        onPreviousQueue={handlePreviousQueue}
        onNextQueue={handleNextQueue}
        currentQueueName={currentQueue?.name}
        onQueueNameChange={handleQueueNameChange}
        onAddQueue={handleAddQueue}
        onDeleteQueue={handleDeleteQueue}
      />
      <main className="flex-1 overflow-hidden pt-10">
        <QueueList
          queue={currentQueue}
          tasks={tasks}
          isLoading={isLoading}
          onCreateTask={handleCreateTask}
          onRenameTask={handleRenameTask}
          onToggleTask={handleToggleTask}
        />
        {!isLoading && !currentQueue && (
          <div className="flex w-full justify-center pt-10">
            <Button onClick={handleAddQueue} variant="outline">
              Add Queue
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}

function handleApiError(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiClientError) {
    toast.error(error.message);
  } else {
    console.error(error);
    toast.error(fallbackMessage);
  }
}
