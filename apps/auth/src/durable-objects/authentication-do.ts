import { DurableObject } from "cloudflare:workers";
import type { Env } from "../types/env";

export class AuthenticationDO extends DurableObject<Env> {
  private sql: SqlStorage;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.sql = state.storage.sql;
    this.initializeTables();
  }

  private initializeTables() {
    // Magic link tokens table
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS magic_link_tokens (
        token TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        app_id TEXT,
        redirect_uri TEXT,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        attempts INTEGER DEFAULT 0,
        used_at INTEGER
      )
    `);

    this.sql.exec(`
      CREATE INDEX IF NOT EXISTS idx_magic_link_email
      ON magic_link_tokens(email)
    `);

    this.sql.exec(`
      CREATE INDEX IF NOT EXISTS idx_magic_link_expires
      ON magic_link_tokens(expires_at)
    `);

    // Token blacklist for revoked tokens
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS token_blacklist (
        jti TEXT PRIMARY KEY,
        revoked_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
      )
    `);

    this.sql.exec(`
      CREATE INDEX IF NOT EXISTS idx_blacklist_expires
      ON token_blacklist(expires_at)
    `);
  }

  async generateMagicLink(
    email: string,
    appId?: string,
    redirectUri?: string
  ): Promise<string> {
    // Generate secure random token
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const token = Array.from(tokenBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const now = Date.now();
    const expiresAt = now + 15 * 60 * 1000; // 15 minutes

    // Store token
    this.sql.exec(
      `INSERT INTO magic_link_tokens (token, email, app_id, redirect_uri, created_at, expires_at, attempts)
       VALUES (?, ?, ?, ?, ?, ?, 0)`,
      token,
      email.toLowerCase(),
      appId || null,
      redirectUri || null,
      now,
      expiresAt
    );

    return token;
  }

  async verifyMagicLink(
    token: string
  ): Promise<{ email: string; appId?: string; redirectUri?: string }> {
    const now = Date.now();

    // Get token
    const result = this.sql
      .exec(
        `SELECT email, app_id, redirect_uri, expires_at, attempts, used_at
       FROM magic_link_tokens
       WHERE token = ?`,
        token
      )
      .toArray() as Array<{
      email: string;
      app_id: string | null;
      redirect_uri: string | null;
      expires_at: number;
      attempts: number;
      used_at: number | null;
    }>;

    if (result.length === 0) {
      throw new Error("INVALID_TOKEN");
    }

    const record = result[0];

    // Check if already used
    if (record.used_at) {
      throw new Error("TOKEN_ALREADY_USED");
    }

    // Check expiration
    if (now > record.expires_at) {
      throw new Error("TOKEN_EXPIRED");
    }

    // Check attempts
    if (record.attempts >= 5) {
      throw new Error("TOO_MANY_ATTEMPTS");
    }

    // Increment attempts
    this.sql.exec(
      `UPDATE magic_link_tokens SET attempts = attempts + 1 WHERE token = ?`,
      token
    );

    // Mark as used
    this.sql.exec(
      `UPDATE magic_link_tokens SET used_at = ? WHERE token = ?`,
      now,
      token
    );

    return {
      email: record.email,
      appId: record.app_id || undefined,
      redirectUri: record.redirect_uri || undefined,
    };
  }

  async revokeToken(jti: string, expiresAt: number): Promise<void> {
    const now = Date.now();

    this.sql.exec(
      `INSERT OR REPLACE INTO token_blacklist (jti, revoked_at, expires_at)
       VALUES (?, ?, ?)`,
      jti,
      now,
      expiresAt
    );
  }

  async isTokenRevoked(jti: string): Promise<boolean> {
    const result = this.sql
      .exec(`SELECT jti FROM token_blacklist WHERE jti = ?`, jti)
      .toArray();

    return result.length > 0;
  }

  async cleanupExpired(): Promise<void> {
    const now = Date.now();

    // Delete expired magic link tokens
    this.sql.exec(`DELETE FROM magic_link_tokens WHERE expires_at < ?`, now);

    // Delete expired blacklist entries
    this.sql.exec(`DELETE FROM token_blacklist WHERE expires_at < ?`, now);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    try {
      if (
        url.pathname === "/generate-magic-link" &&
        request.method === "POST"
      ) {
        const { email, appId, redirectUri } = (await request.json()) as {
          email: string;
          appId?: string;
          redirectUri?: string;
        };
        const token = await this.generateMagicLink(email, appId, redirectUri);
        return Response.json({ token });
      }

      if (url.pathname === "/verify-magic-link" && request.method === "POST") {
        const { token } = (await request.json()) as { token: string };
        const result = await this.verifyMagicLink(token);
        return Response.json(result);
      }

      if (url.pathname === "/revoke-token" && request.method === "POST") {
        const { jti, expiresAt } = (await request.json()) as {
          jti: string;
          expiresAt: number;
        };
        await this.revokeToken(jti, expiresAt);
        return Response.json({ success: true });
      }

      if (url.pathname === "/is-token-revoked" && request.method === "POST") {
        const { jti } = (await request.json()) as { jti: string };
        const revoked = await this.isTokenRevoked(jti);
        return Response.json({ revoked });
      }

      if (url.pathname === "/cleanup" && request.method === "POST") {
        await this.cleanupExpired();
        return Response.json({ success: true });
      }

      return new Response("Not Found", { status: 404 });
    } catch (error) {
      return Response.json(
        {
          error: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 400 }
      );
    }
  }
}
