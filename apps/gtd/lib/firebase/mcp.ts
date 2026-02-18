import { getFirestoreAdmin } from "./admin";
import { McpConfigSchema, type McpConfig } from "./mcp-types";

/**
 * Get MCP configuration for a user (Server-side using Admin SDK)
 */
export async function getMcpConfig(userId: string): Promise<McpConfig | null> {
  try {
    const db = getFirestoreAdmin();
    const docRef = db.collection("users").doc(userId).collection("mcpConfig").doc("default");
    const docSnap = await docRef.get();

    if (docSnap.exists) {
      return McpConfigSchema.parse(docSnap.data());
    }
    return null;
  } catch (error) {
    console.error("Failed to get MCP config:", error);
    return null;
  }
}

/**
 * Save MCP configuration for a user (Server-side using Admin SDK)
 */
export async function saveMcpConfig(
  userId: string,
  config: McpConfig
): Promise<void> {
  try {
    const db = getFirestoreAdmin();
    const docRef = db.collection("users").doc(userId).collection("mcpConfig").doc("default");
    await docRef.set(config);
  } catch (error) {
    console.error("Failed to save MCP config:", error);
    throw error;
  }
}

/**
 * Delete MCP configuration for a user (Server-side using Admin SDK)
 */
export async function deleteMcpConfig(userId: string): Promise<void> {
  try {
    const db = getFirestoreAdmin();
    const docRef = db.collection("users").doc(userId).collection("mcpConfig").doc("default");
    await docRef.delete();
  } catch (error) {
    console.error("Failed to delete MCP config:", error);
    throw error;
  }
}

/**
 * Find a user ID by an API key hash using a collection group query (Server-side using Admin SDK).
 * Also updates the lastUsedAt timestamp.
 */
export async function findUserIdByApiKeyHash(apiKeyHash: string): Promise<string | null> {
  try {
    const db = getFirestoreAdmin();
    const querySnapshot = await db.collectionGroup("mcpConfig")
      .where("apiKeyHash", "==", apiKeyHash)
      .orderBy("createdAt")
      .limit(1)
      .get();

    if (querySnapshot.empty) {
      return null;
    }

    const docSnap = querySnapshot.docs[0];
    const userId = docSnap.ref.parent.parent?.id;

    if (!userId) {
      return null;
    }

    // Update lastUsedAt in the background
    docSnap.ref.update({ lastUsedAt: Date.now() }).catch(err => 
      console.error("Failed to update lastUsedAt:", err)
    );

    return userId;
  } catch (error) {
    console.error("Failed to find user by API key hash:", error);
    return null;
  }
}
