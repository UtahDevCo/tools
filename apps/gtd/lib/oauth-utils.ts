import { NextRequest } from "next/server";
import { z } from "zod";
import { getServerEnv } from "./env";

/**
 * Dynamically determine the base URL from the request
 */
export function getBaseUrl(request: NextRequest): string {
  const host = request.headers.get("host") || "localhost:3300";
  const protocol = host.includes("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

/**
 * Get the OAuth redirect URI using the APP_URL environment variable
 * This ensures the redirect URI matches what's registered in Google Cloud Console
 */
export function getRedirectUri(request?: NextRequest): string {
  try {
    const env = getServerEnv();
    // Use APP_URL from environment, which should match the registered redirect URI
    return `${env.APP_URL}/api/auth/google/callback`;
  } catch {
    // Fallback to dynamic construction if env is not available
    if (request) {
      return `${getBaseUrl(request)}/api/auth/google/callback`;
    }
    return "http://localhost:3300/api/auth/google/callback";
  }
}

/**
 * OAuth scopes for Google Tasks and Calendar
 */
export const OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/tasks",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
] as const;

/**
 * Schema for OAuth state parameter
 */
export const OAuthStateSchema = z.object({
  mode: z.enum(["primary", "secondary"]).default("primary"),
  nonce: z.string().uuid(),
  email: z.string().email().optional(), // For secondary account re-auth
});

export type OAuthState = z.infer<typeof OAuthStateSchema>;

/**
 * Schema for token refresh request body
 */
export const RefreshTokenBodySchema = z.object({
  refreshToken: z.string().min(1).optional(),
  email: z.string().email().optional(),
});

export type RefreshTokenBody = z.infer<typeof RefreshTokenBodySchema>;

/**
 * Schema for pending OAuth tokens stored in cookie
 */
export const PendingTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string().nullable(),
  idToken: z.string().nullable(),
  expiresAt: z.number(),
  email: z.string().email(),
  displayName: z.string().nullable(),
  photoURL: z.string().nullable(),
  scopes: z.array(z.string()),
  mode: z.enum(["primary", "secondary"]),
});

export type PendingTokens = z.infer<typeof PendingTokensSchema>;

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  return z.string().email().safeParse(email).success;
}
