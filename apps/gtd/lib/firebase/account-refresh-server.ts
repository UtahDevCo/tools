import {
  getConnectedAccountAdmin,
  updateAccountTokensAdmin,
} from "./accounts-admin";
import { markAccountNeedsReauth } from "./accounts"; // This one uses client SDK but works on server too, or use admin if needed
import { refreshAccessToken } from "../oauth-server";
import { type ConnectedAccount } from "./accounts";

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
 * Refresh an account's access token using its refresh token (Server-side)
 * Returns the updated account on success, or null on failure
 */
export async function refreshAccountTokenServer(
  userId: string,
  account: ConnectedAccount
): Promise<ConnectedAccount | null> {
  try {
    console.log(`[AccountRefreshServer] Refreshing token for ${account.email}`);

    // Use shared server utility to refresh token
    const credentials = await refreshAccessToken(account.refreshToken);

    // Update Firestore with new tokens using Admin SDK
    await updateAccountTokensAdmin(userId, account.email, {
      accessToken: credentials.accessToken,
      refreshToken: credentials.refreshToken || account.refreshToken,
      accessTokenExpiresAt: credentials.expiresAt,
    });

    console.log(
      `[AccountRefreshServer] Successfully refreshed token for ${account.email}`
    );

    // Fetch and return the updated account using Admin SDK
    return await getConnectedAccountAdmin(userId, account.email);
  } catch (error) {
    console.error(
      `[AccountRefreshServer] Error refreshing token for ${account.email}:`,
      error
    );

    // Check if the token is invalid/revoked
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isRevoked =
      errorMessage.includes("invalid_grant") ||
      errorMessage.includes("Token has been revoked");

    if (isRevoked) {
      // Mark as needing reauth
      await markAccountNeedsReauth(userId, account.email);
    }

    return null;
  }
}

/**
 * Get a valid access token for an account, refreshing if necessary (Server-side)
 */
export async function getValidAccessTokenServer(
  userId: string,
  account: ConnectedAccount
): Promise<string | null> {
  // Check if token needs refresh
  if (!isAccountTokenExpired(account)) {
    return account.accessToken;
  }

  // Token is expired, attempt refresh
  const refreshedAccount = await refreshAccountTokenServer(userId, account);
  if (!refreshedAccount) {
    return null;
  }

  return refreshedAccount.accessToken;
}
