import { Hono } from "hono";
import type { Env } from "./types/env";
import { getCorsMiddleware } from "./middleware/cors";
import { authMiddleware } from "./middleware/auth";
import { handleRequestMagicLink } from "./handlers/request-magic-link";
import { handleVerify } from "./handlers/verify";
import { handleRefresh } from "./handlers/refresh";
import { handleLogout } from "./handlers/logout";
import {
  handleGetUser,
  handleUpdateUser,
  handleUpdatePreferences,
  handleListSessions,
  handleRevokeSession,
} from "./handlers/user";

export function createRouter() {
  const app = new Hono<{ Bindings: Env }>();

  // Apply CORS middleware
  app.use("*", getCorsMiddleware());

  // Health check
  app.get("/health", (c) => c.json({ status: "ok" }));

  // Public auth endpoints
  app.post("/api/auth/request-magic-link", handleRequestMagicLink);
  app.get("/api/auth/request-magic-link", (c) => c.json({ status: "ok" }));
  app.get("/api/auth/verify", handleVerify);
  app.post("/api/auth/refresh", handleRefresh);

  // Protected auth endpoints
  app.post("/api/auth/logout", authMiddleware, handleLogout);

  // User endpoints (all protected)
  app.get("/api/auth/user", authMiddleware, handleGetUser);
  app.patch("/api/auth/user", authMiddleware, handleUpdateUser);
  app.patch(
    "/api/auth/user/preferences",
    authMiddleware,
    handleUpdatePreferences
  );
  app.get("/api/auth/user/sessions", authMiddleware, handleListSessions);
  app.delete(
    "/api/auth/user/sessions/:sessionId",
    authMiddleware,
    handleRevokeSession
  );

  return app;
}
