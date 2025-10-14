import { TaskCard, EmptyTaskCard } from "./task-card";
import { Plus } from "lucide-react";

type Task = {
  id: string;
  title: string;
  completed: boolean;
  queueId: string;
  category: string;
};

type CategorySectionProps = {
  category: string;
  label: string;
  tasks: Task[];
  queueId: string;
};

const MIN_CARDS = 5;

export function CategorySection({
  category,
  label,
  tasks,
  queueId,
}: CategorySectionProps) {
  function handleCreateTask(title: string) {
    console.info("Create task in", category, "in queue", queueId, ":", title);
    // TODO: Call API to create task
  }

  function handleAddTask() {
    console.info("Add task to", category, "in queue", queueId);
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
          <TaskCard key={task.id} task={task} />
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
