import localforage from "localforage";
import { z } from "zod";

// Per-account calendar selection schema
export const AccountCalendarSelectionSchema = z.object({
  accountEmail: z.string().email(),
  calendarIds: z.array(z.string()),
});

export type AccountCalendarSelection = z.infer<typeof AccountCalendarSelectionSchema>;

// User settings schema with validation
export const UserSettingsSchema = z.object({
  // Calendar settings
  showCalendarEvents: z.boolean().default(true),
  calendarRefreshIntervalMinutes: z.number().min(1).max(60).default(5),
  selectedCalendarIds: z.array(z.string()).default([]), // Empty = primary only (legacy, for primary account)
  
  // Per-account calendar selections (new multi-account support)
  accountCalendarSelections: z.array(AccountCalendarSelectionSchema).default([]),

  // Task settings
  defaultGtdList: z
    .enum(["active", "next", "waiting", "someday"])
    .default("next"),
  showCompletedDuration: z.number().min(1).max(90).default(30), // days

  // Display settings
  weekdayRows: z.number().min(5).max(30).default(12),
  weekendRows: z.number().min(5).max(30).default(20),
  sectionMinRows: z.number().min(1).max(10).default(3),
  listMinRows: z.number().min(1).max(10).default(2),
  mergeWeekendColumns: z.boolean().default(true),
  compactMode: z.boolean().default(false),

  // Behavior settings
  skipMoveConfirmations: z.boolean().default(false),
  undoWindowMs: z.number().min(1000).max(30000).default(5000),
  enableMultiSelectShortcuts: z.boolean().default(true),

  // Offline settings
  cacheSizeLimitMb: z.number().min(10).max(500).default(50),

  // Metadata - used for sync conflict resolution
  updatedAt: z.number().default(() => Date.now()),
});

export type UserSettings = z.infer<typeof UserSettingsSchema>;

// Default settings
export const DEFAULT_SETTINGS: UserSettings = UserSettingsSchema.parse({});

const SETTINGS_STORE_NAME = "gtd-settings";
const SETTINGS_KEY = "user-settings";

let settingsStore: LocalForage | null = null;

function getSettingsStore(): LocalForage {
  if (!settingsStore) {
    settingsStore = localforage.createInstance({
      name: SETTINGS_STORE_NAME,
      storeName: "settings",
    });
  }
  return settingsStore;
}

/**
 * Get settings from local storage.
 * Returns DEFAULT_SETTINGS if no local settings exist.
 */
export async function getLocalSettings(): Promise<UserSettings> {
  try {
    const store = getSettingsStore();
    const data = await store.getItem<UserSettings>(SETTINGS_KEY);

    if (data) {
      return UserSettingsSchema.parse(data);
    }

    return DEFAULT_SETTINGS;
  } catch (error) {
    console.error("Failed to get local settings:", error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Save settings to local storage.
 * Automatically updates the `updatedAt` timestamp.
 */
export async function saveLocalSettings(
  settings: Partial<UserSettings>
): Promise<UserSettings> {
  try {
    const store = getSettingsStore();
    const current = await getLocalSettings();

    const updated: UserSettings = {
      ...current,
      ...settings,
      updatedAt: Date.now(),
    };

    await store.setItem(SETTINGS_KEY, updated);
    return updated;
  } catch (error) {
    console.error("Failed to save local settings:", error);
    throw error;
  }
}

/**
 * Replace all local settings (used when syncing from Firestore).
 */
export async function replaceLocalSettings(
  settings: UserSettings
): Promise<void> {
  try {
    const store = getSettingsStore();
    await store.setItem(SETTINGS_KEY, settings);
  } catch (error) {
    console.error("Failed to replace local settings:", error);
    throw error;
  }
}

/**
 * Clear local settings (used on logout).
 */
export async function clearLocalSettings(): Promise<void> {
  try {
    const store = getSettingsStore();
    await store.removeItem(SETTINGS_KEY);
  } catch (error) {
    console.error("Failed to clear local settings:", error);
  }
}
