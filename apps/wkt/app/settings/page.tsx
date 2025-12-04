"use client";

import { useTheme } from "next-themes";
import { Moon, Sun, Check } from "lucide-react";
import { IconButton, Typography } from "@repo/components";
import { Header } from "../components/header";

export default function SettingsPage() {
  const { resolvedTheme, setTheme } = useTheme();

  const themes = [
    { id: "light", name: "Light", icon: Sun },
    { id: "dark", name: "Dark", icon: Moon },
  ];

  return (
    <div className="min-h-screen bg-app-surface">
      <Header title="Settings" />

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-6">
        {/* Theme Section */}
        <section className="space-y-3">
          {themes.map(({ id, name, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTheme(id)}
              className="w-full bg-app-surface-raised hover:bg-app-surface-hover rounded-2xl p-6 border-2 border-app-border-subtle transition-all active:scale-[0.98] group text-left"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      resolvedTheme === id ? "bg-brand" : "bg-brand-subtle"
                    } transition-colors`}
                  >
                    <IconButton icon={<Icon />} variant="ghost" />
                  </div>

                  <Typography variant="strong">{name}</Typography>
                </div>
                {resolvedTheme === id && (
                  <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center">
                    <Check className="w-5 h-5 text-black" strokeWidth={3} />
                  </div>
                )}
              </div>
            </button>
          ))}
        </section>
      </main>
    </div>
  );
}
