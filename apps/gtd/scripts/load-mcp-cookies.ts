/**
 * MCP Cookie Loader
 * 
 * This script reads the exported cookies and provides the JavaScript
 * function to inject them into the Chrome DevTools MCP browser.
 * 
 * Usage:
 *   bun run scripts/load-mcp-cookies.ts
 * 
 * This will output the JavaScript function you can use with the
 * mcp_chrome-devtoo_evaluate_script tool.
 * 
 * Automatic workflow:
 * 1. Log into http://localhost:3300 in your regular browser
 * 2. Cookies are automatically saved to scripts/mcp-cookies.json
 * 3. Run this script to get the import function
 * 4. Use evaluate_script in MCP to inject the cookies
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";

const COOKIES_FILE = join(import.meta.dir, "mcp-cookies.json");

type CookieData = {
  exportedAt: string;
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
  }>;
};

function main() {
  if (!existsSync(COOKIES_FILE)) {
    console.error("❌ No cookies file found at:", COOKIES_FILE);
    console.error("\nPlease log into http://localhost:3300 first.");
    console.error("Cookies will be automatically exported on login.");
    process.exit(1);
  }

  const data: CookieData = JSON.parse(readFileSync(COOKIES_FILE, "utf-8"));

  if (!data.cookies || data.cookies.length === 0) {
    console.error("❌ No cookies found in file");
    process.exit(1);
  }

  const exportAge = Date.now() - new Date(data.exportedAt).getTime();
  const ageMinutes = Math.round(exportAge / 1000 / 60);

  console.log(`\n🍪 Found ${data.cookies.length} cookies (exported ${ageMinutes} minutes ago)\n`);

  // Generate the import script
  const cookieStatements = data.cookies
    .map((c) => `document.cookie = "${c.name}=${encodeURIComponent(c.value)}; path=/";`)
    .join("\n  ");

  const importScript = `() => {
  ${cookieStatements}
  console.log("✅ Cookies imported!");
  return document.cookie;
}`;

  console.log("📋 Use this function with mcp_chrome-devtoo_evaluate_script:\n");
  console.log("─".repeat(60));
  console.log(importScript);
  console.log("─".repeat(60));
  console.log("\nAfter importing, navigate to http://localhost:3300 or reload.");

  // Also output a compact version for easy copy-paste
  console.log("\n\n📦 Compact version (single line):\n");
  const compact = `() => { ${data.cookies.map((c) => `document.cookie="${c.name}=${encodeURIComponent(c.value)};path=/";`).join("")} return document.cookie; }`;
  console.log(compact);
}

main();
