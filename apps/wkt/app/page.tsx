"use client";

import { Search } from "lucide-react";
import { Header } from "./components/header";
import { StartWorkoutButton } from "./components/start-workout-button";
import { RoutineCard } from "./components/routine-card";
import { QuickTools } from "./components/quick-tools";

export default function WorkoutHome() {

  const routines = [
    { id: 1, name: "Leg Day B", lastDone: "2 days ago", exercises: 5 },
    { id: 2, name: "Upper Power", lastDone: "4 days ago", exercises: 6 },
    { id: 3, name: "Full Body A", lastDone: "1 week ago", exercises: 8 },
  ];

  return (
    <div className="min-h-screen bg-app-surface text-foreground pb-20">
      <Header />

      {/* Main Content */}
      <main className="flex flex-col gap-8 max-w-2xl mx-auto px-6 pb-6">
        {/* Primary Action Zone */}
        <StartWorkoutButton />
        <RoutineCard name="Leg Day B" variant="repeat-last" />

        <QuickTools />

        {/* Routines Section */}
        <section>
          <div className="flex items-center justify-end mb-4 px-1">
            <button className="flex items-center gap-2 hover:text-brand-hover text-sm font-bold transition-colors">
              <Search className="w-4 h-4" strokeWidth={2.5} />
              <span>Discover</span>
            </button>
          </div>

          <div className="space-y-3 pb-4">
            {routines.map((routine) => (
              <RoutineCard
                key={routine.id}
                name={routine.name}
                lastDone={routine.lastDone}
                exercises={routine.exercises}
                variant="saved"
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
