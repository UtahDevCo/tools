import { useState } from 'react';
import { Header } from './header';
import { QueueList, mockQueues } from './queue-list';

export function Dashboard() {
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0);

  const handlePreviousQueue = () => {
    setCurrentQueueIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNextQueue = () => {
    setCurrentQueueIndex((prev) => Math.min(mockQueues.length - 1, prev + 1));
  };

  return (
    <div className="flex min-h-screen flex-col pt-4">
      <Header
        currentQueueIndex={currentQueueIndex}
        totalQueues={mockQueues.length}
        onPreviousQueue={handlePreviousQueue}
        onNextQueue={handleNextQueue}
        currentQueueName={mockQueues[currentQueueIndex]?.name}
      />
      <main className="flex-1 overflow-hidden pt-10">
        <QueueList currentQueueIndex={currentQueueIndex} />
      </main>
    </div>
  );
}
