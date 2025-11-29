"use client";

import {
  createContext,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";

type OfflineContextValue = {
  isOnline: boolean;
  isOffline: boolean;
};

const OfflineContext = createContext<OfflineContextValue>({
  isOnline: true,
  isOffline: false,
});

type OfflineProviderProps = {
  children: ReactNode;
};

// Subscribe to online/offline events
function subscribeToOnlineStatus(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

// Get current online status
function getOnlineStatus() {
  return navigator.onLine;
}

// Server snapshot (always online during SSR)
function getServerOnlineStatus() {
  return true;
}

export function OfflineProvider({ children }: OfflineProviderProps) {
  const isOnline = useSyncExternalStore(
    subscribeToOnlineStatus,
    getOnlineStatus,
    getServerOnlineStatus
  );

  const value: OfflineContextValue = {
    isOnline,
    isOffline: !isOnline,
  };

  return (
    <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>
  );
}

export function useOffline(): OfflineContextValue {
  return useContext(OfflineContext);
}
