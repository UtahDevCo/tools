import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { OAuth2Client } from "google-auth-library";
import { getServerEnv } from "@/lib/env";
import {
  getRedirectUri,
  OAUTH_SCOPES,
  isValidEmail,
  type OAuthState,
} from "@/lib/oauth-utils";

export async function GET(request: NextRequest) {
  const env = getServerEnv();
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("mode") || "primary";
  const email = searchParams.get("email"); // For secondary account re-auth

  // Validate email if provided
  if (email && !isValidEmail(email)) {
    return NextResponse.json(
      { error: "Invalid email format" },
      { status: 400 }
    );
  }

  const redirectUri = getRedirectUri();
  const oauth2Client = new OAuth2Client(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );

  // Generate a random state to prevent CSRF
  const stateObj: OAuthState = {
    mode: mode === "secondary" ? "secondary" : "primary",
    nonce: crypto.randomUUID(),
    ...(email && { email }), // Include email for re-auth flow
  };
  const state = JSON.stringify(stateObj);

  // Store state in cookie for verification
  const cookieStore = await cookies();
  cookieStore.set("oauth_state", state, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes
    path: "/",
  });

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline", // Request refresh token
    scope: [...OAUTH_SCOPES],
    prompt: "consent", // Always show consent to ensure refresh token
    state,
    include_granted_scopes: true,
    // Pre-fill email for better UX when re-authenticating
    ...(email && { login_hint: email }),
  });

  return NextResponse.redirect(authUrl);
}
