import type { Context } from 'hono';
import type { Env } from '../types/env';
import type { User } from '../types/auth';
import { RefreshTokenPayloadSchema } from '../types/auth';
import { verifyJWT, parseCookies, generateAccessToken } from '../lib/jwt';
import { checkRateLimit } from '../middleware/rate-limit';

export async function handleRefresh(c: Context<{ Bindings: Env }>) {
  try {
    // Get refresh token from cookie
    const cookies = parseCookies(c.req.header('Cookie') || '');
    const refreshToken = cookies.refresh_token;

    if (!refreshToken) {
      return c.json({
        error: {
          code: 'MISSING_REFRESH_TOKEN',
          message: 'Missing refresh token'
        }
      }, 401);
    }

    // Verify refresh token
    const payload = await verifyJWT(c.env.JWT_PUBLIC_KEY, refreshToken);
    const { sub: userId, jti, appId } = RefreshTokenPayloadSchema.parse(payload);

    // Check if token is revoked
    const authDO = c.env.AUTH_DO.get(c.env.AUTH_DO.idFromName('global'));
    const revokedResponse = await authDO.fetch(
      new Request('http://internal/is-token-revoked', {
        method: 'POST',
        body: JSON.stringify({ jti }),
        headers: { 'Content-Type': 'application/json' },
      })
    );
    const { revoked } = await revokedResponse.json() as { revoked: boolean };

    if (revoked) {
      return c.json({
        error: {
          code: 'TOKEN_REVOKED',
          message: 'Token has been revoked'
        }
      }, 401);
    }

    // Check rate limit (10 refreshes per hour per user)
    const rateLimitKey = `refresh:${userId}`;
    const rateLimited = await checkRateLimit(c.env, rateLimitKey, 10, 3600);

    if (rateLimited) {
      return c.json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many refresh attempts'
        }
      }, 429);
    }

    // Get user and update session
    const userDO = c.env.USER_DO.get(c.env.USER_DO.idFromName(userId));
    const getUserResponse = await userDO.fetch(
      new Request('http://internal/get-user', { method: 'GET' })
    );
    const userData = await getUserResponse.json() as { user: User | null };

    if (!userData.user) {
      return c.json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      }, 401);
    }

    const user = userData.user;

    // Get session
    const sessionResponse = await userDO.fetch(
      new Request('http://internal/get-session', {
        method: 'POST',
        body: JSON.stringify({ refreshTokenId: jti }),
        headers: { 'Content-Type': 'application/json' },
      })
    );
    const sessionData = await sessionResponse.json() as { session: any };

    if (!sessionData.session) {
      return c.json({
        error: {
          code: 'INVALID_SESSION',
          message: 'Session not found'
        }
      }, 401);
    }

    // Update session last accessed time
    await userDO.fetch(
      new Request('http://internal/update-session', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: sessionData.session.id,
          lastAccessedAt: Date.now()
        }),
        headers: { 'Content-Type': 'application/json' },
      })
    );

    // Generate new access token
    const accessToken = await generateAccessToken(c.env.JWT_PRIVATE_KEY, user, appId);

    return c.json({
      data: {
        access_token: accessToken,
        expires_in: 3600
      }
    });
  } catch (error) {
    console.error('Error in handleRefresh:', error);
    return c.json({
      error: {
        code: 'UNAUTHORIZED',
        message: error instanceof Error ? error.message : 'Authentication failed'
      }
    }, 401);
  }
}
