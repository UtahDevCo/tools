import type { Context } from 'hono';
import type { Env } from '../types/env';
import type { User } from '../types/auth';
import type { AuthContext } from '../middleware/auth';

export async function handleGetUser(c: Context<{ Bindings: Env } & AuthContext>) {
  try {
    // User should be set by authMiddleware
    const user = c.get('user') as User;

    return c.json({ data: { user } });
  } catch (error) {
    console.error('Error in handleGetUser:', error);
    return c.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An error occurred'
      }
    }, 500);
  }
}

export async function handleUpdateUser(c: Context<{ Bindings: Env } & AuthContext>) {
  try {
    const user = c.get('user') as User;
    const body = await c.req.json();

    // Validate update data
    const updateData: Partial<Pick<User, 'displayName'>> = {};
    if (body.displayName && typeof body.displayName === 'string') {
      updateData.displayName = body.displayName;
    }

    if (Object.keys(updateData).length === 0) {
      return c.json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'No valid fields to update'
        }
      }, 400);
    }

    // Update user
    const userDO = c.env.USER_DO.get(c.env.USER_DO.idFromName(user.id));
    const response = await userDO.fetch(
      new Request('http://internal/update-user', {
        method: 'POST',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const userData = await response.json() as { user: User };

    return c.json({ data: { user: userData.user } });
  } catch (error) {
    console.error('Error in handleUpdateUser:', error);
    return c.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An error occurred'
      }
    }, 500);
  }
}

export async function handleUpdatePreferences(c: Context<{ Bindings: Env } & AuthContext>) {
  try {
    const user = c.get('user') as User;
    const body = await c.req.json();

    // Validate preferences
    const prefs: Partial<User['preferences']> = {};
    if (body.theme && ['light', 'dark', 'system'].includes(body.theme)) {
      prefs.theme = body.theme;
    }
    if (typeof body.emailNotifications === 'boolean') {
      prefs.emailNotifications = body.emailNotifications;
    }

    if (Object.keys(prefs).length === 0) {
      return c.json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'No valid preferences to update'
        }
      }, 400);
    }

    // Update preferences
    const userDO = c.env.USER_DO.get(c.env.USER_DO.idFromName(user.id));
    const response = await userDO.fetch(
      new Request('http://internal/update-preferences', {
        method: 'POST',
        body: JSON.stringify(prefs),
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const userData = await response.json() as { user: User };

    return c.json({ data: { user: userData.user } });
  } catch (error) {
    console.error('Error in handleUpdatePreferences:', error);
    return c.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An error occurred'
      }
    }, 500);
  }
}

export async function handleListSessions(c: Context<{ Bindings: Env } & AuthContext>) {
  try {
    const user = c.get('user') as User;

    const userDO = c.env.USER_DO.get(c.env.USER_DO.idFromName(user.id));
    const response = await userDO.fetch(
      new Request('http://internal/list-sessions', { method: 'GET' })
    );

    const data = await response.json() as { sessions: any[] };

    return c.json({ data: { sessions: data.sessions } });
  } catch (error) {
    console.error('Error in handleListSessions:', error);
    return c.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An error occurred'
      }
    }, 500);
  }
}

export async function handleRevokeSession(c: Context<{ Bindings: Env } & AuthContext>) {
  try {
    const user = c.get('user') as User;
    const body = await c.req.json();
    const { sessionId } = body;

    if (!sessionId || typeof sessionId !== 'string') {
      return c.json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Session ID is required'
        }
      }, 400);
    }

    const userDO = c.env.USER_DO.get(c.env.USER_DO.idFromName(user.id));
    await userDO.fetch(
      new Request('http://internal/revoke-session', {
        method: 'POST',
        body: JSON.stringify({ sessionId }),
        headers: { 'Content-Type': 'application/json' },
      })
    );

    return c.json({ data: { success: true } });
  } catch (error) {
    console.error('Error in handleRevokeSession:', error);
    return c.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An error occurred'
      }
    }, 500);
  }
}
