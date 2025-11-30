"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { useAuth } from "@/components/auth-provider";
import {
  clearLocalSettings,
  DEFAULT_SETTINGS,
  getLocalSettings,
  replaceLocalSettings,
  saveLocalSettings,
  type UserSettings,
} from "@/lib/settings-local";
import {
  getUserSettings as getFirestoreSettings,
  subscribeToSettings,
  updateUserSettings as updateFirestoreSettings,
} from "@/lib/firebase/settings";

type SyncStatus = "idle" | "syncing" | "synced" | "offline" | "error";

type SettingsContextValue = {
  settings: UserSettings;
  isLoading: boolean;
  syncStatus: SyncStatus;
  updateSetting: <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) => void;
  forceSync: () => Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

type SettingsProviderProps = {
  children: ReactNode;
};

/**
 * Local-first settings provider.
 *
 * Settings are stored locally using localforage (IndexedDB) as the primary store.
 * When Firebase Auth is available, settings sync bidirectionally with Firestore
 * using timestamp-based conflict resolution (newest wins).
 *
 * This architecture ensures settings work even when:
 * - User is offline
 * - Firebase Auth is unavailable (e.g., MCP browser automation)
 * - Firestore is unreachable
 */
export function SettingsProvider({ children }: SettingsProviderProps) {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const unsubscribeRef = useRef<(() => void) | undefined>(undefined);

  // Load local settings first, then sync with Firestore if available
  useEffect(() => {
    if (authLoading) return;

    async function initSettings() {
      // Always load local settings first (fast, works offline)
      const localSettings = await getLocalSettings();
      setSettings(localSettings);
      setIsLoading(false);

      // If no user, we're done - local-only mode
      if (!isAuthenticated || !user) {
        setSyncStatus("offline");
        return;
      }

      // Attempt to sync with Firestore
      try {
        setSyncStatus("syncing");
        const firestoreSettings = await getFirestoreSettings(user.uid);

        // Compare timestamps - use the newer version
        if (firestoreSettings.updatedAt > localSettings.updatedAt) {
          // Firestore is newer - update local
          await replaceLocalSettings(firestoreSettings);
          setSettings(firestoreSettings);
          console.log("[Settings] Synced from Firestore (remote was newer)");
        } else if (localSettings.updatedAt > firestoreSettings.updatedAt) {
          // Local is newer - update Firestore
          await updateFirestoreSettings(user.uid, localSettings);
          console.log("[Settings] Synced to Firestore (local was newer)");
        }

        setSyncStatus("synced");

        // Subscribe to real-time updates from Firestore
        unsubscribeRef.current = subscribeToSettings(user.uid, async (remoteSettings) => {
          const currentLocal = await getLocalSettings();

          // Only apply remote changes if they're actually newer
          if (remoteSettings.updatedAt > currentLocal.updatedAt) {
            await replaceLocalSettings(remoteSettings);
            setSettings(remoteSettings);
            console.log("[Settings] Applied remote update");
          }
        });
      } catch (error) {
        console.warn("[Settings] Firestore sync failed, using local only:", error);
        setSyncStatus("offline");
        // Continue with local settings - this is expected in MCP browser
      }
    }

    initSettings();

    return () => {
      unsubscribeRef.current?.();
    };
  }, [user, isAuthenticated, authLoading]);

  // Clear settings on logout
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      // User logged out - clear local settings
      clearLocalSettings();
      setSettings(DEFAULT_SETTINGS);
    }
  }, [isAuthenticated, authLoading]);

  // Update a single setting (local-first)
  const updateSetting = useCallback(
    <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
      // Optimistically update state
      setSettings((prev) => ({ ...prev, [key]: value, updatedAt: Date.now() }));

      // Save to local storage (always works)
      saveLocalSettings({ [key]: value })
        .then((savedSettings) => {
          setSettings(savedSettings);

          // Attempt Firestore sync if user is authenticated
          if (user) {
            setSyncStatus("syncing");
            updateFirestoreSettings(user.uid, savedSettings)
              .then(() => {
                setSyncStatus("synced");
              })
              .catch((error) => {
                console.warn("[Settings] Firestore update failed:", error);
                setSyncStatus("offline");
                // Local update already succeeded - no rollback needed
              });
          }
        })
        .catch((error) => {
          console.error("[Settings] Local save failed:", error);
          setSyncStatus("error");
        });
    },
    [user]
  );

  // Force a sync with Firestore
  const forceSync = useCallback(async () => {
    if (!user) {
      console.warn("[Settings] Cannot force sync - no user");
      return;
    }

    setSyncStatus("syncing");

    try {
      const localSettings = await getLocalSettings();
      const firestoreSettings = await getFirestoreSettings(user.uid);

      if (firestoreSettings.updatedAt > localSettings.updatedAt) {
        await replaceLocalSettings(firestoreSettings);
        setSettings(firestoreSettings);
      } else {
        await updateFirestoreSettings(user.uid, localSettings);
      }

      setSyncStatus("synced");
    } catch (error) {
      console.error("[Settings] Force sync failed:", error);
      setSyncStatus("error");
    }
  }, [user]);

  const value: SettingsContextValue = {
    settings,
    isLoading,
    syncStatus,
    updateSetting,
    forceSync,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);

  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }

  return context;
}
