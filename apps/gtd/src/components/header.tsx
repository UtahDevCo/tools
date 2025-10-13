import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useKeydown } from "@/hooks/use-keydown";
import {
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  EllipsisVertical,
  Plus,
  Trash,
} from "lucide-react";

type HeaderProps = {
  currentQueueIndex: number;
  totalQueues: number;
  onPreviousQueue: () => void;
  onNextQueue: () => void;
  currentQueueName?: string;
  onQueueNameChange?: (name: string) => void;
  onAddQueue?: () => void;
  onDeleteQueue?: () => void;
};

export function Header({
  currentQueueIndex,
  totalQueues,
  onPreviousQueue,
  onNextQueue,
  currentQueueName,
  onQueueNameChange,
  onAddQueue,
  onDeleteQueue,
}: HeaderProps) {
  const [queueName, setQueueName] = useState(currentQueueName || "");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    setQueueName(currentQueueName || "");
  }, [currentQueueName]);

  useKeydown({
    isActive: true,
    callback: (event) => {
      if (event instanceof KeyboardEvent) {
        if (!event.altKey && event.shiftKey) {
        } else {
          switch (event.key) {
            case "ArrowLeft":
              onPreviousQueue();
              break;
            case "ArrowRight":
              onNextQueue();
              break;
          }
        }
      }
    },
  });

  function handleQueueNameBlur() {
    if (titleRef.current) {
      const newName = titleRef.current.textContent?.trim() || "";
      if (newName && newName !== currentQueueName) {
        setQueueName(newName);
        onQueueNameChange?.(newName);
        console.log("Queue name changed to:", newName);
      } else {
        // Reset to current name if empty or unchanged
        titleRef.current.textContent = currentQueueName || "";
      }
    }
  }

  function handleQueueNameKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      titleRef.current?.blur();
    } else if (e.key === "Escape") {
      e.preventDefault();
      if (titleRef.current) {
        titleRef.current.textContent = currentQueueName || "";
      }
      titleRef.current?.blur();
    }
  }

  function handleDeleteQueue() {
    setShowDeleteDialog(true);
  }

  function handleConfirmDelete() {
    onDeleteQueue?.();
    setShowDeleteDialog(false);
    console.log("Delete queue:", currentQueueName);
  }

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-4">
          <div className="flex items-center space-x-2">
            <h1
              ref={titleRef}
              contentEditable
              suppressContentEditableWarning
              onBlur={handleQueueNameBlur}
              onKeyDown={handleQueueNameKeyDown}
              className="text-4xl font-bold outline-none focus:ring-2 focus:ring-ring rounded px-2 -mx-2"
            >
              {queueName}
            </h1>
          </div>
          <div className="flex flex-1 items-center justify-end space-x-4">
            {/* Queue Actions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <EllipsisVertical className="h-5 w-5" />
                  <span className="sr-only">Queue actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white">
                <DropdownMenuItem onSelect={onAddQueue}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add new list
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={handleDeleteQueue}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash className="mr-2 h-4 w-4" />
                  Delete list
                </DropdownMenuItem>


                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Column navigation controls */}
            <div className="flex items-center gap-3">
              <Button
                onClick={onPreviousQueue}
                disabled={currentQueueIndex === 0}
                className="h-12 w-12 rounded-full bg-black text-white hover:bg-black/90 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
                title="⌥⇧←"
              >
                <ChevronLeft className="h-6 w-6" />
                <span className="sr-only">Previous queue</span>
              </Button>

              <Button
                onClick={onNextQueue}
                disabled={currentQueueIndex >= totalQueues - 1}
                className="h-12 w-12 rounded-full bg-black text-white hover:bg-black/90 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
                title="⌥⇧→"
              >
                <ChevronRight className="h-6 w-6" />
                <span className="sr-only">Next queue</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{currentQueueName}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All tasks in this queue will be
              permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
