"use server";

import { cookies } from "next/headers";
import { TIMEOUTS } from "@/lib/constants";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  // Support both production domains
  // Domain not set - cookies will work for the origin domain
};

const ACCESS_TOKEN_COOKIE = "gtd_access_token";
const USER_DATA_COOKIE = "gtd_user_data";
const TOKEN_EXPIRY_COOKIE = "gtd_token_expiry";

type UserData = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
};

type SessionData = {
  accessToken: string;
  user: UserData;
  expiresAt: number;
};

export async function setSessionCookies(data: SessionData): Promise<void> {
  const cookieStore = await cookies();

  // Set access token (HTTP-only for security)
  cookieStore.set(ACCESS_TOKEN_COOKIE, data.accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: 60 * 60, // 1 hour
  });

  // Set user data (readable by client for UI)
  cookieStore.set(USER_DATA_COOKIE, JSON.stringify(data.user), {
    ...COOKIE_OPTIONS,
    httpOnly: false, // Allow client access for UI
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  // Set token expiry timestamp
  cookieStore.set(TOKEN_EXPIRY_COOKIE, data.expiresAt.toString(), {
    ...COOKIE_OPTIONS,
    httpOnly: false,
    maxAge: 60 * 60, // 1 hour
  });
}

export async function getAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE);
  return token?.value ?? null;
}

export async function getUserFromCookies(): Promise<UserData | null> {
  const cookieStore = await cookies();
  const userData = cookieStore.get(USER_DATA_COOKIE);

  if (!userData?.value) {
    return null;
  }

  try {
    return JSON.parse(userData.value) as UserData;
  } catch {
    return null;
  }
}

export async function getTokenExpiry(): Promise<number | null> {
  const cookieStore = await cookies();
  const expiry = cookieStore.get(TOKEN_EXPIRY_COOKIE);

  if (!expiry?.value) {
    return null;
  }

  return parseInt(expiry.value, 10);
}

export async function isTokenExpired(): Promise<boolean> {
  const expiry = await getTokenExpiry();

  if (!expiry) {
    return true;
  }

  // Use centralized constant for token refresh buffer
  return Date.now() > expiry - TIMEOUTS.TOKEN_REFRESH_BUFFER;
}

export async function clearSessionCookies(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.delete(ACCESS_TOKEN_COOKIE);
  cookieStore.delete(USER_DATA_COOKIE);
  cookieStore.delete(TOKEN_EXPIRY_COOKIE);
}
