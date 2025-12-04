'use client';

import { Mic, Play, Clock, Timer, Search, Home, History, BarChart3, Settings } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import { Typography } from '@repo/components';

export default function WorkoutHome() {
  const [activeTab, setActiveTab] = useState('home');

  const routines = [
    { id: 1, name: 'Leg Day B', lastDone: '2 days ago', exercises: 5 },
    { id: 2, name: 'Upper Power', lastDone: '4 days ago', exercises: 6 },
    { id: 3, name: 'Full Body A', lastDone: '1 week ago', exercises: 8 },
  ];

  return (
    <div className="min-h-screen bg-app-surface text-foreground pb-20">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-app-surface/95 backdrop-blur-sm border-b-2 border-app-border">
        <div className="max-w-2xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <Typography variant="title">WKT</Typography>
            <Typography variant="light" color="muted" className="mt-0.5 uppercase tracking-wider">
              Workout Tracker
            </Typography>
          </div>
          <button 
            className="w-14 h-14 rounded-full bg-mic-button flex items-center justify-center hover:bg-mic-button-hover transition-all active:scale-95 shadow-lg shadow-brand-shadow"
            aria-label="Voice command"
          >
            <Mic className="w-6 h-6 text-mic-button-foreground" strokeWidth={2.5} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-6 pt-28 pb-6">
        {/* Primary Action Zone */}
        <section className="mb-8">
          <div className="relative">
            {/* Main CTA */}
            <button className="w-full bg-brand hover:bg-brand-hover transition-all rounded-2xl p-8 mb-4 active:scale-[0.98] shadow-2xl shadow-brand-shadow-strong border-2 border-brand-border group">
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <Typography variant="title" className="text-black">Start Empty Workout</Typography>
                  <Typography variant="light" className="text-black/70">Quick ad-hoc session</Typography>
                </div>
                <div className="w-16 h-16 rounded-full bg-black/10 flex items-center justify-center group-hover:bg-black/20 transition-colors">
                  <Play className="w-8 h-8 text-black ml-1" strokeWidth={2.5} fill="black" />
                </div>
              </div>
            </button>

            {/* Secondary Action */}
            <button className="w-full bg-app-surface-raised hover:bg-app-surface-hover transition-all rounded-2xl p-6 border-2 border-app-border-subtle active:scale-[0.98] group">
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <Typography variant="light" color="muted" className="uppercase tracking-wider">Repeat Last</Typography>
                  <Typography variant="strong">Leg Day B</Typography>
                </div>
                <div className="text-brand text-sm font-bold group-hover:translate-x-1 transition-transform">→</div>
              </div>
            </button>
          </div>
        </section>

        {/* Utility Belt */}
        <section className="mb-10">
          <Typography variant="light" color="muted" className="font-bold uppercase tracking-widest mb-4 px-1">
            Quick Tools
          </Typography>
          <div className="grid grid-cols-2 gap-4">
            <button className="aspect-square bg-app-surface-raised hover:bg-app-surface-hover rounded-2xl border-2 border-app-border-subtle flex flex-col items-center justify-center gap-3 active:scale-95 transition-all group">
              <div className="w-16 h-16 rounded-full bg-brand-subtle flex items-center justify-center group-hover:bg-brand-subtle-hover transition-colors">
                <Clock className="w-8 h-8 text-brand" strokeWidth={2.5} />
              </div>
              <Typography variant="strong">Stopwatch</Typography>
            </button>
            <button className="aspect-square bg-app-surface-raised hover:bg-app-surface-hover rounded-2xl border-2 border-app-border-subtle flex flex-col items-center justify-center gap-3 active:scale-95 transition-all group">
              <div className="w-16 h-16 rounded-full bg-brand-subtle flex items-center justify-center group-hover:bg-brand-subtle-hover transition-colors">
                <Timer className="w-8 h-8 text-brand" strokeWidth={2.5} />
              </div>
              <Typography variant="strong">Rest Timer</Typography>
            </button>
          </div>
        </section>

        {/* Routines Section */}
        <section>
          <div className="flex items-center justify-between mb-4 px-1">
            <Typography variant="light" color="muted" className="font-bold uppercase tracking-widest">
              Saved Routines
            </Typography>
            <button className="flex items-center gap-2 text-brand hover:text-brand-hover text-sm font-bold transition-colors">
              <Search className="w-4 h-4" strokeWidth={2.5} />
              <span>Discover</span>
            </button>
          </div>
          
          <div className="space-y-3">
            {routines.map((routine) => (
              <button
                key={routine.id}
                className="w-full bg-app-surface-raised hover:bg-app-surface-hover rounded-2xl p-5 border-2 border-app-border-subtle transition-all active:scale-[0.98] group text-left"
              >
                <div className="flex items-center justify-between mb-2">
                  <Typography variant="strong">{routine.name}</Typography>
                  <div className="text-brand text-xl group-hover:translate-x-1 transition-transform">→</div>
                </div>
                <div className="flex items-center gap-4">
                  <Typography variant="light" color="muted" className="uppercase tracking-wider">
                    {routine.lastDone}
                  </Typography>
                  <span className="text-muted-foreground">•</span>
                  <Typography variant="light" color="muted" className="uppercase tracking-wider">
                    {routine.exercises} Exercises
                  </Typography>
                </div>
              </button>
            ))}
          </div>
        </section>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-app-surface/95 backdrop-blur-sm border-t-2 border-app-border">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => setActiveTab('home')}
              className={`flex flex-col items-center gap-1.5 py-2 rounded-xl transition-all ${
                activeTab === 'home'
                  ? 'text-brand'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Home className="w-6 h-6" strokeWidth={2.5} />
              <Typography variant="light" className="font-bold uppercase tracking-wider">
                Home
              </Typography>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex flex-col items-center gap-1.5 py-2 rounded-xl transition-all ${
                activeTab === 'history'
                  ? 'text-brand'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <History className="w-6 h-6" strokeWidth={2.5} />
              <Typography variant="light" className="font-bold uppercase tracking-wider">
                History
              </Typography>
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`flex flex-col items-center gap-1.5 py-2 rounded-xl transition-all ${
                activeTab === 'stats'
                  ? 'text-brand'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <BarChart3 className="w-6 h-6" strokeWidth={2.5} />
              <Typography variant="light" className="font-bold uppercase tracking-wider">
                Stats
              </Typography>
            </button>
            <Link
              href="/settings"
              className={`flex flex-col items-center gap-1.5 py-2 rounded-xl transition-all ${
                activeTab === 'settings'
                  ? 'text-brand'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Settings className="w-6 h-6" strokeWidth={2.5} />
              <Typography variant="light" className="font-bold uppercase tracking-wider">
                Settings
              </Typography>
            </Link>
          </div>
        </div>
      </nav>
    </div>
  );
}
