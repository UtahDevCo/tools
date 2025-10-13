import { DurableObject } from 'cloudflare:workers';
import type { Env } from '../types/env';

interface RateLimitData {
  count: number;
  resetAt: number;
}

export class RateLimiterDO extends DurableObject<Env> {
  private limits: Map<string, RateLimitData> = new Map();

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
  }

  async check(key: string, limit: number, windowSeconds: number): Promise<boolean> {
    const now = Date.now();
    const limitData = this.limits.get(key);

    // If no limit data or window has expired, create new entry
    if (!limitData || now > limitData.resetAt) {
      this.limits.set(key, {
        count: 1,
        resetAt: now + windowSeconds * 1000
      });
      return false; // Not rate limited
    }

    // Check if limit exceeded
    if (limitData.count >= limit) {
      return true; // Rate limited
    }

    // Increment count
    limitData.count++;
    return false; // Not rate limited
  }

  async reset(key: string): Promise<void> {
    this.limits.delete(key);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    try {
      if (url.pathname === '/check' && request.method === 'POST') {
        const { key, limit, windowSeconds } = await request.json() as {
          key: string;
          limit: number;
          windowSeconds: number;
        };
        const rateLimited = await this.check(key, limit, windowSeconds);
        return Response.json({ rateLimited });
      }

      if (url.pathname === '/reset' && request.method === 'POST') {
        const { key } = await request.json() as { key: string };
        await this.reset(key);
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
