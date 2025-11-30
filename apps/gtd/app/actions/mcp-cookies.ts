"use server";

import { writeFile, readFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { cookies } from "next/headers";

const COOKIES_FILE_PATH = join(process.cwd(), "scripts", "mcp-cookies.json");

type CookieExport = {
  name: string;
  value: string;
  domain: string;
  path: string;
};

type FirebaseAuthData = {
  fpiKey: string;
  value: unknown;
};

type CookieFileData = {
  exportedAt: string;
  cookies: CookieExport[];
  firebaseAuth?: FirebaseAuthData[];
};

/**
 * Check if we're running on localhost (development mode).
 * Cookies should only be exported in development for security.
 */
function isLocalhost(): boolean {
  return process.env.NODE_ENV === "development";
}

/**
 * Export current session cookies to a JSON file for MCP server use.
 * Only works on localhost for security.
 */
export async function exportCookiesForMcp(): Promise<{
  success: boolean;
  message: string;
  path?: string;
}> {
  if (!isLocalhost()) {
    return {
      success: false,
      message: "Cookie export is only available in development mode",
    };
  }

  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();

    // Filter to only GTD-related cookies
    const gtdCookies = allCookies
      .filter((c) => c.name.startsWith("gtd_"))
      .map((c) => ({
        name: c.name,
        value: c.value,
        domain: "localhost",
        path: "/",
      }));

    if (gtdCookies.length === 0) {
      return {
        success: false,
        message: "No GTD cookies found. Please log in first.",
      };
    }

    const data: CookieFileData = {
      exportedAt: new Date().toISOString(),
      cookies: gtdCookies,
    };

    // Ensure scripts directory exists
    const scriptsDir = join(process.cwd(), "scripts");
    if (!existsSync(scriptsDir)) {
      await mkdir(scriptsDir, { recursive: true });
    }

    await writeFile(COOKIES_FILE_PATH, JSON.stringify(data, null, 2), "utf-8");

    console.log(
      `[MCP Cookies] Exported ${gtdCookies.length} cookies to ${COOKIES_FILE_PATH}`
    );

    return {
      success: true,
      message: `Exported ${gtdCookies.length} cookies for MCP server`,
      path: COOKIES_FILE_PATH,
    };
  } catch (error) {
    console.error("[MCP Cookies] Export failed:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Save Firebase Auth IndexedDB data sent from the client.
 * This allows persisting Firebase Auth state for MCP browser use.
 */
export async function saveFirebaseAuthData(
  firebaseAuth: FirebaseAuthData[]
): Promise<{ success: boolean; message: string }> {
  if (!isLocalhost()) {
    return {
      success: false,
      message: "Firebase auth export is only available in development mode",
    };
  }

  try {
    // Read existing cookies file or create new structure
    let data: CookieFileData;

    if (existsSync(COOKIES_FILE_PATH)) {
      const content = await readFile(COOKIES_FILE_PATH, "utf-8");
      data = JSON.parse(content) as CookieFileData;
    } else {
      data = {
        exportedAt: new Date().toISOString(),
        cookies: [],
      };
    }

    // Update with Firebase Auth data
    data.firebaseAuth = firebaseAuth;
    data.exportedAt = new Date().toISOString();

    // Ensure scripts directory exists
    const scriptsDir = join(process.cwd(), "scripts");
    if (!existsSync(scriptsDir)) {
      await mkdir(scriptsDir, { recursive: true });
    }

    await writeFile(COOKIES_FILE_PATH, JSON.stringify(data, null, 2), "utf-8");

    console.log(
      `[MCP Cookies] Saved ${firebaseAuth.length} Firebase Auth entries`
    );

    return {
      success: true,
      message: `Saved ${firebaseAuth.length} Firebase Auth entries`,
    };
  } catch (error) {
    console.error("[MCP Cookies] Save Firebase Auth failed:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Read exported cookies from the JSON file.
 * Used by scripts to generate MCP import commands.
 */
export async function readExportedCookies(): Promise<CookieFileData | null> {
  if (!isLocalhost()) {
    return null;
  }

  try {
    if (!existsSync(COOKIES_FILE_PATH)) {
      return null;
    }

    const content = await readFile(COOKIES_FILE_PATH, "utf-8");
    return JSON.parse(content) as CookieFileData;
  } catch (error) {
    console.error("[MCP Cookies] Read failed:", error);
    return null;
  }
}

/**
 * Get the JavaScript code to import cookies into the MCP browser.
 * Returns null if no cookies are exported or not on localhost.
 */
export async function getMcpImportScript(): Promise<string | null> {
  const data = await readExportedCookies();

  if (!data || data.cookies.length === 0) {
    return null;
  }

  const cookieStatements = data.cookies
    .map(
      (c) =>
        `document.cookie = "${c.name}=${encodeURIComponent(c.value)}; path=/";`
    )
    .join("\n  ");

  return `() => {
  ${cookieStatements}
  return document.cookie;
}`;
}

/**
 * Get cookies as an array for client-side injection.
 * Used by the "Refresh auth" button in the MCP browser.
 */
export async function getCookiesForInjection(): Promise<{
  success: boolean;
  cookies?: Array<{ name: string; value: string }>;
  message?: string;
}> {
  if (!isLocalhost()) {
    return {
      success: false,
      message: "Only available in development mode",
    };
  }

  const data = await readExportedCookies();

  if (!data || data.cookies.length === 0) {
    return {
      success: false,
      message: "No cookies found. Log in from a regular browser first.",
    };
  }

  return {
    success: true,
    cookies: data.cookies.map((c) => ({ name: c.name, value: c.value })),
  };
}
