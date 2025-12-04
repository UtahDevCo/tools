/**
 * Utilities for refreshing secondary account tokens
 */

import {
  getConnectedAccount,
  updateAccountTokens,
  markAccountNeedsReauth,
  type ConnectedAccount,
} from "./accounts";

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
 * Refresh an account's access token using its refresh token
 * Returns the updated account on success, or null on failure
 */
export async function refreshAccountToken(
  userId: string,
  account: ConnectedAccount
): Promise<ConnectedAccount | null> {
  try {
    console.log(`[AccountRefresh] Refreshing token for ${account.email}`);

    const response = await fetch("/api/auth/google/refresh", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refreshToken: account.refreshToken,
        email: account.email,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error(
        `[AccountRefresh] Failed to refresh token for ${account.email}:`,
        error
      );

      // If the token is invalid/revoked, mark account as needing reauth
      if (error.needsReauth) {
        await markAccountNeedsReauth(userId, account.email);
      }

      return null;
    }

    const data = await response.json();

    // Update Firestore with new tokens
    await updateAccountTokens(userId, account.email, {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken || account.refreshToken, // Use new token if provided
      accessTokenExpiresAt: data.expiresAt,
    });

    console.log(
      `[AccountRefresh] Successfully refreshed token for ${account.email}`
    );

    // Fetch and return the updated account
    return await getConnectedAccount(userId, account.email);
  } catch (error) {
    console.error(
      `[AccountRefresh] Error refreshing token for ${account.email}:`,
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
