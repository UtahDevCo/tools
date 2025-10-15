/**
 * Cloudflare Pages Function to handle user logout
 * Endpoint: /api/auth/logout
 * Clears the access_token and refresh_token cookies
 */

interface Env {
  AUTH_URL: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  return new Response(null, {
    status: 200,
    headers: {
      "Set-Cookie":
        "access_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0, refresh_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0",
    },
  });
};
