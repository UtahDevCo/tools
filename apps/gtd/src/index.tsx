import { serve } from "bun";
import index from "./index.html";
import path from "path";
import { existsSync } from "fs";

// Load environment variables from .env.development in development mode
if (process.env.NODE_ENV !== "production") {
  const envFile = path.join(process.cwd(), ".env.development");
  if (existsSync(envFile)) {
    const envContent = await Bun.file(envFile).text();
    for (const line of envContent.split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, ...valueParts] = trimmed.split("=");
        if (key && valueParts.length > 0) {
          process.env[key] = valueParts.join("=");
        }
      }
    }
  }
}

const server = serve({
  routes: {
    "/api/auth/cookie-check": async (req) => {
      const accessToken = req.headers
        .get("cookie")
        ?.split("; ")
        .find((row) => row.startsWith("access_token="))
        ?.split("=")[1];

      if (accessToken) {
        return new Response(null, { status: 200 });
      } else {
        return new Response(null, { status: 401 });
      }
    },
    "/api/auth/logout": async (req) => {
      return new Response(null, {
        status: 200,
        headers: {
          "Set-Cookie":
            "access_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0, refresh_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0",
        },
      });
    },
    // Proxy auth requests to the auth service
    "/api/auth/*": async (req) => {
      const authUrl = process.env.AUTH_URL || "http://localhost:8787";
      const url = new URL(req.url);
      const redirectUrl = new URL(url.pathname + url.search, authUrl);

      // Forward the request to the auth service
      const response = await fetch(redirectUrl.toString(), {
        method: req.method,
        headers: req.headers,
        body:
          req.method !== "GET" && req.method !== "HEAD" ? req.body : undefined,
      });

      const contentType = response.headers.get("content-type");
      const status = response.status;
      const redirected = response.redirected;

      if (redirected) return response;

      // Handle errors
      if (status !== 200) {
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        });
      }

      switch (contentType) {
        case "application/json": {
          const json = await response.json();

          if (json.redirectUrl) {
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
          } else {
            return Response.json(json);
          }
        }
        case "text/html;charset=utf-8":
          return new Response(await response.text(), {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
          });
        default:
          return response;
      }
    },

    // Serve index.html for all unmatched routes.
    "/*": index,

    "/api/hello": {
      async GET(req) {
        return Response.json({
          message: "Hello, world!",
          method: "GET",
        });
      },
      async PUT(req) {
        return Response.json({
          message: "Hello, world!",
          method: "PUT",
        });
      },
    },

    "/api/hello/:name": async (req) => {
      const name = req.params.name;
      return Response.json({
        message: `Hello, ${name}!`,
      });
    },
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

console.info(`🚀 Server running at ${server.url}`);
