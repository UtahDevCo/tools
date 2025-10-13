import type { Context, Next } from 'hono';
import type { Env } from '../types/env';
import type { User } from '../types/auth';
import { verifyJWT } from '../lib/jwt';
import { AccessTokenPayloadSchema } from '../types/auth';

export interface AuthContext {
  Variables: {
    user: User;
  };
}

export async function authMiddleware(c: Context<{ Bindings: Env } & AuthContext>, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Missing authorization header' } }, 401);
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const payload = await verifyJWT(c.env.JWT_PUBLIC_KEY, token);
    const { sub: userId, type } = AccessTokenPayloadSchema.parse(payload);

    if (type !== 'access') {
      return c.json({ error: { code: 'INVALID_TOKEN_TYPE', message: 'Invalid token type' } }, 401);
    }

    // Get user from UserDO
    const userDO = c.env.USER_DO.get(c.env.USER_DO.idFromName(userId));
    const userResponse = await userDO.fetch(
      new Request('http://internal/get-user', { method: 'GET' })
    );
    const userData = await userResponse.json() as { user: User | null };

    if (!userData.user) {
      return c.json({ error: { code: 'USER_NOT_FOUND', message: 'User not found' } }, 401);
    }

    // Store user in context
    c.set('user', userData.user);

    await next();
  } catch (error) {
    return c.json({
      error: {
        code: 'UNAUTHORIZED',
        message: error instanceof Error ? error.message : 'Authentication failed'
      }
    }, 401);
  }
}
