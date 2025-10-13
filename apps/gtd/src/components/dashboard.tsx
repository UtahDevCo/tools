import { useState } from 'react';
import { Header } from './header';
import { QueueList, mockQueues } from './queue-list';
import { toast } from 'sonner';

export function Dashboard() {
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0);
  const [queues, setQueues] = useState(mockQueues);

  const handlePreviousQueue = () => {
    setCurrentQueueIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNextQueue = () => {
    setCurrentQueueIndex((prev) => Math.min(queues.length - 1, prev + 1));
  };

  const handleQueueNameChange = (name: string) => {
    setQueues((prev) => {
      const updated = [...prev];
      updated[currentQueueIndex] = {
        ...updated[currentQueueIndex],
        name,
      };
      return updated;
    });
    toast.success('Queue name updated');
    console.log('Queue name updated to:', name);
  };

  const handleAddQueue = () => {
    const newQueue = {
      id: String(queues.length + 1),
      name: `New Queue ${queues.length + 1}`,
      color: '#3b82f6',
    };
    setQueues((prev) => [...prev, newQueue]);
    setCurrentQueueIndex(queues.length);
    toast.success('New queue created');
    console.log('New queue created:', newQueue);
  };

  const handleDeleteQueue = () => {
    if (queues.length <= 1) {
      toast.error('Cannot delete the last queue');
      return;
    }

    const deletedQueueName = queues[currentQueueIndex]?.name;
    setQueues((prev) => prev.filter((_, index) => index !== currentQueueIndex));
    setCurrentQueueIndex((prev) => Math.max(0, prev - 1));
    toast.success(`"${deletedQueueName}" deleted`);
    console.log('Queue deleted:', deletedQueueName);
  };

  return (
    <div className="flex min-h-screen flex-col pt-4">
      <Header
        currentQueueIndex={currentQueueIndex}
        totalQueues={queues.length}
        onPreviousQueue={handlePreviousQueue}
        onNextQueue={handleNextQueue}
        currentQueueName={queues[currentQueueIndex]?.name}
        onQueueNameChange={handleQueueNameChange}
        onAddQueue={handleAddQueue}
        onDeleteQueue={handleDeleteQueue}
      />
      <main className="flex-1 overflow-hidden pt-10">
        <QueueList currentQueueIndex={currentQueueIndex} queues={queues} />
      </main>
    </div>
  );
}
