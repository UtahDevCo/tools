import type { DurableObjectNamespace, Fetcher } from "@cloudflare/workers-types";

export interface Env {
  ASSETS: Fetcher;
  AUTH_URL?: string;
  AUTH_SERVICE?: Fetcher;
  USER_DO: DurableObjectNamespace;
  QUEUE_DO: DurableObjectNamespace;
  JWT_PUBLIC_KEY?: string;
}
