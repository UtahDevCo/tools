import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirebaseFirestore } from "./config";
import { z } from "zod";

// Account token schema stored in Firestore
export const ConnectedAccountSchema = z.object({
  email: z.string().email(),
  displayName: z.string().nullable(),
  photoURL: z.string().nullable(),
  // OAuth tokens - refresh token is used for silent refresh
  accessToken: z.string(),
  refreshToken: z.string(),
  accessTokenExpiresAt: z.number(), // Unix timestamp in ms
  // Scopes granted
  scopes: z.array(z.string()),
  // Auto-assigned color index (0, 1, 2) for calendar display
  colorIndex: z.number().min(0).max(2),
  // Metadata
  connectedAt: z.number(), // Unix timestamp when account was connected
  lastRefreshedAt: z.number(), // Unix timestamp of last token refresh
  // Flag for accounts needing re-authentication
  needsReauth: z.boolean().default(false),
});

export type ConnectedAccount = z.infer<typeof ConnectedAccountSchema>;

// Account colors for calendar event display (auto-assigned)
export const ACCOUNT_COLORS = [
  { name: "Blue", bg: "bg-blue-500", text: "text-blue-500", hex: "#3b82f6" },
  { name: "Green", bg: "bg-green-500", text: "text-green-500", hex: "#22c55e" },
  { name: "Purple", bg: "bg-purple-500", text: "text-purple-500", hex: "#a855f7" },
] as const;

export const MAX_CONNECTED_ACCOUNTS = 3;

/**
 * Get all connected accounts for a user
 */
export async function getConnectedAccounts(
  userId: string
): Promise<ConnectedAccount[]> {
  try {
    const db = getFirebaseFirestore();
    const accountsRef = collection(db, "users", userId, "accounts");
    const snapshot = await getDocs(accountsRef);

    const accounts: ConnectedAccount[] = [];
    for (const docSnap of snapshot.docs) {
      const parseResult = ConnectedAccountSchema.safeParse(docSnap.data());
      if (parseResult.success) {
        accounts.push(parseResult.data);
      }
    }

    // Sort by colorIndex to maintain consistent ordering
    return accounts.sort((a, b) => a.colorIndex - b.colorIndex);
  } catch {
    return [];
  }
}

/**
 * Get a specific connected account by email
 */
export async function getConnectedAccount(
  userId: string,
  email: string
): Promise<ConnectedAccount | null> {
  try {
    const db = getFirebaseFirestore();
    const docRef = doc(db, "users", userId, "accounts", email);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    const parseResult = ConnectedAccountSchema.safeParse(docSnap.data());
    return parseResult.success ? parseResult.data : null;
  } catch {
    return null;
  }
}

/**
 * Save or update a connected account
 */
export async function saveConnectedAccount(
  userId: string,
  account: ConnectedAccount
): Promise<void> {
  const db = getFirebaseFirestore();
  const docRef = doc(db, "users", userId, "accounts", account.email);
  await setDoc(docRef, account);
}

/**
 * Update tokens for an existing account (used after silent refresh)
 */
export async function updateAccountTokens(
  userId: string,
  email: string,
  tokens: {
    accessToken: string;
    refreshToken?: string; // Only update if Google returns a new one
    accessTokenExpiresAt: number;
  }
): Promise<void> {
  const db = getFirebaseFirestore();
  const docRef = doc(db, "users", userId, "accounts", email);

  const updateData: Record<string, unknown> = {
    accessToken: tokens.accessToken,
    accessTokenExpiresAt: tokens.accessTokenExpiresAt,
    lastRefreshedAt: Date.now(),
    needsReauth: false, // Clear reauth flag on successful refresh
  };

  // Only update refresh token if a new one was provided
  if (tokens.refreshToken) {
    updateData.refreshToken = tokens.refreshToken;
  }

  await setDoc(docRef, updateData, { merge: true });
}

/**
 * Mark an account as needing re-authentication
 */
export async function markAccountNeedsReauth(
  userId: string,
  email: string
): Promise<void> {
  const db = getFirebaseFirestore();
  const docRef = doc(db, "users", userId, "accounts", email);
  await setDoc(docRef, { needsReauth: true }, { merge: true });
}

/**
 * Delete a connected account
 */
export async function deleteConnectedAccount(
  userId: string,
  email: string
): Promise<void> {
  const db = getFirebaseFirestore();
  const docRef = doc(db, "users", userId, "accounts", email);
  await deleteDoc(docRef);
}

/**
 * Get the next available color index for a new account
 */
export async function getNextColorIndex(userId: string): Promise<number> {
  const accounts = await getConnectedAccounts(userId);
  const usedIndices = new Set(accounts.map((a) => a.colorIndex));

  for (let i = 0; i < MAX_CONNECTED_ACCOUNTS; i++) {
    if (!usedIndices.has(i)) {
      return i;
    }
  }

  return 0; // Fallback to first color if all are used
}

/**
 * Check if user can add more accounts
 */
export async function canAddMoreAccounts(userId: string): Promise<boolean> {
  const accounts = await getConnectedAccounts(userId);
  return accounts.length < MAX_CONNECTED_ACCOUNTS;
}

/**
 * Subscribe to real-time updates of connected accounts
 */
export function subscribeToConnectedAccounts(
  userId: string,
  callback: (accounts: ConnectedAccount[]) => void
): Unsubscribe {
  const db = getFirebaseFirestore();
  const accountsRef = collection(db, "users", userId, "accounts");

  return onSnapshot(
    accountsRef,
    (snapshot) => {
      const accounts: ConnectedAccount[] = [];
      for (const docSnap of snapshot.docs) {
        const parseResult = ConnectedAccountSchema.safeParse(docSnap.data());
        if (parseResult.success) {
          accounts.push(parseResult.data);
        }
      }

      // Sort by colorIndex for consistent ordering
      callback(accounts.sort((a, b) => a.colorIndex - b.colorIndex));
    },
    () => {
      callback([]);
    }
  );
}

/**
 * Get accounts that need re-authentication
 */
export async function getAccountsNeedingReauth(
  userId: string
): Promise<ConnectedAccount[]> {
  const accounts = await getConnectedAccounts(userId);
  return accounts.filter((a) => a.needsReauth);
}
