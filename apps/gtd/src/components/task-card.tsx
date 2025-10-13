import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

type Task = {
  id: string;
  title: string;
  completed: boolean;
  queueId: string;
  category: string;
};

type TaskCardProps = {
  task: Task;
};

export function TaskCard({ task }: TaskCardProps) {
  const [isCompleted, setIsCompleted] = useState(task.completed);

  function handleToggleComplete(checked: boolean) {
    setIsCompleted(checked as boolean);
    console.log("Toggle task", task.id, "to", checked);
  }

  function handleClick() {
    console.log("Open task", task.id);
  }

  return (
    <Card
      className="group cursor-pointer py-2 transition-colors hover:bg-accent"
      onClick={handleClick}
    >
      <div className="flex items-start">
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-sm leading-tight",
              isCompleted && "line-through text-muted-foreground"
            )}
          >
            {task.title}
          </p>
        </div>

        <Checkbox
          checked={isCompleted}
          onCheckedChange={handleToggleComplete}
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5"
        />
      </div>
    </Card>
  );
}

export function EmptyTaskCard({ onClick }: { onClick: () => void }) {
  return (
    <Card
      className="group cursor-pointer py-4 transition-colors hover:bg-accent"
      onClick={onClick}
    />
  );
}
