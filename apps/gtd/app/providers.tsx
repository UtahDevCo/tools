"use client";

import { type ReactNode, useEffect } from "react";
import { AuthProvider } from "@/components/auth-provider";
import { TasksProvider } from "@/providers/tasks-provider";
import { OfflineProvider } from "@/providers/offline-provider";
import { SettingsProvider } from "@/providers/settings-provider";
import { TooltipProvider, Toaster } from "@repo/components";
import { initializeMonitoring } from "@/lib/firebase/analytics";

type ProvidersProps = {
  children: ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  useEffect(() => {
    // Initialize Firebase Analytics on mount
    initializeMonitoring();
  }, []);

  return (
    <OfflineProvider>
      <AuthProvider>
        <SettingsProvider>
          <TasksProvider>
            <TooltipProvider>
              {children}
              <Toaster position="bottom-center" />
            </TooltipProvider>
          </TasksProvider>
        </SettingsProvider>
      </AuthProvider>
    </OfflineProvider>
  );
}
