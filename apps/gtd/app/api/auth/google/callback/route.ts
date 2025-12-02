import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { OAuth2Client } from "google-auth-library";
import { getServerEnv } from "@/lib/env";
import {
  getRedirectUri,
  getBaseUrl,
  OAuthStateSchema,
  type PendingTokens,
} from "@/lib/oauth-utils";

export async function GET(request: NextRequest) {
  const env = getServerEnv();
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const baseUrl = getBaseUrl(request);
  const cookieStore = await cookies();

  // Helper to clean up oauth_state cookie on any exit
  const cleanupAndRedirect = (url: string) => {
    cookieStore.delete("oauth_state");
    return NextResponse.redirect(url);
  };

  // Handle errors from Google
  if (error) {
    return cleanupAndRedirect(
      `${baseUrl}/?error=oauth_error&message=${encodeURIComponent(error)}`
    );
  }

  if (!code) {
    return cleanupAndRedirect(`${baseUrl}/?error=missing_code`);
  }

  // Verify state to prevent CSRF
  // State is passed in URL, validate it has required structure
  let parsedState: { mode: "primary" | "secondary"; email?: string; nonce: string } = { 
    mode: "primary",
    nonce: ""
  };
  
  if (!state) {
    return cleanupAndRedirect(`${baseUrl}/?error=invalid_state`);
  }

  try {
    const rawState = JSON.parse(state);
    const validated = OAuthStateSchema.safeParse(rawState);
    if (!validated.success) {
      console.error("State validation failed:", validated.error);
      return cleanupAndRedirect(`${baseUrl}/?error=invalid_state`);
    }
    parsedState = validated.data;
  } catch (err) {
    console.error("Failed to parse state:", err);
    return cleanupAndRedirect(`${baseUrl}/?error=invalid_state`);
  }

  // Clean up oauth_state cookie if it exists (for backwards compatibility)
  cookieStore.delete("oauth_state");

  const redirectUri = getRedirectUri();
  const oauth2Client = new OAuth2Client(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );

  try {
    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token) {
      throw new Error("No access token received");
    }

    // Get user info
    oauth2Client.setCredentials(tokens);
    const userInfoResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      }
    );

    if (!userInfoResponse.ok) {
      throw new Error("Failed to get user info");
    }

    const userInfo = await userInfoResponse.json();

    // Calculate expiry time (tokens.expiry_date is Unix timestamp in ms)
    const expiresAt = tokens.expiry_date || Date.now() + 3600 * 1000;

    // Store tokens temporarily in a secure cookie for the client to process
    // The client will then save them to Firestore under the authenticated user
    const tokenData: PendingTokens = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || null,
      idToken: tokens.id_token || null,
      expiresAt,
      email: userInfo.email,
      displayName: userInfo.name || null,
      photoURL: userInfo.picture || null,
      scopes: tokens.scope?.split(" ") || [],
      mode: parsedState.mode,
    };

    // Store in a secure, short-lived cookie
    cookieStore.set("pending_oauth_tokens", JSON.stringify(tokenData), {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60, // 1 minute - just long enough to process
      path: "/",
    });

    // Redirect to a processing page that will handle the tokens
    return NextResponse.redirect(`${baseUrl}/api/auth/google/process`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.redirect(
      `${baseUrl}/?error=oauth_failed&message=${encodeURIComponent(message)}`
    );
  }
}
