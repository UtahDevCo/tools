import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { GripVertical } from "lucide-react";
import type { TaskCategory } from "../schemas/queues";
import type { Task } from "../lib/api-client";
import { cn } from "@/lib/utils";

type TaskCardProps = {
  task: Task;
  onRenameTask: (taskId: string, title: string) => Promise<void> | void;
  onToggleTask: (taskId: string, completed: boolean) => Promise<void> | void;
};

export function TaskCard({ task, onRenameTask, onToggleTask }: TaskCardProps) {
  const [isCompleted, setIsCompleted] = useState(task.completed);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const contentRef = useRef<HTMLDivElement>(null);

  function handleToggleComplete(checked: boolean) {
    const nextChecked = Boolean(checked);
    setIsCompleted(nextChecked);
    onToggleTask(task.id, nextChecked);
  }

  function handleClick(e: React.MouseEvent) {
    // Don't start editing if clicking on checkbox or drag handle
    if (
      (e.target as HTMLElement).closest('button[role="checkbox"]') ||
      (e.target as HTMLElement).closest('button[aria-label="Drag to reorder"]')
    ) {
      return;
    }
    setIsEditing(true);
  }

  function handleBlur() {
    setIsEditing(false);
    if (contentRef.current) {
      const newTitle = contentRef.current.textContent || "";
      if (newTitle.trim() !== title) {
        setTitle(newTitle.trim());
        onRenameTask(task.id, newTitle.trim());
      }
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      contentRef.current?.blur();
    } else if (e.key === "Escape") {
      e.preventDefault();
      if (contentRef.current) {
        contentRef.current.textContent = title;
      }
      setIsEditing(false);
    }
  }

  useEffect(() => {
    if (isEditing && contentRef.current) {
      contentRef.current.focus();
      // Select all text when entering edit mode
      const range = document.createRange();
      range.selectNodeContents(contentRef.current);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }, [isEditing]);

  useEffect(() => {
    setIsCompleted(task.completed);
  }, [task.completed]);

  useEffect(() => {
    setTitle(task.title);
    if (!isEditing && contentRef.current) {
      contentRef.current.textContent = task.title;
    }
  }, [task.title, isEditing]);

  return (
    <Card
      className="group cursor-pointer py-2 px-2 transition-colors hover:bg-accent focus-within:bg-accent"
      onClick={handleClick}
      tabIndex={0}
    >
      <div className="flex items-start gap-2">
        <button
          className="cursor-grab opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 -ml-7 group-hover:ml-0 group-focus-within:ml-0 transition-all duration-300 p-0.5 w-4 flex-shrink-0"
          aria-label="Drag to reorder"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>

        <Checkbox
          checked={isCompleted}
          onCheckedChange={handleToggleComplete}
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 -ml-7 group-hover:ml-0 group-focus-within:ml-0 transition-all duration-300 flex-shrink-0"
        />

        <div
          ref={contentRef}
          contentEditable={isEditing}
          suppressContentEditableWarning
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={cn(
            "flex-1 min-w-0 outline-none text-sm leading-tight transition-all duration-150",
            isCompleted && "line-through text-muted-foreground",
            isEditing && "ring-2 ring-ring rounded px-1"
          )}
        >
          {title}
        </div>
      </div>
    </Card>
  );
}

type EmptyTaskCardProps = {
  onCreateTask: (title: string) => Promise<void> | void;
  queueId: string;
  category: TaskCategory;
};

export function EmptyTaskCard({
  onCreateTask,
  queueId,
  category,
}: EmptyTaskCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  function handleClick() {
    setIsEditing(true);
  }

  function handleBlur() {
    if (contentRef.current) {
      const title = contentRef.current.textContent?.trim() || "";
      if (title) {
        onCreateTask(title);
        console.info("Create task in", category, "queue", queueId, ":", title);
      }
    }
    setIsEditing(false);
    if (contentRef.current) {
      contentRef.current.textContent = "";
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      contentRef.current?.blur();
    } else if (e.key === "Escape") {
      e.preventDefault();
      if (contentRef.current) {
        contentRef.current.textContent = "";
      }
      setIsEditing(false);
    }
  }

  useEffect(() => {
    if (isEditing && contentRef.current) {
      contentRef.current.focus();
    }
  }, [isEditing]);

  return (
    <Card
      className="group cursor-pointer py-2 px-0 transition-colors hover:bg-accent focus-within:bg-accent"
      onClick={handleClick}
      tabIndex={0}
    >
      <div className="flex items-start gap-2">
        <div
          ref={contentRef}
          contentEditable={isEditing}
          suppressContentEditableWarning
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={cn(
            "flex-1 min-w-0 outline-none text-sm leading-tight h-5",
            isEditing && "ring-2 ring-ring rounded"
          )}
        />
      </div>
    </Card>
  );
}
