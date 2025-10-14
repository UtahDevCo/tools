import type { Context } from "hono";
import type { Env } from "../types/env";
import { RequestMagicLinkSchema } from "../types/auth";
import { checkRateLimit } from "../middleware/rate-limit";
import { sendMagicLinkEmail } from "../lib/email";
import { hashEmail } from "../lib/crypto";
import { ZodError } from "zod";

export async function handleRequestMagicLink(c: Context<{ Bindings: Env }>) {
  try {
    // Parse and validate request
    const body = await c.req.json();
    const { email, appId, redirectUri } = RequestMagicLinkSchema.parse(body);

    // Check rate limit (3 requests per hour per email)
    const rateLimitKey = `magic-link:${email}`;
    const rateLimited = await checkRateLimit(c.env, rateLimitKey, 3, 3600);

    if (rateLimited) {
      return c.json(
        {
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Too many magic link requests. Please try again later.",
          },
        },
        429
      );
    }

    // Get or create user
    const emailHash = await hashEmail(email);
    const userDO = c.env.USER_DO.get(c.env.USER_DO.idFromName(emailHash));

    // Check if user exists
    const getUserResponse = await userDO.fetch(
      new Request("http://internal/get-user", { method: "GET" })
    );
    const userData = (await getUserResponse.json()) as { user: any };

    // Create user if doesn't exist
    if (!userData.user) {
      const displayName = email.split("@")[0];
      await userDO.fetch(
        new Request("http://internal/create-user", {
          method: "POST",
          body: JSON.stringify({ email, displayName }),
          headers: { "Content-Type": "application/json" },
        })
      );
    }

    // Generate magic link token
    const authDO = c.env.AUTH_DO.get(c.env.AUTH_DO.idFromName("global"));
    const tokenResponse = await authDO.fetch(
      new Request("http://internal/generate-magic-link", {
        method: "POST",
        body: JSON.stringify({ email, appId, redirectUri }),
        headers: { "Content-Type": "application/json" },
      })
    );
    const { token } = (await tokenResponse.json()) as { token: string };

    const magicLink = `${c.env.AUTH_URL}/api/auth/verify?token=${token}`;

    await sendMagicLinkEmail(c.env, email, magicLink, appId);

    return c.json({
      data: {
        success: true,
        message: "Magic link sent to your email",
      },
    });
  } catch (error) {
    console.error("Error in handleRequestMagicLink:", error);

    console.error(error);

    // Handle validation errors
    if (error instanceof ZodError) {
      return c.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request data",
            details: error.errors,
          },
        },
        400
      );
    }

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
