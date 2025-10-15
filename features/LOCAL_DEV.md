## Goal

Run the same app locally and remotely using Cloudflare Workers only (no Bun server in production or for parity local dev).

This document explains the recommended approach, high-level steps, trade-offs, and a testing checklist. It deliberately omits implementation code — we'll implement the Worker and config in a follow-up session.

## Why Workers-only?

- Single runtime parity: the same Cloudflare Workers runtime used locally and in production reduces surprises caused by differing runtimes (Bun vs Workers).
- Cloudflare-native features: Workers can be deployed with Workers Static Assets for static assets, and integrate with Durable Objects, KV, and other Cloudflare bindings you already use in this repo.
- Simpler deployment model: publishing a single Worker that serves the API and static assets simplifies CI/CD and reduces the chance that only static files are deployed.

## Trade-offs

- Developer ergonomics: Bun's local dev server offers fast hot-reload. Workers local dev requires building and running `wrangler dev` with Miniflare; add file watchers to get a similar loop.
- API limits: Cloudflare Workers impose CPU time and size limits — verify large uploads/data streams work within those constraints.
- Asset serving: Workers Static Assets requires bundling/uploading static assets with the Worker rather than relying on Pages' automatic static hosting flow. This is a small operational change but worth noting.

## High-level approach (no code here)

1. Create a single Cloudflare Worker entrypoint that implements the server responsibilities currently handled by Bun:
	 - /api/auth/* proxy to the auth service (preserve redirect + Set-Cookie behavior)
	 - /api/auth/cookie-check and /api/auth/logout
	 - /api/hello (GET, PUT) and /api/hello/:name
	 - SPA fallback: serve index.html when a requested path is not a static asset and the client accepts HTML

2. Use Workers Static Assets (`assets` config in `wrangler.toml`) to publish static assets alongside the Worker. Ensure the build outputs a `dist/` directory containing `index.html`, `assets/`, etc.
	 - Configure `assets.directory = "./dist"` to point to static assets
	 - Configure `assets.not_found_handling = "single-page-application"` for SPA routing
	 - Configure `assets.binding = "ASSETS"` to access assets from Worker code
	 - Use `run_worker_first` patterns to control which routes invoke the Worker before checking for static assets

3. Local development:
	 - `wrangler dev`: runs the Worker locally using Miniflare (the same runtime as production)
	 - Miniflare automatically simulates Workers, Durable Objects, KV, and Static Assets locally
	 - Add a file watcher that rebuilds `dist/` on changes for a similar hot-reload experience
	 - All local resources are separate from production data

4. Build & deploy:
	 - Ensure build step produces `dist/` and any compiled Worker entry (if using TypeScript/bundler).
	 - Deploy with `wrangler deploy` (Worker + static assets) or CI script that runs the build then publishes.

5. Environment and secrets:
	 - Store service URLs (e.g., `AUTH_URL`) and secrets via Wrangler variables or secrets (`wrangler secret put`) so the Worker can call backend services.
	 - Configure Durable Object/namespace bindings in `wrangler.toml` where needed.

## Local dev workflows (conceptual)

- Quick iteration (fast feedback): keep Bun-based local dev while developing UI only, then run Worker+assets locally for integration tests.
- Full parity (recommended before release): run a watcher that rebuilds `dist/` and run `wrangler dev` so the Worker + static assets + DOs are emulated locally with behavior close to production via Miniflare.

## Testing checklist

- Basic API contract
	- /api/hello GET -> returns JSON { message, method }
	- /api/hello PUT -> returns JSON { message, method }
	- /api/hello/:name -> returns personalized greeting

- Auth proxy and cookies
	- Proxy preserves upstream redirect behavior and forwards Location header when appropriate
	- Proxy sets `Set-Cookie` headers for access and refresh tokens as the auth service returns them
	- /api/auth/cookie-check returns 200 when `access_token` cookie present, 401 otherwise
	- /api/auth/logout clears cookies (Max-Age=0)

- SPA routing
	- Unmatched routes that accept HTML return `index.html`
	- Static assets return correct Content-Type and status codes

- Durable Objects / KV (if applicable)
	- Emulate and test DO bindings locally, verify IDs and state behave as expected

- Edge cases
	- Large request bodies and upload limits
	- Redirects + cookies on same response
	- CORS and SameSite behavior for cross-origin flows

## Deploy checklist

1. Build: run the project build and ensure `dist/` contains static assets and the Worker bundle (if applicable).
2. Configure env: set `AUTH_URL` and other required secrets via `wrangler secret put` or in the Cloudflare dashboard.
3. Local smoke: run `wrangler dev` and verify the testing checklist.
4. Publish: `wrangler deploy` (uploads static assets and Worker). Confirm the live URL behaves the same as local.

## Next steps (implementation session)

- Implement the Worker entrypoint (TypeScript) and wire it into `wrangler.toml`.
- Update `wrangler.toml` to use Workers Static Assets configuration (`assets` block instead of deprecated `site` block).
- Update the build pipeline so `dist/` is produced consistently and any bundling step outputs the Worker bundle if using TypeScript.
- Add a local watcher script that rebuilds `dist/` on TS/HTML/asset changes and optionally restarts `wrangler dev`.
- Create a small `DEV.md` with copy-paste commands to start the dev environment.

## Key differences from Workers Sites (deprecated)

Workers Static Assets (the modern approach) differs from the deprecated Workers Sites:

1. **Configuration**: Use `[assets]` block in wrangler.toml instead of `[site]`
2. **No KV dependency**: Static Assets doesn't require Workers KV under the hood
3. **Better SPA support**: Built-in `not_found_handling = "single-page-application"` for automatic SPA routing
4. **Binding access**: Use `env.ASSETS.fetch()` to programmatically access assets in your Worker
5. **Routing control**: `run_worker_first` patterns allow fine-grained control over which routes invoke the Worker
6. **Navigation optimization**: Automatic optimization for browser navigation requests (reduces billable invocations)

If you want I can implement these changes in the repo in the next session: add the Worker source, update `wrangler.toml`, patch the build step, and add dev scripts. Say "Please implement the Workers-only setup" when you're ready.

