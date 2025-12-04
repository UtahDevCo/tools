'use client';

import { useTheme } from 'next-themes';
import { Moon, Sun, ArrowLeft, Check } from 'lucide-react';
import Link from 'next/link';
import { Typography } from '@repo/components';

export default function SettingsPage() {
  const { resolvedTheme, setTheme } = useTheme();

  const themes = [
    { id: 'light', name: 'Light', icon: Sun },
    { id: 'dark', name: 'Dark', icon: Moon },
  ];

  return (
    <div className="min-h-screen bg-app-surface">
      {/* Header */}
      <header className="border-b-2 border-app-border bg-app-surface/95 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-6 py-5 flex items-center gap-4">
          <Link
            href="/"
            className="w-10 h-10 rounded-full bg-app-surface-raised flex items-center justify-center hover:bg-app-surface-hover transition-all border-2 border-app-border-subtle"
            aria-label="Back to home"
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
          </Link>
          <div>
            <Typography variant="title">Settings</Typography>
            <Typography variant="light" color="muted" className="mt-0.5 uppercase tracking-wider">
              Preferences
            </Typography>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-6 pt-8 pb-6">
        {/* Theme Section */}
        <section>
          <Typography variant="light" color="muted" className="font-bold uppercase tracking-widest mb-4 px-1">
            Appearance
          </Typography>
          <div className="space-y-3">
            {themes.map(({ id, name, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTheme(id)}
                className="w-full bg-app-surface-raised hover:bg-app-surface-hover rounded-2xl p-6 border-2 border-app-border-subtle transition-all active:scale-[0.98] group text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      resolvedTheme === id ? 'bg-brand' : 'bg-brand-subtle'
                    } transition-colors`}>
                      <Icon className={`w-6 h-6 ${
                        resolvedTheme === id ? 'text-black' : 'text-brand'
                      }`} strokeWidth={2.5} />
                    </div>
                    <div>
                      <Typography variant="strong">{name}</Typography>
                      <Typography variant="light" color="muted" className="uppercase tracking-wider">
                        {name} Mode
                      </Typography>
                    </div>
                  </div>
                  {resolvedTheme === id && (
                    <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center">
                      <Check className="w-5 h-5 text-black" strokeWidth={3} />
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
