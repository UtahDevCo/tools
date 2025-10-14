import { describe, it, expect, beforeAll } from "bun:test";

/**
 * E2E Tests for Authentication Flow
 *
 * These tests verify the complete authentication flow against the deployed service.
 * Make sure the service is deployed before running these tests.
 *
 * Required environment variables:
 * - AUTH_URL: The URL of the deployed auth service
 * - TEST_EMAIL: Email address to use for testing (optional)
 */

// Default to localhost for local testing
const AUTH_URL = process.env.AUTH_URL || "http://localhost:8787";
const TEST_EMAIL = process.env.TEST_EMAIL || "test@example.com";
const APP_ID = "gtd";

// Normalize AUTH_URL to include protocol if missing
let normalizedAuthUrl = AUTH_URL.trim();
if (
  normalizedAuthUrl &&
  !normalizedAuthUrl.startsWith("http://") &&
  !normalizedAuthUrl.startsWith("https://")
) {
  normalizedAuthUrl = `https://${normalizedAuthUrl}`;
}

// Use normalized URL for all requests
const BASE_URL = normalizedAuthUrl;

console.info(`🧪 Running E2E tests against: ${BASE_URL}`);

describe("E2E: Magic Link Authentication Flow", () => {
  let magicLinkToken: string;
  let accessToken: string;
  let refreshToken: string;
  let cookies: string[] = [];

  it("should request a magic link", async () => {
    const response = await fetch(`${BASE_URL}/api/auth/request-magic-link`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: TEST_EMAIL,
        appId: APP_ID,
      }),
    });

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.data).toBeDefined();
    expect(data.data.success).toBe(true);
    expect(data.data.message).toContain("Magic link sent");

    console.info("✓ Magic link request sent successfully");
  });

  it("should handle duplicate magic link requests with rate limiting", async () => {
    // Make multiple requests
    const requests = Array.from({ length: 4 }, () =>
      fetch(`${BASE_URL}/api/auth/request-magic-link`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: TEST_EMAIL,
          appId: APP_ID,
        }),
      })
    );

    const responses = await Promise.all(requests);

    // At least one should succeed
    const successResponses = responses.filter((r) => r.status === 200);
    expect(successResponses.length).toBeGreaterThan(0);

    // Some may be rate limited
    const rateLimitedResponses = responses.filter((r) => r.status === 429);
    if (rateLimitedResponses.length > 0) {
      console.info(
        `✓ Rate limiting working: ${rateLimitedResponses.length} requests blocked`
      );
    }
  });

  it("should reject invalid email format", async () => {
    const response = await fetch(`${BASE_URL}/api/auth/request-magic-link`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "not-an-email",
        appId: APP_ID,
      }),
    });

    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toBeDefined();
    console.info("✓ Invalid email rejected");
  });

  it("should reject missing email", async () => {
    const response = await fetch(`${BASE_URL}/api/auth/request-magic-link`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        appId: APP_ID,
      }),
    });

    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toBeDefined();
    console.info("✓ Missing email rejected");
  });

  /**
   * NOTE: In a real E2E test, you would need to:
   * 1. Intercept the email sent via Resend
   * 2. Extract the magic link token
   * 3. Use it for verification
   *
   * For manual testing, check your email and use the token from the magic link.
   */
  it.skip("should verify magic link and set cookies", async () => {
    // This test requires extracting the token from email
    // For now, this is a manual test

    if (!magicLinkToken) {
      console.info("⚠ Skipping: Requires token from email");
      return;
    }

    const response = await fetch(
      `${BASE_URL}/api/auth/verify?token=${magicLinkToken}`,
      {
        method: "GET",
        redirect: "manual", // Don't follow redirects
      }
    );

    // Should redirect on success
    expect([302, 303, 307, 308]).toContain(response.status);

    // Should set cookies
    const setCookieHeaders = response.headers.getSetCookie();
    expect(setCookieHeaders.length).toBeGreaterThanOrEqual(2);

    // Extract tokens from cookies
    setCookieHeaders.forEach((cookie) => {
      if (cookie.startsWith("access_token=")) {
        accessToken = cookie.split(";")[0].split("=")[1];
      }
      if (cookie.startsWith("refresh_token=")) {
        refreshToken = cookie.split(";")[0].split("=")[1];
      }
    });

    expect(accessToken).toBeDefined();
    expect(refreshToken).toBeDefined();

    cookies = setCookieHeaders;

    console.info("✓ Magic link verified and tokens received");
  });

  it.skip("should get user profile with access token", async () => {
    if (!accessToken) {
      console.info("⚠ Skipping: Requires access token from previous test");
      return;
    }

    const response = await fetch(`${BASE_URL}/api/auth/user`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.data.user).toBeDefined();
    expect(data.data.user.email).toBe(TEST_EMAIL);

    console.info("✓ User profile retrieved");
    console.info("User:", data.data.user);
  });

  it.skip("should refresh access token", async () => {
    if (!refreshToken) {
      console.info("⚠ Skipping: Requires refresh token from previous test");
      return;
    }

    const response = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: {
        Cookie: `refresh_token=${refreshToken}`,
      },
    });

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.data.access_token).toBeDefined();
    expect(data.data.expires_in).toBe(3600);

    // Update access token
    const newAccessToken = data.data.access_token;
    expect(newAccessToken).toBeTruthy();
    expect(newAccessToken).not.toBe(accessToken);

    console.info("✓ Access token refreshed");
  });

  it.skip("should logout and revoke tokens", async () => {
    if (!accessToken || !refreshToken) {
      console.info("⚠ Skipping: Requires tokens from previous tests");
      return;
    }

    const response = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Cookie: `refresh_token=${refreshToken}`,
      },
    });

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.data.success).toBe(true);

    // Should clear cookies
    const setCookieHeaders = response.headers.getSetCookie();
    expect(setCookieHeaders.length).toBeGreaterThanOrEqual(2);

    setCookieHeaders.forEach((cookie) => {
      expect(cookie).toContain("Max-Age=0");
    });

    console.info("✓ Logout successful");
  });

  it.skip("should reject requests with revoked token", async () => {
    if (!accessToken) {
      console.info(
        "⚠ Skipping: Requires revoked access token from previous test"
      );
      return;
    }

    const response = await fetch(`${BASE_URL}/api/auth/user`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    // Should be unauthorized after logout
    expect(response.status).toBe(401);

    console.info("✓ Revoked token rejected");
  });
});

