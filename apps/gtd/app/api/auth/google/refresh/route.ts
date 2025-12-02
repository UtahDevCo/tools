import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { OAuth2Client } from "google-auth-library";
import { getServerEnv } from "@/lib/env";
import { RefreshTokenBodySchema } from "@/lib/oauth-utils";

/**
 * Silent token refresh endpoint
 * 
 * For primary account: Uses refresh token from cookie
 * For secondary accounts: Refresh token should be passed in request body
 */
export async function POST(request: NextRequest) {
  const env = getServerEnv();

  try {
    const rawBody = await request.json().catch(() => ({}));
    
    // Validate request body
    const parseResult = RefreshTokenBodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parseResult.error.issues },
        { status: 400 }
      );
    }
    
    const { refreshToken: bodyRefreshToken, email } = parseResult.data;

    const cookieStore = await cookies();

    // Determine which refresh token to use
    let refreshToken = bodyRefreshToken;

    // If no refresh token in body, try to get from cookie (primary account)
    if (!refreshToken) {
      refreshToken = cookieStore.get("gtd_refresh_token")?.value;
    }

    if (!refreshToken) {
      return NextResponse.json(
        { error: "No refresh token available" },
        { status: 401 }
      );
    }

    const oauth2Client = new OAuth2Client(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    // Get new access token
    const { credentials } = await oauth2Client.refreshAccessToken();

    if (!credentials.access_token) {
      return NextResponse.json(
        { error: "Failed to refresh access token" },
        { status: 401 }
      );
    }

    const expiresAt = credentials.expiry_date || Date.now() + 3600 * 1000;

    // If this is the primary account (no email in body), update cookies
    if (!email) {
      cookieStore.set("gtd_access_token", credentials.access_token, {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60, // 1 hour
      });

      cookieStore.set("gtd_token_expiry", expiresAt.toString(), {
        httpOnly: false,
        secure: env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60, // 1 hour
      });

      // Update refresh token if a new one was provided
      if (credentials.refresh_token) {
        cookieStore.set("gtd_refresh_token", credentials.refresh_token, {
          httpOnly: true,
          secure: env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24 * 30, // 30 days
        });
      }
    }

    return NextResponse.json({
      accessToken: credentials.access_token,
      refreshToken: credentials.refresh_token || null, // May be null if not rotated
      expiresAt,
    });
  } catch (error) {
    // Check if this is a revoked token error
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isRevoked =
      errorMessage.includes("invalid_grant") ||
      errorMessage.includes("Token has been revoked");

    return NextResponse.json(
      {
        error: "Token refresh failed",
        needsReauth: isRevoked,
        message: errorMessage,
      },
      { status: isRevoked ? 401 : 500 }
    );
  }
}
