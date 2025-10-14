import type { Context } from "hono";
import type { Env } from "../types/env";
import type { User } from "../types/auth";
import { checkRateLimit } from "../middleware/rate-limit";
import { generateAccessToken, generateRefreshToken } from "../lib/jwt";
import { hashEmail } from "../lib/crypto";

export async function handleVerify(c: Context<{ Bindings: Env }>) {
  try {
    const token = c.req.query("token");

    if (!token) {
      console.error("Missing token in verification request");
      return c.json(
        { error: { code: "MISSING_TOKEN", message: "Missing token" } },
        400
      );
    }

    // Check rate limit (5 attempts per token)
    const rateLimitKey = `verify:${token}`;
    const rateLimited = await checkRateLimit(c.env, rateLimitKey, 5, 900);

    if (rateLimited) {
      console.error("Rate limit exceeded for token:", token);
      return c.json(
        {
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Too many verification attempts",
          },
        },
        429
      );
    }

    // Verify magic link token
    const authDO = c.env.AUTH_DO.get(c.env.AUTH_DO.idFromName("global"));
    const verifyResponse = await authDO.fetch(
      new Request("http://internal/verify-magic-link", {
        method: "POST",
        body: JSON.stringify({ token }),
        headers: { "Content-Type": "application/json" },
      })
    );

    if (!verifyResponse.ok) {
      const errorData = (await verifyResponse.json()) as { error: string };
      return c.json(
        {
          error: {
            code: "INVALID_TOKEN",
            message: errorData.error || "Invalid or expired token",
          },
        },
        400
      );
    }

    const { email, appId, redirectUri } = (await verifyResponse.json()) as {
      email: string;
      appId?: string;
      redirectUri?: string;
    };

    // Get user
    const emailHash = await hashEmail(email);
    const userDO = c.env.USER_DO.get(c.env.USER_DO.idFromName(emailHash));
    const getUserResponse = await userDO.fetch(
      new Request("http://internal/get-user", { method: "GET" })
    );
    const userData = (await getUserResponse.json()) as { user: User };

    if (!userData.user) {
      return c.json(
        { error: { code: "USER_NOT_FOUND", message: "User not found" } },
        404
      );
    }

    const user = userData.user;

    // Create session
    const refreshTokenId = crypto.randomUUID();
    const ipAddress = c.req.header("CF-Connecting-IP");
    const userAgent = c.req.header("User-Agent");

    await userDO.fetch(
      new Request("http://internal/create-session", {
        method: "POST",
        body: JSON.stringify({ refreshTokenId, appId, ipAddress, userAgent }),
        headers: { "Content-Type": "application/json" },
      })
    );

    // Generate JWT tokens
    const accessToken = await generateAccessToken(
      c.env.JWT_PRIVATE_KEY,
      user,
      appId
    );
    const refreshToken = await generateRefreshToken(
      c.env.JWT_PRIVATE_KEY,
      user,
      refreshTokenId,
      appId
    );

    // Determine redirect URL
    let redirectUrl: string;
    if (redirectUri) {
      redirectUrl = redirectUri;
    } else if (appId && c.env.APP_URLS) {
      const appUrls = JSON.parse(c.env.APP_URLS) as Record<string, string>;
      redirectUrl = appUrls[appId] || c.env.DEFAULT_APP_URL;
    } else {
      redirectUrl = c.env.DEFAULT_APP_URL;
    }

    // Return tokens in body for proxy to reconstitute, but keep headers for direct access
    return c.json({ redirectUrl, status: 302, accessToken, refreshToken });
  } catch (error) {
    console.error("Error in handleVerify:", error);
    return c.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : "An error occurred",
        },
      },
      500
    );
  }
}
