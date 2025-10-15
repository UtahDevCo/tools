/**
 * Cloudflare Pages Function to proxy auth requests to the auth service
 * Endpoint: /api/auth/* (catch-all for routes not handled by specific functions)
 *
 * This handles all auth routes and forwards them to the auth service,
 * then processes the response to set cookies appropriately.
 */

interface Env {
  AUTH_URL: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const authUrl = context.env.AUTH_URL || "http://localhost:8787";
  const url = new URL(context.request.url);
  const redirectUrl = new URL(url.pathname + url.search, authUrl);

  // Forward the request to the auth service
  const response = await fetch(redirectUrl.toString(), {
    method: context.request.method,
    headers: context.request.headers,
    body:
      context.request.method !== "GET" && context.request.method !== "HEAD"
        ? context.request.body
        : undefined,
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
};
