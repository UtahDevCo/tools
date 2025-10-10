import { Header } from './header';
import { QueueList } from './queue-list';

export function Dashboard() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 overflow-hidden">
        <QueueList />
      </main>
    </div>
  );
}
