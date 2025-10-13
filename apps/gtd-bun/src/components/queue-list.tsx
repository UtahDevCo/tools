import { useState } from 'react';
import { QueueColumn } from './queue-column';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

// Mock data for initial development
const mockQueues = [
  {
    id: '1',
    name: 'Work',
    color: '#3b82f6',
  },
  {
    id: '2',
    name: 'Personal',
    color: '#10b981',
  },
  {
    id: '3',
    name: 'Projects',
    color: '#f59e0b',
  },
];

export function QueueList() {
  const [queues] = useState(mockQueues);

  return (
    <div className="flex overflow-x-auto gap-4">
      {queues.map((queue) => (
        <QueueColumn key={queue.id} queue={queue} />
      ))}
      {/* <div className="flex w-[280px] flex-shrink-0 items-start justify-center border-r p-4">
        <Button variant="outline" className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          Add Queue
        </Button>
      </div> */}
    </div>
  );
}
