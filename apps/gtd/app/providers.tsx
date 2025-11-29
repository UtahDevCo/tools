"use client";

import { type ReactNode } from "react";
import { AuthProvider } from "@/components/auth-provider";
import { TooltipProvider } from "@repo/components";

type ProvidersProps = {
  children: ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  return (
    <AuthProvider>
      <TooltipProvider>{children}</TooltipProvider>
    </AuthProvider>
  );
}
