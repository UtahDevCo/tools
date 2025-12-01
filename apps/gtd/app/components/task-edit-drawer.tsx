"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
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
  SelectSeparator,
  SelectGroup,
  SelectLabel,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Checkbox,
} from "@repo/components";
import { Plus, ListTree, Check } from "lucide-react";
import { useTasks, type TaskWithListInfo } from "@/providers/tasks-provider";
import {
  updateTask,
  createTask,
  deleteTask,
  moveTasksToList,
  completeTask,
  uncompleteTask,
} from "@/lib/tasks-with-refresh";
import {
  parsePriorityFromNotes,
  addPriorityToNotes,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  type Priority,
} from "@/lib/google-tasks/priority-utils";
import { clsx } from "clsx";

type TaskEditDrawerProps = {
  task: TaskWithListInfo | null;
  open: boolean;
  onClose: () => void;
  onSave?: () => void;
  /** List ID to use when creating a new task (required when task is null) */
  defaultListId?: string;
  /** Default due date in YYYY-MM-DD format for new tasks */
  defaultDueDate?: string;
  /** Display name for the target list (shown in create mode) */
  defaultListDisplayName?: string;
};

const DRAWER_ANIMATION_DELAY_MS = 500;

export function TaskEditDrawer({
  task,
  open,
  onClose,
  onSave,
  defaultListId,
  defaultDueDate,
}: TaskEditDrawerProps) {
  const {
    gtdLists,
    otherLists,
    refresh,
    getSubtasks,
    hasSubtasks: checkHasSubtasks,
    addSubtask,
    optimisticToggleComplete,
  } = useTasks();
  const drawerContentRef = useRef<HTMLDivElement>(null);

  // Focus first autofocus input after drawer animation completes
  useEffect(() => {
    if (!open) return;

    const timeoutId = setTimeout(() => {
      const autofocusInput = drawerContentRef.current?.querySelector<HTMLInputElement>(
        'input[autofocus], textarea[autofocus]'
      );
      autofocusInput?.focus();
    }, DRAWER_ANIMATION_DELAY_MS);

    return () => clearTimeout(timeoutId);
  }, [open]);

  // Determine initial list:
  // 1. If editing a task, use task's list
  // 2. If defaultListId is provided, use it (clicked from a specific list)
  // 3. If there's a due date but no defaultListId, use Active
  // 4. Otherwise use Someday
  const getInitialListId = useCallback(() => {
    if (task?.listId) return task.listId;
    if (defaultListId) return defaultListId;
    if (defaultDueDate && gtdLists) return gtdLists.active.id;
    if (gtdLists) return gtdLists.someday.id;
    return "";
  }, [task?.listId, defaultListId, defaultDueDate, gtdLists]);

  const getInitialDueDate = useCallback(() => {
    if (task?.due) return task.due.split("T")[0];
    return defaultDueDate ?? "";
  }, [task?.due, defaultDueDate]);

  const getInitialPriorityAndNotes = useCallback(() => {
    const { priority, cleanNotes } = parsePriorityFromNotes(task?.notes);
    return { priority, cleanNotes };
  }, [task?.notes]);

  const [title, setTitle] = useState(() => task?.title ?? "");
  const [notes, setNotes] = useState(
    () => getInitialPriorityAndNotes().cleanNotes
  );
  const [priority, setPriority] = useState<Priority>(
    () => getInitialPriorityAndNotes().priority
  );
  const [dueDate, setDueDate] = useState(getInitialDueDate);
  const [selectedListId, setSelectedListId] = useState(getInitialListId);
  const [isCompleted, setIsCompleted] = useState(
    () => task?.status === "completed"
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Subtask state
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [showSubtaskInput, setShowSubtaskInput] = useState(false);
  const subtaskInputRef = useRef<HTMLInputElement>(null);

  // Reset form when drawer opens or task changes
  const [prevOpen, setPrevOpen] = useState(open);
  const [prevTaskId, setPrevTaskId] = useState(task?.id);

  if (open !== prevOpen || task?.id !== prevTaskId) {
    setPrevOpen(open);
    setPrevTaskId(task?.id);

    // Reset form when drawer opens (regardless of task) or task changes
    if (open && (!prevOpen || task?.id !== prevTaskId)) {
      const { priority: initialPriority, cleanNotes: initialNotes } =
        parsePriorityFromNotes(task?.notes);
      setTitle(task?.title ?? "");
      setNotes(initialNotes);
      setPriority(initialPriority);
      setDueDate(getInitialDueDate());
      setSelectedListId(getInitialListId());
      setIsCompleted(task?.status === "completed");
      setShowDeleteConfirm(false);
      setNewSubtaskTitle("");
      setShowSubtaskInput(false);
    }
  }

  const isCreateMode = !task;

  // Check if a list ID belongs to "Other" lists
  const isOtherListId = (listId: string) =>
    otherLists.some((l) => l.taskList.id === listId);

  // Handle list change - enforce due date rules for GTD lists
  const handleListChange = (newListId: string) => {
    setSelectedListId(newListId);

    // Only enforce due date rules for GTD lists
    if (gtdLists && !isOtherListId(newListId)) {
      if (newListId === gtdLists.active.id) {
        // Switching to Active - require a due date (set to today if empty)
        if (!dueDate) {
          const today = new Date().toISOString().split("T")[0];
          setDueDate(today);
        }
      } else {
        // Switching to other GTD lists (Next/Waiting/Someday) - clear due date
        setDueDate("");
      }
    }
    // For Other lists, keep the due date as-is (optional)
  };

  // Handle due date change - enforce list rules only for GTD lists
  const handleDueDateChange = (newDueDate: string) => {
    // Only enforce GTD list rules if we're in a GTD list
    if (gtdLists && !isOtherListId(selectedListId)) {
      if (newDueDate && selectedListId !== gtdLists.active.id) {
        // Adding a due date while in non-Active GTD list - switch to Active list
        setSelectedListId(gtdLists.active.id);
      } else if (!newDueDate && selectedListId === gtdLists.active.id) {
        // Removing due date from Active - switch to Someday
        setSelectedListId(gtdLists.someday.id);
      }
    }
    // For Other lists, just update the due date without changing lists
    setDueDate(newDueDate);
  };

  // Handle completion toggle
  const handleCompletionToggle = async () => {
    if (!task) return;

    const newStatus = !isCompleted;
    setIsCompleted(newStatus);

    // Call server action
    const result = newStatus
      ? await completeTask(task.listId, task.id)
      : await uncompleteTask(task.listId, task.id);

    if (!result.success) {
      // Rollback on error
      setIsCompleted(!newStatus);
      console.error("Failed to toggle completion:", result.error);
    } else {
      refresh();
    }
  };

  // Check if selected list is "Active"
  const isActiveList = gtdLists && selectedListId === gtdLists.active.id;

  // Form validation
  const isFormValid =
    title.trim().length > 0 && (selectedListId || defaultListId);

  // Check if list changed (need to move task)
  const listChanged = task && selectedListId !== task.listId;

  const handleSave = useCallback(async () => {
    if (!isFormValid) return;
    setIsSaving(true);

    // Combine priority with notes
    const notesWithPriority = addPriorityToNotes(notes, priority);

    try {
      if (isCreateMode) {
        // Create new task
        const targetListId = selectedListId || defaultListId;
        if (!targetListId) {
          console.error("No list ID available for creating task");
          return;
        }

        const result = await createTask(targetListId, {
          title,
          notes: notesWithPriority || undefined,
          due: dueDate ? `${dueDate}T00:00:00.000Z` : undefined,
        });

        if (result.success) {
          refresh();
          onSave?.();
          onClose();
        } else {
          console.error("Failed to create task:", result.error);
        }
      } else {
        // Update existing task
        const result = await updateTask(task.listId, task.id, {
          title,
          notes: notesWithPriority || undefined,
          due: dueDate ? `${dueDate}T00:00:00.000Z` : undefined,
        });

        if (!result.success) {
          console.error("Failed to save task:", result.error);
          return;
        }

        // If list changed, move the task
        if (listChanged && selectedListId) {
          const moveResult = await moveTasksToList(
            [
              {
                listId: task.listId,
                taskId: task.id,
                title,
                notes: notesWithPriority,
                due: dueDate,
              },
            ],
            selectedListId
          );

          if (!moveResult.success) {
            console.error("Failed to move task:", moveResult.error);
          }
        }

        refresh();
        onSave?.();
        onClose();
      }
    } catch (error) {
      console.error("Error saving task:", error);
    } finally {
      setIsSaving(false);
    }
  }, [
    isCreateMode,
    isFormValid,
    task,
    title,
    notes,
    priority,
    dueDate,
    selectedListId,
    defaultListId,
    listChanged,
    refresh,
    onSave,
    onClose,
  ]);

  const handleDelete = useCallback(async () => {
    if (!task) return;

    setIsDeleting(true);
    try {
      const result = await deleteTask(task.listId, task.id);
      if (result.success) {
        refresh();
        setShowDeleteConfirm(false);
        onClose();
      } else {
        console.error("Failed to delete task:", result.error);
      }
    } catch (error) {
      console.error("Error deleting task:", error);
    } finally {
      setIsDeleting(false);
    }
  }, [task, refresh, onClose]);

  // Handle adding a subtask
  const handleAddSubtask = async () => {
    if (!task || !newSubtaskTitle.trim()) return;

    setIsAddingSubtask(true);
    const success = await addSubtask(task, newSubtaskTitle.trim());

    if (success) {
      setNewSubtaskTitle("");
      setShowSubtaskInput(false);
    }
    setIsAddingSubtask(false);
  };

  // Focus subtask input when shown
  useEffect(() => {
    if (showSubtaskInput && subtaskInputRef.current) {
      subtaskInputRef.current.focus();
    }
  }, [showSubtaskInput]);

  // Get subtasks for this task
  const subtasks = task ? getSubtasks(task.id, task.listId) : [];
  const hasSubtasksForTask = task
    ? checkHasSubtasks(task.id, task.listId)
    : false;

  // Handle subtask completion toggle
  const handleSubtaskToggle = (subtask: TaskWithListInfo) => {
    optimisticToggleComplete(subtask);
  };

  const gtdListOptions = gtdLists
    ? [
        { id: gtdLists.active.id, name: "Active" },
        { id: gtdLists.next.id, name: "Next" },
        { id: gtdLists.waiting.id, name: "Waiting" },
        { id: gtdLists.someday.id, name: "Someday" },
      ]
    : [];

  const otherListOptions = otherLists.map((list) => ({
    id: list.taskList.id,
    name: list.displayName,
  }));

  // Helper to find list name from all available lists
  const findListName = (listId: string): string => {
    const gtdList = gtdListOptions.find((l) => l.id === listId);
    if (gtdList) return gtdList.name;
    const otherList = otherListOptions.find((l) => l.id === listId);
    if (otherList) return otherList.name;
    return "Unknown";
  };

  // Check if selected list is an "Other" list (non-GTD)
  const isOtherList = otherListOptions.some((l) => l.id === selectedListId);

  // Handle form submission via Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Don't submit form if we're in the subtask input - let subtask handle Enter
    if (subtaskInputRef.current && subtaskInputRef.current === e.target) {
      return;
    }
    if (e.key === "Enter" && !e.shiftKey && isFormValid && !isSaving) {
      e.preventDefault();
      handleSave();
    }
  };

  // Priority options
  const priorityOptions: Priority[] = ["none", "high", "medium", "low"];

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isCreateMode ? "New Task" : "Edit Task"}
      position="right"
      showModeToggle={false}
      actions={
        <div className="flex flex-row-reverse gap-2 justify-end">
          <Button
            onClick={handleSave}
            disabled={isSaving || !isFormValid}
            tabIndex={0}
          >
            {isSaving ? "Saving..." : isCreateMode ? "Create" : "Save"}
          </Button>

          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
            tabIndex={0}
          >
            Cancel
          </Button>

          <div className="flex-1" />

          {!isCreateMode && (
            <Button
              variant="destructive"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isSaving || isDeleting}
              tabIndex={0}
            >
              Delete
            </Button>
          )}
        </div>
      }
    >
      <div
        ref={drawerContentRef}
        className="p-4 space-y-4"
        onKeyDown={handleKeyDown}
      >
        {/* Completion Toggle (edit mode only) */}
        {!isCreateMode && (
          <div className="flex items-center gap-3 pb-2 border-b">
            <Checkbox
              id="task-completed"
              checked={isCompleted}
              onCheckedChange={handleCompletionToggle}
            />
            <Label
              htmlFor="task-completed"
              className={clsx(
                "cursor-pointer",
                isCompleted && "line-through text-muted-foreground"
              )}
            >
              {isCompleted ? "Completed" : "Mark as complete"}
            </Label>
            {isCompleted && task?.completed && (
              <span className="text-xs text-muted-foreground ml-auto">
                {new Date(task.completed).toLocaleDateString()}
              </span>
            )}
          </div>
        )}

        {/* Title */}
        <div>
          <Label htmlFor="task-title">Title</Label>
          <Input
            autoFocus
            id="task-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title"
            className={clsx(isCompleted && "line-through text-muted-foreground")}
          />
        </div>

        {/* Priority */}
        <div>
          <Label>Priority</Label>
          <Select
            value={priority}
            onValueChange={(value) => setPriority(value as Priority)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent>
              {priorityOptions.map((p) => (
                <SelectItem key={p} value={p}>
                  <span className="flex items-center gap-2">
                    {p !== "none" && (
                      <span
                        className={clsx(
                          "w-2 h-2 rounded-full",
                          PRIORITY_COLORS[p].bg
                        )}
                      />
                    )}
                    {PRIORITY_LABELS[p]}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Notes */}
        <div>
          <Label htmlFor="task-notes">Notes</Label>
          <Textarea
            id="task-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes..."
            onKeyDown={(e) => {
              // Allow Shift+Enter for newlines in textarea
              if (e.key === "Enter" && !e.shiftKey) {
                e.stopPropagation();
              }
            }}
          />
        </div>

        {/* Due Date - show for Active list, non-GTD tasks, or when creating in Other lists */}
        {(isActiveList ||
          (task && !task.isGTDList) ||
          (isCreateMode && isOtherList)) && (
          <div>
            <Label htmlFor="task-due">Due Date</Label>
            <Input
              id="task-due"
              type="date"
              value={dueDate}
              onChange={(e) => handleDueDateChange(e.target.value)}
            />
          </div>
        )}

        {/* List Selection - show as read-only for non-GTD tasks being edited */}
        <div>
          <Label>List</Label>
          {task && !task.isGTDList ? (
            // Non-GTD task: show list as read-only data field
            <>
              <p className="text-sm py-2 px-3 bg-muted rounded-md">
                {task.listDisplayName}
              </p>
              <p className="text-xs text-muted-foreground mt-1 px-1">
                This task belongs to a non-GTD list and cannot be moved.
              </p>
            </>
          ) : (
            // GTD task or create mode: show editable select
            <>
              <Select value={selectedListId} onValueChange={handleListChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a list" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>GTD Lists</SelectLabel>
                    {gtdListOptions.map((list) => (
                      <SelectItem key={list.id} value={list.id}>
                        {list.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  {otherListOptions.length > 0 && (
                    <>
                      <SelectSeparator />
                      <SelectGroup>
                        <SelectLabel>Other Lists</SelectLabel>
                        {otherListOptions.map((list) => (
                          <SelectItem key={list.id} value={list.id}>
                            {list.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1 px-1">
                {isCreateMode
                  ? `Creating in: ${findListName(selectedListId)}`
                  : listChanged
                    ? `Moving from ${task?.listDisplayName} to ${findListName(selectedListId)}`
                    : `Current list: ${findListName(selectedListId)}`}
              </p>
            </>
          )}
        </div>

        {/* Subtasks Section (edit mode only) */}
        {!isCreateMode && (
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-2">
              <Label className="flex items-center gap-2">
                <ListTree className="w-4 h-4" />
                Subtasks
                {hasSubtasksForTask && (
                  <span className="text-xs text-muted-foreground">
                    ({subtasks.length})
                  </span>
                )}
              </Label>
              {!showSubtaskInput && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSubtaskInput(true)}
                  className="h-7 px-2"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              )}
            </div>

            {/* Subtask List */}
            {subtasks.length > 0 && (
              <div className="space-y-1 mb-2">
                {subtasks.map((subtask) => (
                  <div
                    key={subtask.id}
                    className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={subtask.status === "completed"}
                      onCheckedChange={() => handleSubtaskToggle(subtask)}
                    />
                    <span
                      className={clsx(
                        "text-sm flex-1",
                        subtask.status === "completed" &&
                          "line-through text-muted-foreground"
                      )}
                    >
                      {subtask.title}
                    </span>
                    {subtask.status === "completed" && (
                      <Check className="w-3 h-3 text-green-500" />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Add Subtask Input */}
            {showSubtaskInput && (
              <div className="flex gap-2">
                <Input
                  ref={subtaskInputRef}
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  placeholder="Subtask title"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newSubtaskTitle.trim()) {
                      e.preventDefault();
                      e.stopPropagation();
                      handleAddSubtask();
                    } else if (e.key === "Escape") {
                      setShowSubtaskInput(false);
                      setNewSubtaskTitle("");
                    }
                  }}
                  disabled={isAddingSubtask}
                />
                <Button
                  size="sm"
                  onClick={handleAddSubtask}
                  disabled={!newSubtaskTitle.trim() || isAddingSubtask}
                >
                  {isAddingSubtask ? "..." : "Add"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowSubtaskInput(false);
                    setNewSubtaskTitle("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            )}

            {/* Empty state */}
            {!hasSubtasksForTask && !showSubtaskInput && (
              <p className="text-sm text-muted-foreground">
                No subtasks yet. Click &quot;Add&quot; to create one.
              </p>
            )}
          </div>
        )}
      </div>
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{task?.title}&rdquo;? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Drawer>
  );
}
