import { z } from "zod";

/**
 * Server-side environment variables schema.
 * These are validated at runtime when accessed.
 */
const serverEnvSchema = z.object({
  // Google OAuth credentials (required for server-side OAuth flow)
  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
  GOOGLE_CLIENT_SECRET: z.string().min(1, "GOOGLE_CLIENT_SECRET is required"),

  // App URL for OAuth redirects
  APP_URL: z
    .string()
    .url("APP_URL must be a valid URL")
    .default("http://localhost:3000"),

  // Node environment
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedEnv: ServerEnv | null = null;

/**
 * Get validated server environment variables.
 * Throws an error with detailed message if validation fails.
 */
export function getServerEnv(): ServerEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  const result = serverEnvSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.issues
      .map((e) => `  - ${e.path.join(".")}: ${e.message}`)
      .join("\n");

    throw new Error(
      `❌ Environment validation failed:\n${errors}\n\n` +
        `To fix this, ensure these variables are set in your .env.local file:\n` +
        `  GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com\n` +
        `  GOOGLE_CLIENT_SECRET=your-client-secret\n` +
        `  APP_URL=http://localhost:3000 (optional, defaults to localhost)\n\n` +
        `Get these from: https://console.cloud.google.com/apis/credentials`
    );
  }

  cachedEnv = result.data;
  return cachedEnv;
}

/**
 * Check if server environment is properly configured.
 * Returns false instead of throwing if validation fails.
 */
export function isServerEnvConfigured(): boolean {
  const result = serverEnvSchema.safeParse(process.env);
  return result.success;
}
