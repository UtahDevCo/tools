"use client";

import { useState, useCallback, useEffect } from "react";
import { Drawer, Button } from "@repo/components";
import { Input } from "@repo/components/ui/input";
import { useTasks, type TaskWithListInfo } from "@/providers/tasks-provider";
import { updateTask } from "@/app/actions/tasks";
import { Calendar, List, FileText } from "lucide-react";

type TaskEditDrawerProps = {
  task: TaskWithListInfo | null;
  open: boolean;
  onClose: () => void;
  onSave?: () => void;
};

export function TaskEditDrawer({ task, open, onClose, onSave }: TaskEditDrawerProps) {
  const { gtdLists, refresh } = useTasks();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [selectedListId, setSelectedListId] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Reset form when task changes
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setNotes(task.notes ?? "");
      setDueDate(task.due ? task.due.split("T")[0] : "");
      setSelectedListId(task.listId);
    } else {
      setTitle("");
      setNotes("");
      setDueDate("");
      setSelectedListId("");
    }
  }, [task]);

  const handleSave = useCallback(async () => {
    if (!task) return;

    setIsSaving(true);

    try {
      // Update task in current list
      const result = await updateTask(task.listId, task.id, {
        title,
        notes: notes || undefined,
        due: dueDate ? `${dueDate}T00:00:00.000Z` : undefined,
      });

      if (result.success) {
        refresh();
        onSave?.();
        onClose();
      } else {
        console.error("Failed to save task:", result.error);
      }
    } catch (error) {
      console.error("Error saving task:", error);
    } finally {
      setIsSaving(false);
    }
  }, [task, title, notes, dueDate, refresh, onSave, onClose]);

  const gtdListOptions = gtdLists
    ? [
        { id: gtdLists.next.id, name: "Next" },
        { id: gtdLists.waiting.id, name: "Waiting" },
        { id: gtdLists.someday.id, name: "Someday" },
      ]
    : [];

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={task ? "Edit Task" : "Task Details"}
      position="right"
      showModeToggle={false}
      actions={
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !title.trim()}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      }
    >
      <div className="p-4 space-y-6">
        {/* Title */}
        <div className="space-y-2">
          <label htmlFor="task-title" className="text-sm font-medium text-foreground flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Title
          </label>
          <Input
            id="task-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title"
          />
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <label htmlFor="task-notes" className="text-sm font-medium text-foreground">
            Notes
          </label>
          <textarea
            id="task-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes..."
            className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        {/* Due Date */}
        <div className="space-y-2">
          <label htmlFor="task-due" className="text-sm font-medium text-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Due Date
          </label>
          <Input
            id="task-due"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        {/* GTD List Selection */}
        <div className="space-y-2">
          <label htmlFor="task-list" className="text-sm font-medium text-foreground flex items-center gap-2">
            <List className="h-4 w-4" />
            GTD List
          </label>
          <select
            id="task-list"
            value={selectedListId}
            onChange={(e) => setSelectedListId(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {gtdListOptions.map((list) => (
              <option key={list.id} value={list.id}>
                {list.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Current list: {task?.listDisplayName ?? "Unknown"}
          </p>
        </div>
      </div>
    </Drawer>
  );
}
