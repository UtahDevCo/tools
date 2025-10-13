import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useKeydown } from "@/hooks/use-keydown";
import {
  User,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  EllipsisVertical,
} from "lucide-react";

type HeaderProps = {
  currentQueueIndex: number;
  totalQueues: number;
  onPreviousQueue: () => void;
  onNextQueue: () => void;
  currentQueueName?: string;
};

export function Header({
  currentQueueIndex,
  totalQueues,
  onPreviousQueue,
  onNextQueue,
  currentQueueName,
}: HeaderProps) {
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

  return (
    <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4">
        <div className="flex items-center space-x-2">
          <h1 className="text-4xl font-bold">{currentQueueName}</h1>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <EllipsisVertical className="h-5 w-5" />
                <span className="sr-only">User menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
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
  );
}