describe("E2E: Token Refresh Flow", () => {
  it("should handle refresh with invalid token", async () => {
    const response = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: {
        Cookie: "refresh_token=invalid-token-here",
      },
    });

    expect(response.status).toBe(401);

    const data = await response.json();
    expect(data.error).toBeDefined();

    console.info("✓ Invalid refresh token rejected");
  });

  it("should handle refresh without token", async () => {
    const response = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: "POST",
    });

    expect(response.status).toBe(401);

    const data = await response.json();
    expect(data.error).toBeDefined();

    console.info("✓ Missing refresh token rejected");
  });
});

describe("E2E: Protected Endpoints", () => {
  it("should reject requests without authorization header", async () => {
    const response = await fetch(`${BASE_URL}/api/auth/user`, {
      method: "GET",
    });

    expect(response.status).toBe(401);

    const data = await response.json();
    expect(data.error).toBeDefined();

    console.info("✓ Unauthorized request rejected");
  });

  it("should reject requests with invalid token", async () => {
    const response = await fetch(`${BASE_URL}/api/auth/user`, {
      method: "GET",
      headers: {
        Authorization: "Bearer invalid-token-12345",
      },
    });

    expect(response.status).toBe(401);

    const data = await response.json();
    expect(data.error).toBeDefined();

    console.info("✓ Invalid authorization token rejected");
  });

  it("should reject requests with malformed authorization header", async () => {
    const response = await fetch(`${BASE_URL}/api/auth/user`, {
      method: "GET",
      headers: {
        Authorization: "NotBearer token",
      },
    });

    expect(response.status).toBe(401);

    const data = await response.json();
    expect(data.error).toBeDefined();

    console.info("✓ Malformed authorization header rejected");
  });
});

describe("E2E: CORS and Security Headers", () => {
  it("should handle CORS preflight requests", async () => {
    const response = await fetch(`${BASE_URL}/api/auth/request-magic-link`, {
      method: "OPTIONS",
      headers: {
        Origin: "https://gtd.chrisesplin.com",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Content-Type",
      },
    });

    // Accept both 200 and 204 as valid preflight responses
    expect([200, 204]).toContain(response.status);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBeDefined();
    expect(response.headers.get("Access-Control-Allow-Methods")).toContain(
      "POST"
    );

    console.info("✓ CORS preflight handled correctly");
  });

  it("should reject requests from unauthorized origins", async () => {
    const response = await fetch(`${BASE_URL}/api/auth/request-magic-link`, {
      method: "POST",
      headers: {
        Origin: "https://malicious-site.com",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: TEST_EMAIL,
        appId: APP_ID,
      }),
    });

    // CORS should block or not set CORS headers for unauthorized origins
    const allowOrigin = response.headers.get("Access-Control-Allow-Origin");

    if (allowOrigin) {
      expect(allowOrigin).not.toBe("https://malicious-site.com");
    }

    console.info("✓ Unauthorized origin rejected");
  });
});
