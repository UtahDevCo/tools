"use server";

import crypto from "crypto";
import { getUserFromCookies } from "./session";
import { getMcpConfig, saveMcpConfig, deleteMcpConfig, type McpConfig } from "@/lib/firebase/mcp";

export type McpResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Hashes the API key using SHA-256
 */
function hashApiKey(apiKey: string): string {
  return crypto.createHash("sha256").update(apiKey).digest("hex");
}

/**
 * Generates a random 32-byte API key in hex format
 */
function generateApiKey(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Generates a new MCP API key for the user.
 * Returns the plain-text API key once.
 */
export async function generateMcpApiKey(): Promise<McpResult<string>> {
  try {
    const user = await getUserFromCookies();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const apiKey = generateApiKey();
    const apiKeyHash = hashApiKey(apiKey);

    const config: McpConfig = {
      apiKeyHash,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await saveMcpConfig(user.uid, config);

    return { success: true, data: apiKey };
  } catch (error) {
    console.error("Failed to generate MCP API key:", error);
    return { success: false, error: "Failed to generate API key" };
  }
}

/**
 * Rotates the MCP API key by generating a new one and overwriting the old hash.
 */
export async function rotateMcpApiKey(): Promise<McpResult<string>> {
  return generateMcpApiKey();
}

/**
 * Revokes the MCP API key by deleting the configuration from Firestore.
 */
export async function revokeMcpApiKey(): Promise<McpResult<void>> {
  try {
    const user = await getUserFromCookies();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    await deleteMcpConfig(user.uid);
    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to revoke MCP API key:", error);
    return { success: false, error: "Failed to revoke API key" };
  }
}

/**
 * Retrieves metadata about the current MCP API key (if any).
 */
export async function getMcpApiKeyMetadata(): Promise<McpResult<{
  createdAt: number;
  updatedAt: number;
  lastUsedAt?: number;
} | null>> {
  try {
    const user = await getUserFromCookies();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const config = await getMcpConfig(user.uid);
    if (!config) {
      return { success: true, data: null };
    }

    return {
      success: true,
      data: {
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
        lastUsedAt: config.lastUsedAt,
      },
    };
  } catch (error) {
    console.error("Failed to get MCP API key metadata:", error);
    return { success: false, error: "Failed to get API key metadata" };
  }
}
