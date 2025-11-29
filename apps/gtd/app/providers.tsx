"use client";

import { type ReactNode } from "react";
import { AuthProvider } from "@/components/auth-provider";
import { TasksProvider } from "@/providers/tasks-provider";
import { TooltipProvider } from "@repo/components";

type ProvidersProps = {
  children: ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  return (
    <AuthProvider>
      <TasksProvider>
        <TooltipProvider>{children}</TooltipProvider>
      </TasksProvider>
    </AuthProvider>
  );
}
