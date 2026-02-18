"use server";

import { getUserFromCookies, getAccessToken, getRefreshToken, getTokenExpiry } from "./session";
import { saveConnectedAccountAdmin, getConnectedAccountAdmin } from "@/lib/firebase/accounts-admin";
import { type ConnectedAccount } from "@/lib/firebase/accounts";
import { refreshAccountTokenServer } from "@/lib/firebase/account-refresh-server";

/**
 * Synchronizes the primary account tokens from cookies to Firestore.
 * This allows the MCP server to access the primary account even when the user is offline.
 * Uses Admin SDK to bypass security rules on the server.
 */
export async function syncPrimaryAccountToFirestore(): Promise<{ success: boolean; message?: string }> {
  try {
    const user = await getUserFromCookies();
    if (!user || !user.uid) {
      return { success: false, message: "Not authenticated" };
    }

    const accessToken = await getAccessToken();
    const refreshToken = await getRefreshToken();
    const expiresAt = await getTokenExpiry();

    // If we don't have all tokens, we can't sync
    if (!accessToken || !refreshToken || !expiresAt) {
      return { success: false, message: "Missing tokens in cookies" };
    }

    // Check if account already exists to preserve some fields
    const existingAccount = await getConnectedAccountAdmin(user.uid, user.email!);

    const account: ConnectedAccount = {
      email: user.email!,
      displayName: user.displayName,
      photoURL: user.photoURL,
      accessToken,
      refreshToken,
      accessTokenExpiresAt: expiresAt,
      scopes: [], // We don't have the exact list here, but it's the primary account
      colorIndex: existingAccount?.colorIndex ?? 0,
      connectedAt: existingAccount?.connectedAt ?? Date.now(),
      lastRefreshedAt: Date.now(),
      needsReauth: false,
    };

    await saveConnectedAccountAdmin(user.uid, account);
    console.log(`[AccountSync] Synced primary account ${user.email} to Firestore`);

    return { success: true };
  } catch (error) {
    console.error("[AccountSync] Failed to sync primary account:", error);
    return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Refreshes a secondary account's access token from the client.
 */
export async function refreshSecondaryAccount(email: string): Promise<{ success: boolean; account?: ConnectedAccount; error?: string }> {
  try {
    const user = await getUserFromCookies();
    if (!user || !user.uid) {
      return { success: false, error: "Not authenticated" };
    }

    const account = await getConnectedAccountAdmin(user.uid, email);
    if (!account) {
      return { success: false, error: "Account not found" };
    }

    const refreshedAccount = await refreshAccountTokenServer(user.uid, account);
    if (!refreshedAccount) {
      return { success: false, error: "Failed to refresh token" };
    }

    return { success: true, account: refreshedAccount };
  } catch (error) {
    console.error("[AccountSync] Failed to refresh secondary account:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
