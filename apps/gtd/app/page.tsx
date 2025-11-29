import { OfflineBanner } from "./components/offline-banner";
import { WeeklyCalendar } from "./components/weekly-calendar";

export default function Home() {
  return (
    <>
      <OfflineBanner />
      <WeeklyCalendar />
    </>
  );
}
