"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useAuth } from "@/components/auth-provider";
import { useOffline } from "./offline-provider";
import {
  getUserSettings,
  updateUserSettings,
  subscribeToSettings,
  initializeUserSettings,
  DEFAULT_SETTINGS,
  type UserSettings,
} from "@/lib/firebase/settings";

type SettingsContextValue = {
  settings: UserSettings;
  isLoading: boolean;
  updateSetting: <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) => Promise<void>;
  refreshSettings: () => Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

type SettingsProviderProps = {
  children: ReactNode;
};

export function SettingsProvider({ children }: SettingsProviderProps) {
  const { user, isAuthenticated } = useAuth();
  const { isOffline } = useOffline();
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial settings and subscribe to changes
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setSettings(DEFAULT_SETTINGS);
      setIsLoading(false);
      return;
    }

    let unsubscribe: (() => void) | null = null;

    async function init() {
      if (!user) return; // Type guard
      
      try {
        // Initialize settings document if it doesn't exist
        await initializeUserSettings(user.uid);

        // Load initial settings
        const initialSettings = await getUserSettings(user.uid);
        setSettings(initialSettings);

        // Subscribe to real-time updates
        if (!isOffline) {
          unsubscribe = subscribeToSettings(user.uid, (updatedSettings) => {
            setSettings(updatedSettings);
          });
        }
      } catch (error) {
        console.error("Failed to initialize settings:", error);
        setSettings(DEFAULT_SETTINGS);
      } finally {
        setIsLoading(false);
      }
    }

    init();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [isAuthenticated, user, isOffline]);

  // Update a specific setting
  const updateSetting = useCallback(
    async <K extends keyof UserSettings>(
      key: K,
      value: UserSettings[K]
    ): Promise<void> => {
      if (!isAuthenticated || !user) {
        throw new Error("User must be authenticated to update settings");
      }

      if (isOffline) {
        throw new Error("Cannot update settings while offline");
      }

      try {
        // Optimistically update local state
        setSettings((prev) => ({ ...prev, [key]: value }));

        // Persist to Firestore
        await updateUserSettings(user.uid, { [key]: value });
      } catch (error) {
        console.error("Failed to update setting:", error);

        // Rollback on error
        const currentSettings = await getUserSettings(user.uid);
        setSettings(currentSettings);

        throw error;
      }
    },
    [isAuthenticated, user, isOffline]
  );

  // Manually refresh settings from Firestore
  const refreshSettings = useCallback(async () => {
    if (!isAuthenticated || !user) {
      return;
    }

    try {
      const freshSettings = await getUserSettings(user.uid);
      setSettings(freshSettings);
    } catch (error) {
      console.error("Failed to refresh settings:", error);
    }
  }, [isAuthenticated, user]);

  const value: SettingsContextValue = {
    settings,
    isLoading,
    updateSetting,
    refreshSettings,
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
