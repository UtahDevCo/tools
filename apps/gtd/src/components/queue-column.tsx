import { ScrollArea } from "@/components/ui/scroll-area";
import type { NewTaskCategory, TaskCategory } from "../schemas/queues";
import type { Queue, Task } from "../lib/api-client";
import { CategorySection } from "./category-section";

type QueueColumnProps = {
  queue: Queue;
  tasks: Task[];
  onCreateTask: (
    category: NewTaskCategory,
    title: string
  ) => Promise<void> | void;
  onRenameTask: (taskId: string, title: string) => Promise<void> | void;
  onToggleTask: (taskId: string, completed: boolean) => Promise<void> | void;
};

const CATEGORY_LABELS: Record<TaskCategory, string> = {
  next: "Next Actions",
  waiting: "Waiting On",
  someday: "Someday",
  archive: "Archive",
};

export function QueueColumn({
  queue,
  tasks,
  onCreateTask,
  onRenameTask,
  onToggleTask,
}: QueueColumnProps) {
  const tasksByCategory: Record<TaskCategory, Task[]> = {
    next: [],
    waiting: [],
    someday: [],
    archive: [],
  };

  for (const task of tasks) {
    tasksByCategory[task.category]?.push(task);
  }

  for (const category of Object.keys(tasksByCategory) as TaskCategory[]) {
    tasksByCategory[category].sort((a, b) => a.position - b.position);
  }

  return (
    <div className="flex h-full flex-1 flex-shrink-0 flex-col bg-card">
      <ScrollArea className="flex-1 px-4">
        <div className="space-y-8 py-4">
          {Object.entries(CATEGORY_LABELS).map(([category, label]) => (
            <CategorySection
              key={category}
              category={category as TaskCategory}
              label={label}
              tasks={tasksByCategory[category as TaskCategory]}
              queueId={queue.id}
              onCreateTask={onCreateTask}
              onRenameTask={onRenameTask}
              onToggleTask={onToggleTask}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
