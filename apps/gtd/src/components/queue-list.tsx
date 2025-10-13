import { QueueColumn } from './queue-column';

// Mock data for initial development
export const mockQueues = [
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

type Queue = {
  id: string;
  name: string;
  color: string;
};

type QueueListProps = {
  currentQueueIndex: number;
  queues: Queue[];
};

export function QueueList({ currentQueueIndex, queues }: QueueListProps) {
  const currentQueue = queues[currentQueueIndex];

  if (!currentQueue) {
    return null;
  }

  return (
    <div className="flex h-full w-full justify-center">
      <div className="w-full">
        <QueueColumn queue={currentQueue} />
      </div>
    </div>
  );
}
