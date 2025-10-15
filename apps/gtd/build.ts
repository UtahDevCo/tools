#!/usr/bin/env bun
import plugin from "bun-plugin-tailwind";
import { existsSync } from "fs";
import { rm } from "fs/promises";
import path from "path";
import { z } from "zod";

const BuildConfigSchema = z.object({
  outdir: z.string().optional(),
  minify: z.union([z.boolean(), z.record(z.boolean())]).optional(),
  sourcemap: z.enum(["none", "linked", "inline", "external"]).optional(),
  target: z.enum(["browser", "bun", "node"]).optional(),
  format: z.enum(["esm", "cjs", "iife"]).optional(),
  splitting: z.boolean().optional(),
  packages: z.enum(["bundle", "external"]).optional(),
  publicPath: z.string().optional(),
  env: z.union([z.literal("inline"), z.literal("disable"), z.string()]).optional(),
  conditions: z.union([z.string(), z.array(z.string())]).optional(),
  external: z.union([z.string(), z.array(z.string())]).optional(),
  banner: z.string().optional(),
  footer: z.string().optional(),
  define: z.record(z.any()).optional(),
}).passthrough();

type BuildConfig = z.infer<typeof BuildConfigSchema>;

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.info(`
🏗️  Bun Build Script

Usage: bun run build.ts [options]

Common Options:
  --outdir <path>          Output directory (default: "dist")
  --minify                 Enable minification (or --minify.whitespace, --minify.syntax, etc)
  --sourcemap <type>      Sourcemap type: none|linked|inline|external
  --target <target>        Build target: browser|bun|node
  --format <format>        Output format: esm|cjs|iife
  --splitting              Enable code splitting
  --packages <type>        Package handling: bundle|external
  --public-path <path>     Public path for assets
  --env <mode>             Environment handling: inline|disable|prefix*
  --conditions <list>      Package.json export conditions (comma separated)
  --external <list>        External packages (comma separated)
  --banner <text>          Add banner text to output
  --footer <text>          Add footer text to output
  --define <obj>           Define global constants (e.g. --define.VERSION=1.0.0)
  --help, -h               Show this help message

Example:
  bun run build.ts --outdir=dist --minify --sourcemap=linked --external=react,react-dom
`);
  process.exit(0);
}

const toCamelCase = (str: string): string =>
  str.replace(/-([a-z])/g, (g) => g[1]?.toUpperCase() ?? g);

const parseValue = (value: string): any => {
  if (value === "true") return true;
  if (value === "false") return false;

  if (/^\d+$/.test(value)) return parseInt(value, 10);
  if (/^\d*\.\d+$/.test(value)) return parseFloat(value);

  if (value.includes(",")) return value.split(",").map((v) => v.trim());

  return value;
};

function parseArgs(): BuildConfig {
  const config: Record<string, any> = {};
  const args = process.argv.slice(2);

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === undefined) continue;
    if (!arg.startsWith("--")) continue;

    if (arg.startsWith("--no-")) {
      const key = toCamelCase(arg.slice(5));
      config[key] = false;
      continue;
    }

    if (
      !arg.includes("=") &&
      (i === args.length - 1 || args[i + 1]?.startsWith("--"))
    ) {
      const key = toCamelCase(arg.slice(2));
      config[key] = true;
      continue;
    }

    let key: string;
    let value: string;

    if (arg.includes("=")) {
      [key, value] = arg.slice(2).split("=", 2) as [string, string];
    } else {
      key = arg.slice(2);
      value = args[++i] ?? "";
    }

    key = toCamelCase(key);

    if (key.includes(".")) {
      const parts = key.split(".");
      const parentKey = parts[0];
      const childKey = parts[1];
      
      if (parentKey && childKey) {
        config[parentKey] = config[parentKey] || {};
        config[parentKey][childKey] = parseValue(value);
      }
    } else {
      config[key] = parseValue(value);
    }
  }

  return BuildConfigSchema.parse(config);
}

const formatFileSize = (bytes: number): string => {
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
};

console.info("\n🚀 Starting build process...\n");

const cliConfig = parseArgs();
const outdir = cliConfig.outdir ?? path.join(process.cwd(), "dist");

if (existsSync(outdir)) {
  console.info(`🗑️ Cleaning previous build at ${outdir}`);
  await rm(outdir, { recursive: true, force: true });
}

const start = performance.now();

// Load environment variables from .env.production
const envFile = path.join(process.cwd(), ".env.production");
if (existsSync(envFile)) {
  const envContent = await Bun.file(envFile).text();
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...valueParts] = trimmed.split("=");
      if (key && valueParts.length > 0) {
        process.env[key] = valueParts.join("=");
      }
    }
  }
}

const htmlFiles = [...new Bun.Glob("**.html").scanSync("src")]
  .map((a) => path.resolve("src", a))
  .filter((dir) => !dir.includes("node_modules"));

// Include frontend.tsx as a browser entrypoint
const entrypoints = [
  ...htmlFiles,
  path.resolve("src", "frontend.tsx"),
];

console.info(
  `📄 Found ${htmlFiles.length} HTML ${htmlFiles.length === 1 ? "file" : "files"} and 1 frontend module to process\n`
);

// Normalize config to match Bun.BuildConfig requirements
const normalizedConfig: Partial<Bun.BuildConfig> = {};

if (cliConfig.outdir) normalizedConfig.outdir = cliConfig.outdir;
if (cliConfig.minify !== undefined) normalizedConfig.minify = cliConfig.minify;
if (cliConfig.sourcemap) normalizedConfig.sourcemap = cliConfig.sourcemap;
if (cliConfig.target) normalizedConfig.target = cliConfig.target;
if (cliConfig.format) normalizedConfig.format = cliConfig.format;
if (cliConfig.splitting !== undefined) normalizedConfig.splitting = cliConfig.splitting;
if (cliConfig.packages) normalizedConfig.packages = cliConfig.packages;
if (cliConfig.publicPath) normalizedConfig.publicPath = cliConfig.publicPath;
if (cliConfig.banner) normalizedConfig.banner = cliConfig.banner;
if (cliConfig.footer) normalizedConfig.footer = cliConfig.footer;
if (cliConfig.define) normalizedConfig.define = cliConfig.define;

// Normalize external and conditions to arrays
if (cliConfig.external) {
  normalizedConfig.external = Array.isArray(cliConfig.external)
    ? cliConfig.external
    : cliConfig.external.split(",").map((s) => s.trim());
}

if (cliConfig.conditions) {
  normalizedConfig.conditions = Array.isArray(cliConfig.conditions)
    ? cliConfig.conditions
    : cliConfig.conditions.split(",").map((s) => s.trim());
}

const result = await Bun.build({
  entrypoints,
  outdir,
  plugins: [plugin],
  minify: true,
  target: "browser",
  sourcemap: "linked",
  publicPath: "/",
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
    "import.meta.env.AUTH_URL": JSON.stringify(process.env.AUTH_URL || ""),
  },
  ...normalizedConfig,
});

const end = performance.now();

const outputTable = result.outputs.map((output) => ({
  File: path.relative(process.cwd(), output.path),
  Type: output.kind,
  Size: formatFileSize(output.size),
}));

console.table(outputTable);
const buildTime = (end - start).toFixed(2);

console.info(`\n✅ Build completed in ${buildTime}ms\n`);
