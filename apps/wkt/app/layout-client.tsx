"use client";

import { BottomNav } from "./components/bottom-nav";
import { AuthProvider } from "@/components/auth-provider";

type LayoutClientProps = {
  children: React.ReactNode;
};

export function LayoutClient({ children }: LayoutClientProps) {
  return (
    <AuthProvider>
      <div className="pt-28 pb-6">
        {children}
      </div>
      <BottomNav />
    </AuthProvider>
  );
}
