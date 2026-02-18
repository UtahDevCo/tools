import { OAuth2Client } from "google-auth-library";
import { getServerEnv } from "./env";

/**
 * Refreshes a Google OAuth access token using a refresh token.
 * This function should only be called on the server as it uses google-auth-library
 * and server-side environment variables.
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number;
}> {
  const env = getServerEnv();
  const oauth2Client = new OAuth2Client(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  const { credentials } = await oauth2Client.refreshAccessToken();

  if (!credentials.access_token) {
    throw new Error("Failed to refresh access token");
  }

  return {
    accessToken: credentials.access_token,
    refreshToken: credentials.refresh_token || null,
    expiresAt: credentials.expiry_date || Date.now() + 3600 * 1000,
  };
}
