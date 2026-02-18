/**
 * Utilities for refreshing secondary account tokens (Client-safe)
 */

import {
  type ConnectedAccount,
} from "./accounts";
import { refreshSecondaryAccount } from "@/app/actions/accounts-sync";

/**
 * Check if an access token is expired or about to expire (within 5 minutes)
 */
export function isAccountTokenExpired(account: ConnectedAccount): boolean {
  const now = Date.now();
  const expiresAt = account.accessTokenExpiresAt;
  const bufferMs = 5 * 60 * 1000; // 5 minutes
  return now >= expiresAt - bufferMs;
}

/**
 * Refresh an account's access token using a server action
 * Returns the updated account on success, or null on failure
 */
export async function refreshAccountToken(
  userId: string, // Kept for API compatibility, but unused as user is determined from session on server
  account: ConnectedAccount
): Promise<ConnectedAccount | null> {
  try {
    console.log(`[AccountRefresh] Requesting refresh for ${account.email}`);

    const result = await refreshSecondaryAccount(account.email);

    if (result.success && result.account) {
      console.log(`[AccountRefresh] Successfully refreshed token for ${account.email}`);
      return result.account;
    } else {
      console.error(`[AccountRefresh] Failed to refresh token for ${account.email}:`, result.error);
      return null;
    }
  } catch (error) {
    console.error(
      `[AccountRefresh] Error requesting refresh for ${account.email}:`,
      error
    );
    return null;
  }
}

/**
 * Get a valid access token for an account, refreshing if necessary
 * Returns the access token on success, or null on failure
 */
export async function getValidAccessToken(
  userId: string,
  account: ConnectedAccount
): Promise<string | null> {
  // Check if token needs refresh
  if (!isAccountTokenExpired(account)) {
    return account.accessToken;
  }

  // Token is expired, attempt refresh
  const refreshedAccount = await refreshAccountToken(userId, account);
  if (!refreshedAccount) {
    return null;
  }

  return refreshedAccount.accessToken;
}

/**
 * Refresh all connected accounts that have expired tokens
 * Returns the number of accounts successfully refreshed
 */
export async function refreshExpiredAccounts(
  userId: string,
  accounts: ConnectedAccount[]
): Promise<number> {
  let refreshCount = 0;

  const refreshPromises = accounts.map(async (account) => {
    if (account.needsReauth) {
      return false; // Skip accounts that need reauth
    }

    if (!isAccountTokenExpired(account)) {
      return false; // Skip accounts with valid tokens
    }

    const result = await refreshAccountToken(userId, account);
    if (result) {
      refreshCount++;
      return true;
    }
    return false;
  });

  await Promise.all(refreshPromises);

  return refreshCount;
}
