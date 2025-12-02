import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerEnv } from "@/lib/env";
import { PendingTokensSchema } from "@/lib/oauth-utils";

export async function GET(request: NextRequest) {
  const env = getServerEnv();
  const baseUrl = env.APP_URL;

  const searchParams = request.nextUrl.searchParams;
  const encodedTokenData = searchParams.get("tokens");

  if (!encodedTokenData) {
    return NextResponse.redirect(`${baseUrl}/?error=no_pending_tokens`);
  }

  // Decode token data from URL parameter
  let pendingTokens: string;
  try {
    const tokenBuffer = Buffer.from(encodedTokenData, "base64");
    pendingTokens = tokenBuffer.toString("utf-8");
  } catch (err) {
    console.error("Failed to decode token data:", err);
    return NextResponse.redirect(`${baseUrl}/?error=invalid_token_format`);
  }

  const cookieStore = await cookies();

  try {
    const rawTokenData = JSON.parse(pendingTokens);
    const parseResult = PendingTokensSchema.safeParse(rawTokenData);
    
    if (!parseResult.success) {
      return NextResponse.redirect(`${baseUrl}/?error=invalid_token_data`);
    }
    
    const tokenData = parseResult.data;
    const mode = tokenData.mode;

    console.log("[Process] Token data mode:", mode);

    if (mode === "primary") {
      // For primary account, set session cookies and redirect to home
      // Store access token (HTTP-only for security)
      cookieStore.set("gtd_access_token", tokenData.accessToken, {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60, // 1 hour
      });

      // Store ID token for Firebase Auth (readable by client to sign into Firebase)
      if (tokenData.idToken) {
        cookieStore.set("gtd_id_token", tokenData.idToken, {
          httpOnly: false, // Client needs to read this for Firebase Auth
          secure: env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60, // 1 hour
        });
      }

      // Store user data (readable by client for UI - UID will be set from Firebase Auth)
      const userData = {
        email: tokenData.email,
        displayName: tokenData.displayName,
        photoURL: tokenData.photoURL,
      };
      cookieStore.set("gtd_user_data", JSON.stringify(userData), {
        httpOnly: false,
        secure: env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });

      // Store token expiry
      cookieStore.set("gtd_token_expiry", tokenData.expiresAt.toString(), {
        httpOnly: false,
        secure: env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60, // 1 hour
      });

      // Store refresh token in a secure cookie for silent refresh
      if (tokenData.refreshToken) {
        cookieStore.set("gtd_refresh_token", tokenData.refreshToken, {
          httpOnly: true,
          secure: env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24 * 30, // 30 days
        });
      }

      return NextResponse.redirect(baseUrl);
    } else {
      // For secondary account, encode tokens for the client to process
      const secondaryAccountData = {
        email: tokenData.email,
        displayName: tokenData.displayName,
        photoURL: tokenData.photoURL,
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        expiresAt: tokenData.expiresAt,
        scopes: tokenData.scopes,
      };

      // Encode for cookie storage
      const secondaryDataString = JSON.stringify(secondaryAccountData);
      const encodedSecondaryData = Buffer.from(secondaryDataString).toString("base64");

      // Store in a short-lived cookie (client will read and use it)
      // URL encode to handle special characters in base64
      cookieStore.set("pending_secondary_account", encodedSecondaryData, {
        httpOnly: false, // Client needs to read this
        secure: env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60, // 1 minute - just long enough for client to process
        path: "/",
      });

      console.log("[Process] Set secondary account cookie, redirecting to settings");

      // Redirect to settings without sensitive data in URL
      return NextResponse.redirect(`${baseUrl}/settings?newAccount=pending`);
    }
  } catch {
    return NextResponse.redirect(`${baseUrl}/?error=token_processing_failed`);
  }
}
