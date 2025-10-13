import { DurableObject } from 'cloudflare:workers';
import type { Env } from '../types/env';
import type { User, Session } from '../types/auth';

export class UserDO extends DurableObject<Env> {
  private sql: SqlStorage;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.sql = state.storage.sql;
    this.initializeTables();
  }

  private initializeTables() {
    // User profile table
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        display_name TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    // User preferences table
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        user_id TEXT PRIMARY KEY,
        theme TEXT NOT NULL DEFAULT 'system',
        email_notifications INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // User sessions table
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        refresh_token_id TEXT UNIQUE NOT NULL,
        app_id TEXT,
        created_at INTEGER NOT NULL,
        last_accessed_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    this.sql.exec(`
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id
      ON sessions(user_id)
    `);

    this.sql.exec(`
      CREATE INDEX IF NOT EXISTS idx_sessions_expires_at
      ON sessions(expires_at)
    `);

    this.sql.exec(`
      CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token
      ON sessions(refresh_token_id)
    `);
  }

  async getUser(): Promise<User | null> {
    const userResult = this.sql.exec(
      `SELECT id, email, display_name, created_at, updated_at
       FROM users
       LIMIT 1`
    ).toArray() as Array<{
      id: string;
      email: string;
      display_name: string;
      created_at: number;
      updated_at: number;
    }>;

    if (userResult.length === 0) {
      return null;
    }

    const user = userResult[0];

    const prefsResult = this.sql.exec(
      `SELECT theme, email_notifications
       FROM user_preferences
       WHERE user_id = ?`,
      user.id
    ).toArray() as Array<{
      theme: 'light' | 'dark' | 'system';
      email_notifications: number;
    }>;

    const prefs = prefsResult[0] || { theme: 'system' as const, email_notifications: 1 };

    return {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      preferences: {
        theme: prefs.theme,
        emailNotifications: Boolean(prefs.email_notifications),
      },
    };
  }

  async createUser(email: string, displayName: string): Promise<User> {
    const id = crypto.randomUUID();
    const now = Date.now();

    this.sql.exec(
      `INSERT INTO users (id, email, display_name, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      id,
      email.toLowerCase(),
      displayName,
      now,
      now
    );

    this.sql.exec(
      `INSERT INTO user_preferences (user_id, theme, email_notifications)
       VALUES (?, 'system', 1)`,
      id
    );

    return {
      id,
      email: email.toLowerCase(),
      displayName,
      createdAt: now,
      updatedAt: now,
      preferences: {
        theme: 'system',
        emailNotifications: true,
      },
    };
  }

  async updateUser(data: Partial<Pick<User, 'displayName'>>): Promise<User> {
    const user = await this.getUser();
    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    const now = Date.now();

    if (data.displayName) {
      this.sql.exec(
        `UPDATE users SET display_name = ?, updated_at = ? WHERE id = ?`,
        data.displayName,
        now,
        user.id
      );
    }

    return this.getUser() as Promise<User>;
  }

  async updatePreferences(prefs: Partial<User['preferences']>): Promise<User> {
    const user = await this.getUser();
    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    if (prefs.theme) {
      this.sql.exec(
        `UPDATE user_preferences SET theme = ? WHERE user_id = ?`,
        prefs.theme,
        user.id
      );
    }

    if (prefs.emailNotifications !== undefined) {
      this.sql.exec(
        `UPDATE user_preferences SET email_notifications = ? WHERE user_id = ?`,
        prefs.emailNotifications ? 1 : 0,
        user.id
      );
    }

    const now = Date.now();
    this.sql.exec(
      `UPDATE users SET updated_at = ? WHERE id = ?`,
      now,
      user.id
    );

    return this.getUser() as Promise<User>;
  }

  async createSession(
    refreshTokenId: string,
    appId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<Session> {
    const user = await this.getUser();
    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    const id = crypto.randomUUID();
    const now = Date.now();
    const expiresAt = now + 30 * 24 * 60 * 60 * 1000; // 30 days

    this.sql.exec(
      `INSERT INTO sessions (id, user_id, refresh_token_id, app_id, created_at, last_accessed_at, expires_at, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      user.id,
      refreshTokenId,
      appId || null,
      now,
      now,
      expiresAt,
      ipAddress || null,
      userAgent || null
    );

    return {
      id,
      userId: user.id,
      refreshTokenId,
      appId,
      createdAt: now,
      lastAccessedAt: now,
      expiresAt,
      ipAddress,
      userAgent,
    };
  }

  async getSession(refreshTokenId: string): Promise<Session | null> {
    const result = this.sql.exec(
      `SELECT id, user_id, refresh_token_id, app_id, created_at, last_accessed_at, expires_at, ip_address, user_agent
       FROM sessions
       WHERE refresh_token_id = ?`,
      refreshTokenId
    ).toArray() as Array<{
      id: string;
      user_id: string;
      refresh_token_id: string;
      app_id: string | null;
      created_at: number;
      last_accessed_at: number;
      expires_at: number;
      ip_address: string | null;
      user_agent: string | null;
    }>;

    if (result.length === 0) {
      return null;
    }

    const session = result[0];
    return {
      id: session.id,
      userId: session.user_id,
      refreshTokenId: session.refresh_token_id,
      appId: session.app_id || undefined,
      createdAt: session.created_at,
      lastAccessedAt: session.last_accessed_at,
      expiresAt: session.expires_at,
      ipAddress: session.ip_address || undefined,
      userAgent: session.user_agent || undefined,
    };
  }

  async updateSession(sessionId: string, data: { lastAccessedAt: number }): Promise<void> {
    this.sql.exec(
      `UPDATE sessions SET last_accessed_at = ? WHERE id = ?`,
      data.lastAccessedAt,
      sessionId
    );
  }

  async listSessions(): Promise<Session[]> {
    const result = this.sql.exec(
      `SELECT id, user_id, refresh_token_id, app_id, created_at, last_accessed_at, expires_at, ip_address, user_agent
       FROM sessions
       ORDER BY last_accessed_at DESC`
    ).toArray() as Array<{
      id: string;
      user_id: string;
      refresh_token_id: string;
      app_id: string | null;
      created_at: number;
      last_accessed_at: number;
      expires_at: number;
      ip_address: string | null;
      user_agent: string | null;
    }>;

    return result.map(session => ({
      id: session.id,
      userId: session.user_id,
      refreshTokenId: session.refresh_token_id,
      appId: session.app_id || undefined,
      createdAt: session.created_at,
      lastAccessedAt: session.last_accessed_at,
      expiresAt: session.expires_at,
      ipAddress: session.ip_address || undefined,
      userAgent: session.user_agent || undefined,
    }));
  }

  async revokeSession(sessionId: string): Promise<void> {
    this.sql.exec(
      `DELETE FROM sessions WHERE id = ?`,
      sessionId
    );
  }

  async revokeAllSessions(): Promise<void> {
    this.sql.exec(`DELETE FROM sessions`);
  }

  async cleanupExpiredSessions(): Promise<void> {
    const now = Date.now();
    this.sql.exec(
      `DELETE FROM sessions WHERE expires_at < ?`,
      now
    );
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    try {
      if (url.pathname === '/get-user' && request.method === 'GET') {
        const user = await this.getUser();
        return Response.json({ user });
      }

      if (url.pathname === '/create-user' && request.method === 'POST') {
        const { email, displayName } = await request.json() as { email: string; displayName: string };
        const user = await this.createUser(email, displayName);
        return Response.json({ user });
      }

      if (url.pathname === '/update-user' && request.method === 'POST') {
        const data = await request.json() as Partial<Pick<User, 'displayName'>>;
        const user = await this.updateUser(data);
        return Response.json({ user });
      }

      if (url.pathname === '/update-preferences' && request.method === 'POST') {
        const prefs = await request.json() as Partial<User['preferences']>;
        const user = await this.updatePreferences(prefs);
        return Response.json({ user });
      }

      if (url.pathname === '/create-session' && request.method === 'POST') {
        const { refreshTokenId, appId, ipAddress, userAgent } = await request.json() as {
          refreshTokenId: string;
          appId?: string;
          ipAddress?: string;
          userAgent?: string;
        };
        const session = await this.createSession(refreshTokenId, appId, ipAddress, userAgent);
        return Response.json({ session });
      }

      if (url.pathname === '/get-session' && request.method === 'POST') {
        const { refreshTokenId } = await request.json() as { refreshTokenId: string };
        const session = await this.getSession(refreshTokenId);
        return Response.json({ session });
      }

      if (url.pathname === '/update-session' && request.method === 'POST') {
        const { sessionId, lastAccessedAt } = await request.json() as {
          sessionId: string;
          lastAccessedAt: number;
        };
        await this.updateSession(sessionId, { lastAccessedAt });
        return Response.json({ success: true });
      }

      if (url.pathname === '/list-sessions' && request.method === 'GET') {
        const sessions = await this.listSessions();
        return Response.json({ sessions });
      }

      if (url.pathname === '/revoke-session' && request.method === 'POST') {
        const { sessionId } = await request.json() as { sessionId: string };
        await this.revokeSession(sessionId);
        return Response.json({ success: true });
      }

      if (url.pathname === '/revoke-all-sessions' && request.method === 'POST') {
        await this.revokeAllSessions();
        return Response.json({ success: true });
      }

      if (url.pathname === '/cleanup' && request.method === 'POST') {
        await this.cleanupExpiredSessions();
        return Response.json({ success: true });
      }

      return new Response('Not Found', { status: 404 });
    } catch (error) {
      return Response.json({
        error: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 400 });
    }
  }
}
