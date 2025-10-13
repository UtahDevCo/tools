import { createRouter } from './router';
import type { Env } from './types/env';

// Export Durable Objects
export { AuthenticationDO } from './durable-objects/authentication-do';
export { UserDO } from './durable-objects/user-do';
export { RateLimiterDO } from './durable-objects/rate-limiter-do';

// Create and export the main worker
const app = createRouter();

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return app.fetch(request, env, ctx);
  },
};
