"use client";

import { useState, useCallback } from "react";
import {
  Typography,
  Drawer,
  Button,
  Input,
  Textarea,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@repo/components";
import { Plus } from "lucide-react";
import Link from "next/link";

// Mock task type for the playground
type MockTask = {
  id: string;
  title: string;
  notes: string;
  due: string;
  listId: string;
  listDisplayName: string;
};

// Mock GTD list options
const MOCK_GTD_LISTS = [
  { id: "list-active", name: "Active" },
  { id: "list-next", name: "Next" },
  { id: "list-waiting", name: "Waiting" },
  { id: "list-someday", name: "Someday" },
];

// Sample tasks for demonstration
const SAMPLE_TASKS: MockTask[] = [
  {
    id: "task-1",
    title: "Review quarterly report",
    notes: "Check the numbers for Q3 and prepare summary",
    due: "2025-12-01",
    listId: "list-active",
    listDisplayName: "Active",
  },
  {
    id: "task-2",
    title: "Schedule dentist appointment",
    notes: "",
    due: "",
    listId: "list-next",
    listDisplayName: "Next",
  },
  {
    id: "task-3",
    title: "Learn Spanish",
    notes: "Start with Duolingo basics",
    due: "",
    listId: "list-someday",
    listDisplayName: "Someday",
  },
];

export default function FormsPlayground() {
  const [tasks, setTasks] = useState<MockTask[]>(SAMPLE_TASKS);
  const [selectedTask, setSelectedTask] = useState<MockTask | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(false);

  function handleTaskClick(task: MockTask) {
    setSelectedTask(task);
    setIsCreateMode(false);
    setIsDrawerOpen(true);
  }

  function handleNewTaskClick() {
    setSelectedTask(null);
    setIsCreateMode(true);
    setIsDrawerOpen(true);
  }

  function handleClose() {
    setIsDrawerOpen(false);
    setSelectedTask(null);
    setIsCreateMode(false);
  }

  function handleSave(updatedTask: MockTask) {
    if (isCreateMode) {
      setTasks((prev) => [...prev, { ...updatedTask, id: `task-${Date.now()}` }]);
    } else {
      setTasks((prev) =>
        prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
      );
    }
    handleClose();
  }

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <Link
          href="/playground"
          className="text-sm text-muted-foreground hover:text-orange-500 transition-colors"
        >
          ← Back to Playground
        </Link>
      </div>

      <Typography variant="headline" className="mb-2">
        Forms Playground
      </Typography>
      <Typography color="muted" className="mb-8">
        Task edit drawer and form component testing
      </Typography>

      <section className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <Typography variant="title">Sample Tasks</Typography>
          <Button onClick={handleNewTaskClick} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </Button>
        </div>
        <div className="border rounded-lg divide-y">
          {tasks.map((task) => (
            <button
              key={task.id}
              onClick={() => handleTaskClick(task)}
              className="w-full text-left p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 flex items-center gap-2 min-w-0">
                  <Typography variant="strong" className="truncate">
                    {task.title}
                  </Typography>
                  {task.notes && (
                    <Typography variant="light" color="muted" className="truncate">
                      {task.notes}
                    </Typography>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {task.due && (
                    <span className="text-xs text-muted-foreground">
                      {task.due}
                    </span>
                  )}
                  <span className="text-xs px-2 py-1 rounded bg-muted">
                    {task.listDisplayName}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <TaskEditDrawerPlayground
        task={selectedTask}
        open={isDrawerOpen}
        onClose={handleClose}
        onSave={handleSave}
        isCreateMode={isCreateMode}
        defaultListId="list-active"
        defaultListDisplayName="Active"
      />
    </main>
  );
}

type TaskEditDrawerPlaygroundProps = {
  task: MockTask | null;
  open: boolean;
  onClose: () => void;
  onSave: (task: MockTask) => void;
  isCreateMode: boolean;
  defaultListId?: string;
  defaultDueDate?: string;
  defaultListDisplayName?: string;
};

function TaskEditDrawerPlayground({
  task,
  open,
  onClose,
  onSave,
  isCreateMode,
  defaultListId,
  defaultDueDate,
  defaultListDisplayName,
}: TaskEditDrawerPlaygroundProps) {
  // Use task ID as key to reset form state when task changes
  const formKey = task?.id ?? "new";
  
  const [title, setTitle] = useState(() => task?.title ?? "");
  const [notes, setNotes] = useState(() => task?.notes ?? "");
  const [dueDate, setDueDate] = useState(() => {
    if (task?.due) return task.due.split("T")[0];
    return defaultDueDate ?? "";
  });
  const [selectedListId, setSelectedListId] = useState(
    () => task?.listId ?? defaultListId ?? ""
  );
  const [isSaving, setIsSaving] = useState(false);

  // Reset form when task changes
  const [prevFormKey, setPrevFormKey] = useState(formKey);
  if (formKey !== prevFormKey) {
    setPrevFormKey(formKey);
    setTitle(task?.title ?? "");
    setNotes(task?.notes ?? "");
    setDueDate(task?.due ? task.due.split("T")[0] : defaultDueDate ?? "");
    setSelectedListId(task?.listId ?? defaultListId ?? "");
  }

  const handleSave = useCallback(async () => {
    setIsSaving(true);

    // Simulate save delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    const selectedList = MOCK_GTD_LISTS.find((l) => l.id === selectedListId);

    const savedTask: MockTask = {
      id: task?.id ?? "",
      title,
      notes,
      due: dueDate,
      listId: selectedListId || defaultListId || "",
      listDisplayName: selectedList?.name || defaultListDisplayName || "",
    };

    onSave(savedTask);
    setIsSaving(false);
  }, [
    task,
    title,
    notes,
    dueDate,
    selectedListId,
    defaultListId,
    defaultListDisplayName,
    onSave,
  ]);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isCreateMode ? "New Task" : "Edit Task"}
      position="right"
      showModeToggle={false}
      actions={
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !title.trim()}>
            {isSaving ? "Saving..." : isCreateMode ? "Create" : "Save"}
          </Button>
        </div>
      }
    >
      <div className="p-4 space-y-4">
        {/* Title */}
        <div>
          <Label htmlFor="task-title">Title</Label>
          <Input
            id="task-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title"
          />
        </div>

        {/* Notes */}
        <div>
          <Label htmlFor="task-notes">Notes</Label>
          <Textarea
            id="task-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes..."
          />
        </div>

        {/* Due Date */}
        <div>
          <Label htmlFor="task-due">Due Date</Label>
          <Input
            id="task-due"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        {/* GTD List Selection */}
        <div>
          <Label>GTD List</Label>
          <Select value={selectedListId} onValueChange={setSelectedListId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a list" />
            </SelectTrigger>
            <SelectContent>
              {MOCK_GTD_LISTS.map((list) => (
                <SelectItem key={list.id} value={list.id}>
                  {list.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1 px-1">
            {isCreateMode
              ? `Creating in: ${defaultListDisplayName ?? "Unknown"}`
              : `Current list: ${task?.listDisplayName ?? "Unknown"}`}
          </p>
        </div>
      </div>
    </Drawer>
  );
}
