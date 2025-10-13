import type { Context } from 'hono';
import type { Env } from '../types/env';
import { AccessTokenPayloadSchema, RefreshTokenPayloadSchema } from '../types/auth';
import { verifyJWT, parseCookies } from '../lib/jwt';

export async function handleLogout(c: Context<{ Bindings: Env }>) {
  try {
    // Get tokens
    const authHeader = c.req.header('Authorization');
    const accessToken = authHeader?.replace('Bearer ', '');
    const cookies = parseCookies(c.req.header('Cookie') || '');
    const refreshToken = cookies.refresh_token;

    if (!accessToken || !refreshToken) {
      return c.json({
        error: {
          code: 'MISSING_TOKENS',
          message: 'Missing authentication tokens'
        }
      }, 401);
    }

    // Verify access token
    const accessPayload = await verifyJWT(c.env.JWT_PUBLIC_KEY, accessToken);
    const { sub: userId } = AccessTokenPayloadSchema.parse(accessPayload);

    // Verify refresh token
    const refreshPayload = await verifyJWT(c.env.JWT_PUBLIC_KEY, refreshToken);
    const { jti, exp } = RefreshTokenPayloadSchema.parse(refreshPayload);

    // Revoke refresh token in blacklist
    const authDO = c.env.AUTH_DO.get(c.env.AUTH_DO.idFromName('global'));
    await authDO.fetch(
      new Request('http://internal/revoke-token', {
        method: 'POST',
        body: JSON.stringify({ jti, expiresAt: exp * 1000 }),
        headers: { 'Content-Type': 'application/json' },
      })
    );

    // Revoke session
    const userDO = c.env.USER_DO.get(c.env.USER_DO.idFromName(userId));
    const sessionResponse = await userDO.fetch(
      new Request('http://internal/get-session', {
        method: 'POST',
        body: JSON.stringify({ refreshTokenId: jti }),
        headers: { 'Content-Type': 'application/json' },
      })
    );
    const sessionData = await sessionResponse.json() as { session: any };

    if (sessionData.session) {
      await userDO.fetch(
        new Request('http://internal/revoke-session', {
          method: 'POST',
          body: JSON.stringify({ sessionId: sessionData.session.id }),
          headers: { 'Content-Type': 'application/json' },
        })
      );
    }

    // Clear cookies
    const response = c.json({ data: { success: true } });
    response.headers.set('Set-Cookie', [
      'access_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0',
      'refresh_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0'
    ].join(', '));

    return response;
  } catch (error) {
    console.error('Error in handleLogout:', error);
    return c.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An error occurred'
      }
    }, 500);
  }
}
