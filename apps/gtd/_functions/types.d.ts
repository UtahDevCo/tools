/**
 * Type definitions for Cloudflare Pages Functions
 * These provide TypeScript support for the Pages Functions API
 */

interface Env {
  AUTH_URL: string;
}

declare module "@cloudflare/workers-types" {
  interface PagesFunction<Env = unknown> {
    (context: EventContext<Env, any, any>): Response | Promise<Response>;
  }
}
