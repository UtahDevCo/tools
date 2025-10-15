/**
 * Cloudflare Pages Function to check if user has valid auth cookie
 * Endpoint: /api/auth/cookie-check
 */

interface Env {
  AUTH_URL: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const accessToken = context.request.headers
    .get("cookie")
    ?.split("; ")
    .find((row) => row.startsWith("access_token="))
    ?.split("=")[1];

  if (accessToken) {
    return new Response(null, { status: 200 });
  } else {
    return new Response(null, { status: 401 });
  }
};
