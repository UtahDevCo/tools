"use client";

import { WifiOff } from "lucide-react";
import { useOffline } from "@/providers/offline-provider";

export function OfflineBanner() {
  const { isOffline } = useOffline();

  if (!isOffline) return null;

  return (
    <div className="bg-amber-500 text-amber-950 px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2">
      <WifiOff className="h-4 w-4" />
      <span>You&apos;re offline — viewing cached data (read-only)</span>
    </div>
  );
}
