import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirebaseFirestore } from "./config";
import { z } from "zod";

// User settings schema with validation
export const UserSettingsSchema = z.object({
  // Calendar settings
  showCalendarEvents: z.boolean().default(true),
  calendarRefreshIntervalMinutes: z.number().min(1).max(60).default(5),
  selectedCalendarIds: z.array(z.string()).default([]), // Empty = primary only

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

  // Metadata
  updatedAt: z.number().default(() => Date.now()),
});

export type UserSettings = z.infer<typeof UserSettingsSchema>;

// Default settings
export const DEFAULT_SETTINGS: UserSettings = UserSettingsSchema.parse({});

/**
 * Get user settings from Firestore
 */
export async function getUserSettings(userId: string): Promise<UserSettings> {
  try {
    const db = getFirebaseFirestore();
    const docRef = doc(db, "users", userId, "settings", "preferences");
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return UserSettingsSchema.parse(data);
    }

    // Return defaults if document doesn't exist
    return DEFAULT_SETTINGS;
  } catch (error) {
    console.error("Failed to get user settings:", error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Update user settings in Firestore
 */
export async function updateUserSettings(
  userId: string,
  settings: Partial<UserSettings>
): Promise<void> {
  try {
    const db = getFirebaseFirestore();
    const docRef = doc(db, "users", userId, "settings", "preferences");

    // Add updated timestamp
    const settingsWithTimestamp = {
      ...settings,
      updatedAt: Date.now(),
    };

    await setDoc(docRef, settingsWithTimestamp, { merge: true });
  } catch (error) {
    console.error("Failed to update user settings:", error);
    throw error;
  }
}

/**
 * Subscribe to real-time updates of user settings
 */
export function subscribeToSettings(
  userId: string,
  callback: (settings: UserSettings) => void
): Unsubscribe {
  const db = getFirebaseFirestore();
  const docRef = doc(db, "users", userId, "settings", "preferences");

  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        try {
          const data = docSnap.data();
          const settings = UserSettingsSchema.parse(data);
          callback(settings);
        } catch (error) {
          console.error("Failed to parse settings from Firestore:", error);
          callback(DEFAULT_SETTINGS);
        }
      } else {
        // Document doesn't exist yet, use defaults
        callback(DEFAULT_SETTINGS);
      }
    },
    (error) => {
      console.error("Settings subscription error:", error);
      callback(DEFAULT_SETTINGS);
    }
  );
}

/**
 * Initialize settings document with defaults if it doesn't exist
 */
export async function initializeUserSettings(userId: string): Promise<void> {
  try {
    const db = getFirebaseFirestore();
    const docRef = doc(db, "users", userId, "settings", "preferences");
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      await setDoc(docRef, DEFAULT_SETTINGS);
    }
  } catch (error) {
    console.error("Failed to initialize user settings:", error);
  }
}
