export interface Env {
  // Durable Object bindings
  AUTH_DO: DurableObjectNamespace;
  USER_DO: DurableObjectNamespace;
  RATE_LIMITER_DO: DurableObjectNamespace;

  // Secrets
  RESEND_API_KEY: string;
  JWT_PRIVATE_KEY: string;
  JWT_PUBLIC_KEY: string;

  // Configuration
  CLIENT_URL: string;
  DEFAULT_APP_URL: string;
  APP_URLS?: string; // JSON object mapping appId to URLs
  ALLOWED_ORIGINS?: string; // Comma-separated list
}
