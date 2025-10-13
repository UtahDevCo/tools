import type { Context } from 'hono';
import type { Env } from '../types/env';

export async function checkRateLimit(
  env: Env,
  key: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  const rateLimiterDO = env.RATE_LIMITER_DO.get(
    env.RATE_LIMITER_DO.idFromName(key)
  );

  const response = await rateLimiterDO.fetch(
    new Request('http://internal/check', {
      method: 'POST',
      body: JSON.stringify({ key, limit, windowSeconds }),
      headers: { 'Content-Type': 'application/json' },
    })
  );

  const data = await response.json() as { rateLimited: boolean };
  return data.rateLimited;
}
