"use client";

import { useState, useCallback } from "react";
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
} from "@repo/components";
import { useTasks, type TaskWithListInfo } from "@/providers/tasks-provider";
import { updateTask, createTask } from "@/app/actions/tasks";

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

export function TaskEditDrawer({ 
  task, 
  open, 
  onClose, 
  onSave,
  defaultListId,
  defaultDueDate,
  defaultListDisplayName,
}: TaskEditDrawerProps) {
  const { gtdLists, otherLists, refresh } = useTasks();
  
  // Use task ID as key to reset form state when task changes
  const formKey = task?.id ?? "new";

  // Determine initial list:
  // 1. If editing a task, use task's list
  // 2. If defaultListId is provided, use it (clicked from a specific list)
  // 3. If there's a due date but no defaultListId, use Active
  // 4. Otherwise use Someday
  const getInitialListId = () => {
    if (task?.listId) return task.listId;
    if (defaultListId) return defaultListId;
    if (defaultDueDate && gtdLists) return gtdLists.active.id;
    if (gtdLists) return gtdLists.someday.id;
    return "";
  };

  const [title, setTitle] = useState(() => task?.title ?? "");
  const [notes, setNotes] = useState(() => task?.notes ?? "");
  const [dueDate, setDueDate] = useState(() => {
    if (task?.due) return task.due.split("T")[0];
    return defaultDueDate ?? "";
  });
  const [selectedListId, setSelectedListId] = useState(getInitialListId);
  const [isSaving, setIsSaving] = useState(false);

  const isCreateMode = !task;

  // Check if selected list is "Active"
  const isActiveList = gtdLists && selectedListId === gtdLists.active.id;

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

  // Reset form when task changes
  const [prevFormKey, setPrevFormKey] = useState(formKey);
  if (formKey !== prevFormKey) {
    setPrevFormKey(formKey);
    setTitle(task?.title ?? "");
    setNotes(task?.notes ?? "");
    setDueDate(task?.due ? task.due.split("T")[0] : defaultDueDate ?? "");
    
    // Reset list selection - prioritize defaultListId when provided
    if (task?.listId) {
      setSelectedListId(task.listId);
    } else if (defaultListId) {
      setSelectedListId(defaultListId);
    } else if (defaultDueDate && gtdLists) {
      setSelectedListId(gtdLists.active.id);
    } else if (gtdLists) {
      setSelectedListId(gtdLists.someday.id);
    } else {
      setSelectedListId("");
    }
  }

  const handleSave = useCallback(async () => {
    setIsSaving(true);

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
          notes: notes || undefined,
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
      }
    } catch (error) {
      console.error("Error saving task:", error);
    } finally {
      setIsSaving(false);
    }
  }, [
    isCreateMode,
    task,
    title,
    notes,
    dueDate,
    selectedListId,
    defaultListId,
    refresh,
    onSave,
    onClose,
  ]);

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

        {/* Due Date - show for Active list, non-GTD tasks, or when creating in Other lists */}
        {(isActiveList || (task && !task.isGTDList) || (isCreateMode && isOtherList)) && (
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
                  : `Current list: ${findListName(selectedListId)}`}
              </p>
            </>
          )}
        </div>
      </div>
    </Drawer>
  );
}
