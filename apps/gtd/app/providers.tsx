"use client";

import { type ReactNode } from "react";
import { AuthProvider } from "@/components/auth-provider";
import { TasksProvider } from "@/providers/tasks-provider";
import { OfflineProvider } from "@/providers/offline-provider";
import { TooltipProvider, Toaster } from "@repo/components";

type ProvidersProps = {
  children: ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  return (
    <OfflineProvider>
      <AuthProvider>
        <TasksProvider>
          <TooltipProvider>
            {children}
            <Toaster position="bottom-center" />
          </TooltipProvider>
        </TasksProvider>
      </AuthProvider>
    </OfflineProvider>
  );
}
