/**
 * PWA Icon Generator Script
 * 
 * Generates PNG icons from SVG source files for the PWA manifest.
 * 
 * Prerequisites:
 *   bun add -D sharp
 * 
 * Usage:
 *   bun run scripts/generate-icons.ts
 * 
 * This script generates:
 *   - gtd-icon-192.png (192x192)
 *   - gtd-icon-512.png (512x512)
 *   - gtd-icon-maskable-192.png (192x192, with safe zone padding)
 *   - gtd-icon-maskable-512.png (512x512, with safe zone padding)
 *   - apple-touch-icon.png (180x180)
 *   - favicon-32x32.png (32x32)
 *   - favicon-16x16.png (16x16)
 */

import sharp from "sharp";
import { readFile } from "fs/promises";
import { join } from "path";

const LOGOS_DIR = join(import.meta.dir, "../public/logos");

type IconConfig = {
  inputSvg: string;
  outputPng: string;
  size: number;
};

const ICON_CONFIGS: IconConfig[] = [
  // Regular icons
  { inputSvg: "gtd-icon.svg", outputPng: "gtd-icon-192.png", size: 192 },
  { inputSvg: "gtd-icon.svg", outputPng: "gtd-icon-512.png", size: 512 },
  // Maskable icons (already have padding in SVG)
  { inputSvg: "gtd-icon-maskable.svg", outputPng: "gtd-icon-maskable-192.png", size: 192 },
  { inputSvg: "gtd-icon-maskable.svg", outputPng: "gtd-icon-maskable-512.png", size: 512 },
  // Apple touch icon
  { inputSvg: "gtd-icon-maskable.svg", outputPng: "apple-touch-icon.png", size: 180 },
  // Favicons
  { inputSvg: "gtd-icon.svg", outputPng: "favicon-32x32.png", size: 32 },
  { inputSvg: "gtd-icon.svg", outputPng: "favicon-16x16.png", size: 16 },
];

async function generateIcon(config: IconConfig): Promise<void> {
  const inputPath = join(LOGOS_DIR, config.inputSvg);
  const outputPath = join(LOGOS_DIR, config.outputPng);

  try {
    const svgBuffer = await readFile(inputPath);
    
    await sharp(svgBuffer, { density: 300 })
      .resize(config.size, config.size, {
        fit: "contain",
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .png()
      .toFile(outputPath);

    console.log(`✓ Generated ${config.outputPng} (${config.size}x${config.size})`);
  } catch (error) {
    console.error(`✗ Failed to generate ${config.outputPng}:`, error);
    throw error;
  }
}

async function main() {
  console.log("Generating PWA icons...\n");

  for (const config of ICON_CONFIGS) {
    await generateIcon(config);
  }

  console.log("\n✓ All icons generated successfully!");
  console.log(`\nIcons saved to: ${LOGOS_DIR}`);
}

main().catch((error) => {
  console.error("Icon generation failed:", error);
  process.exit(1);
});
