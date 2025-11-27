#!/usr/bin/env bun
/**
 * Post-install script to fix shadcn component imports.
 *
 * Shadcn components use `@/lib/utils` but our package structure requires
 * relative imports like `../lib/utils`.
 *
 * Run this script after installing shadcn components:
 *   bun run fix-imports
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const UI_DIR = join(import.meta.dir, "../src/ui");
const BAD_IMPORT = "@/lib/utils";
const GOOD_IMPORT = "../lib/utils";

async function fixImportsInFile(filePath: string): Promise<boolean> {
  const content = await readFile(filePath, "utf-8");

  if (!content.includes(BAD_IMPORT)) {
    return false;
  }

  const fixed = content.replace(
    new RegExp(`from "${BAD_IMPORT}"`, "g"),
    `from "${GOOD_IMPORT}"`,
  );

  await writeFile(filePath, fixed, "utf-8");
  return true;
}

async function main() {
  console.log("🔧 Fixing shadcn imports in src/ui...\n");

  const files = await readdir(UI_DIR);
  const tsxFiles = files.filter((f) => f.endsWith(".tsx"));

  let fixedCount = 0;

  for (const file of tsxFiles) {
    const filePath = join(UI_DIR, file);
    const wasFixed = await fixImportsInFile(filePath);

    if (wasFixed) {
      console.log(`  ✅ Fixed: ${file}`);
      fixedCount++;
    }
  }

  if (fixedCount === 0) {
    console.log("  No files needed fixing.");
  } else {
    console.log(`\n🎉 Fixed ${fixedCount} file(s).`);
  }
}

main().catch((err) => {
  console.error("Error fixing imports:", err);
  process.exit(1);
});
