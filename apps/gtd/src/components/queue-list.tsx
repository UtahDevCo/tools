import type { NewTaskCategory } from "../schemas/queues";
import type { Queue, Task } from "../lib/api-client";
import { QueueColumn } from "./queue-column";

type QueueListProps = {
  queue: Queue | null;
  tasks: Task[];
  isLoading: boolean;
  onCreateTask: (
    category: NewTaskCategory,
    title: string
  ) => Promise<void> | void;
  onRenameTask: (taskId: string, title: string) => Promise<void> | void;
  onToggleTask: (taskId: string, completed: boolean) => Promise<void> | void;
};

export function QueueList({
  queue,
  tasks,
  isLoading,
  onCreateTask,
  onRenameTask,
  onToggleTask,
}: QueueListProps) {
  if (isLoading) return <LoadingState />;

  if (!queue) {
    return (
      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
        <p>No queues available. Create a queue to get started.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full justify-center">
      <div className="w-full">
        <QueueColumn
          queue={queue}
          tasks={tasks}
          onCreateTask={onCreateTask}
          onRenameTask={onRenameTask}
          onToggleTask={onToggleTask}
        />
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex h-full w-full justify-center">
      <div className="w-full space-y-6 px-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="space-y-3">
            <div className="h-6 w-40 animate-pulse rounded bg-gray-300" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((__, itemIndex) => (
                <div
                  key={itemIndex}
                  className="h-10 w-full animate-pulse rounded bg-gray-100"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
