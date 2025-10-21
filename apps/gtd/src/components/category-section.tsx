import { Plus } from "lucide-react";
import type { NewTaskCategory, TaskCategory } from "../schemas/queues";
import type { Task } from "../lib/api-client";
import { EmptyTaskCard, TaskCard } from "./task-card";

type CategorySectionProps = {
  category: TaskCategory;
  label: string;
  tasks: Task[];
  queueId: string;
  onCreateTask: (
    category: NewTaskCategory,
    title: string
  ) => Promise<void> | void;
  onRenameTask: (taskId: string, title: string) => Promise<void> | void;
  onToggleTask: (taskId: string, completed: boolean) => Promise<void> | void;
};

const MIN_CARDS = 5;

export function CategorySection({
  category,
  label,
  tasks,
  queueId,
  onCreateTask,
  onRenameTask,
  onToggleTask,
}: CategorySectionProps) {
  function handleCreateTask(title: string) {
    if (category === "archive") {
      throw new Error("Cannot create tasks in the Archive category");
    }

    onCreateTask(category, title);
  }

  function handleAddTask() {
    // Focus on first empty task card
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleAddTask}
        className="group flex w-full items-center justify-between text-left text-sm font-medium text-muted-foreground transition-colors hover:text-foreground border-b-2 pb-2"
      >
        <span className="text-xl font-bold">{label}</span>
        <Plus className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
      </button>
      <div className="space-y-2">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onRenameTask={onRenameTask}
            onToggleTask={onToggleTask}
          />
        ))}
        {Array.from({ length: Math.max(0, MIN_CARDS - tasks.length) }).map(
          (_, index) => (
            <EmptyTaskCard
              key={`empty-${index}`}
              onCreateTask={handleCreateTask}
              queueId={queueId}
              category={category}
            />
          )
        )}
      </div>
    </div>
  );
}
