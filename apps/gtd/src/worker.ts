/// <reference types="@cloudflare/workers-types" />

/**
 * Cloudflare Worker entrypoint for serving the GTD app
 * Handles API routes and serves static assets via Workers Static Assets
 */

import { z } from "zod";

const EnvSchema = z.object({
  ASSETS: z.custom<Fetcher>(),
  AUTH_URL: z.string().url(),
  AUTH_SERVICE: z.custom<Fetcher>().optional(),
});

type Env = z.infer<typeof EnvSchema>;

const AuthResponseSchema = z.object({
  redirectUrl: z.string().optional(),
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
});

const worker: ExportedHandler<Env> = {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // API Routes - handle these before checking static assets

    // Cookie check endpoint
    if (pathname === "/api/auth/cookie-check") {
      const cookieHeader = request.headers.get("cookie") || "";
      const accessToken = cookieHeader
        .split("; ")
        .find((row) => row.startsWith("access_token="))
        ?.split("=")[1];

      return new Response(null, {
        status: accessToken ? 200 : 401,
      });
    }

    // Logout endpoint
    if (pathname === "/api/auth/logout") {
      return new Response(null, {
        status: 200,
        headers: {
          "Set-Cookie":
            "access_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0, refresh_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0",
        },
      });
    }

    // Auth proxy - forward all /api/auth/* requests to the auth service
    if (pathname.startsWith("/api/auth/")) {
      // Use service binding if available (production), otherwise use HTTP URL (local dev)
      let response: Response;
      
      if (env.AUTH_SERVICE) {
        // Create a new request for the service binding
        const authRequest = new Request(request.url, {
          method: request.method,
          headers: request.headers,
          body: request.method !== "GET" && request.method !== "HEAD" ? await request.text() : undefined,
        });
        
        response = await env.AUTH_SERVICE.fetch(authRequest);
      } else {
        const authUrl = env.AUTH_URL || "http://localhost:8787";
        const redirectUrl = new URL(pathname + url.search, authUrl);

        // Clone headers to avoid issues with header forwarding
        const headers = new Headers();
        
        // Only copy specific headers that should be forwarded
        const headersToForward = [
          'content-type',
          'authorization',
          'cookie',
          'origin',
          'referer',
          'user-agent',
        ];
        
        for (const header of headersToForward) {
          const value = request.headers.get(header);
          if (value) {
            headers.set(header, value);
          }
        }

        // Read body once and reuse it for forwarding
        let bodyContent: string | undefined;
        if (request.method !== "GET" && request.method !== "HEAD") {
          bodyContent = await request.text();
        }

        // Build the fetch options
        const fetchOptions: RequestInit = {
          method: request.method,
          headers: headers,
        };

        // Only include body for methods that support it
        if (bodyContent !== undefined) {
          fetchOptions.body = bodyContent;
        }

        // Forward the request to the auth service
        response = await fetch(redirectUrl.toString(), fetchOptions);
      }

      const responseText = await response.text();

      const contentType = response.headers.get("content-type");
      const status = response.status;

      // If the auth service redirected, return that response
      if (response.redirected) {
        return response;
      }

      // Handle JSON responses - potentially with redirectUrl and tokens
      if (contentType?.includes("application/json")) {
        const rawJson = JSON.parse(responseText);
        const parseResult = AuthResponseSchema.safeParse(rawJson);

        if (parseResult.success) {
          const json = parseResult.data;

          if (json.redirectUrl && json.accessToken && json.refreshToken) {
            const headers = new Headers();
            headers.set("Location", json.redirectUrl);
            headers.append(
              "Set-Cookie",
              `access_token=${json.accessToken}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=3600`
            );
            headers.append(
              "Set-Cookie",
              `refresh_token=${json.refreshToken}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`
            );
            return new Response(null, {
              status: 302,
              statusText: "Found",
              headers,
            });
          }
        }

        // Return JSON response as-is (includes data, error, etc.) with original status
        return new Response(JSON.stringify(rawJson), {
          status: response.status,
          statusText: response.statusText,
          headers: new Headers({
            "Content-Type": "application/json",
          }),
        });
      }

      // Handle HTML responses
      if (contentType?.includes("text/html")) {
        return new Response(responseText, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        });
      }

      // Default: return the response as-is
      return new Response(responseText, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    }

    // Hello API endpoints for testing
    if (pathname === "/api/hello") {
      if (request.method === "GET") {
        return Response.json({
          message: "Hello, world!",
          method: "GET",
        });
      } else if (request.method === "PUT") {
        return Response.json({
          message: "Hello, world!",
          method: "PUT",
        });
      }
    }

    if (pathname.startsWith("/api/hello/")) {
      const name = pathname.replace("/api/hello/", "");
      return Response.json({
        message: `Hello, ${name}!`,
      });
    }

    // For all other requests, serve static assets
    // The SPA configuration will automatically serve index.html for non-matching routes
    return env.ASSETS.fetch(request);
  },
};

export default worker;
