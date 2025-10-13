import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CategorySection } from "./category-section";
import { MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";

type Queue = {
  id: string;
  name: string;
  color: string;
};

type QueueColumnProps = {
  queue: Queue;
};

// Mock tasks for initial development
const mockTasks = {
  next_actions: [
    {
      id: "1",
      title: "Review Q4 metrics",
      completed: false,
      queueId: "1",
      category: "next_actions",
    },
    {
      id: "2",
      title: "Schedule team meeting",
      completed: false,
      queueId: "1",
      category: "next_actions",
    },
  ],
  waiting_on: [
    {
      id: "3",
      title: "Feedback from client",
      completed: false,
      queueId: "1",
      category: "waiting_on",
    },
  ],
  someday: [
    {
      id: "4",
      title: "Learn TypeScript",
      completed: false,
      queueId: "1",
      category: "someday",
    },
  ],
  archive: [],
};

export function QueueColumn({ queue }: QueueColumnProps) {
  const [tasks] = useState(mockTasks);

  return (
    <div className="flex h-full flex-1 flex-shrink-0 flex-col bg-card">
      <ScrollArea className="flex-1 px-4">
        <div className="py-4 space-y-8">
          <CategorySection
            category="next_actions"
            label="Next Actions"
            tasks={tasks.next_actions}
            queueId={queue.id}
          />
          <CategorySection
            category="waiting_on"
            label="Waiting On"
            tasks={tasks.waiting_on}
            queueId={queue.id}
          />
          <CategorySection
            category="someday"
            label="Someday"
            tasks={tasks.someday}
            queueId={queue.id}
          />
          <CategorySection
            category="archive"
            label="Archive"
            tasks={tasks.archive}
            queueId={queue.id}
          />
        </div>
      </ScrollArea>
    </div>
  );
}
