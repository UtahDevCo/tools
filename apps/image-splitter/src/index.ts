#!/usr/bin/env bun
import { ImageSplitter } from './splitter';
import type { SplitOptions } from './types';
import { existsSync } from 'fs';
import { mkdir } from 'fs/promises';

function parseArgs(): SplitOptions {
  const args = process.argv.slice(2);
  
  // Show help if no arguments
  if (args.length === 0) {
    printHelp();
    process.exit(0);
  }
  
  const options: SplitOptions = {
    inputPath: 'yellow-ledbetter-high-quality.png',
    outputDir: 'output',
    mode: 'manual',
    rows: 4,
    cols: 2,
    crop: true,
    cropPadding: 50
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--input':
      case '-i':
        options.inputPath = args[++i];
        break;
      case '--output':
      case '-o':
        options.outputDir = args[++i];
        break;
      case '--mode':
      case '-m':
        const mode = args[++i];
        if (mode !== 'auto' && mode !== 'manual') {
          throw new Error(`Invalid mode: ${mode}. Use auto or manual`);
        }
        options.mode = mode;
        break;
      case '--rows':
      case '-r':
        options.rows = parseInt(args[++i], 10);
        break;
      case '--cols':
      case '-c':
        options.cols = parseInt(args[++i], 10);
        break;
      case '--threshold':
      case '-t':
        options.threshold = parseInt(args[++i], 10);
        break;
      case '--crop':
        options.crop = true;
        break;
      case '--padding':
        options.cropPadding = parseInt(args[++i], 10);
        break;
      case '--help':
        printHelp();
        process.exit(0);
      default:
        console.error(`Unknown argument: ${args[i]}`);
        printHelp();
        process.exit(1);
    }
  }

  return options;
}

function printHelp(): void {
  console.log(`
🎨 Image Splitter - Split large images into a grid of pages

QUICK START:
  split-image                  # Show this help
  split-image --crop           # Split 4x2 grid with border removal (recommended)

USAGE:
  split-image [OPTIONS]

COMMON OPTIONS:
  --crop                   Enable border trimming (recommended!)
  -i, --input <path>       Input image path (default: yellow-ledbetter-high-quality.png)
  -o, --output <dir>       Output directory (default: output)
  
GRID OPTIONS:
  -m, --mode <mode>        Split mode: auto|manual (default: manual)
  -r, --rows <num>         Number of rows (default: 4)
  -c, --cols <num>         Number of columns (default: 2)
  -t, --threshold <0-255>  White threshold for auto mode (default: 250)

BORDER REMOVAL:
  --padding <pixels>       Padding around content when cropping (default: 50)

OTHER:
  --help                   Show this help

EXAMPLES:
  # Recommended: 4x2 grid with border removal
  split-image --crop

  # Custom grid size
  split-image --rows 2 --cols 3 --crop
  
  # Custom input file
  split-image --input scan.png --crop

  # More padding around content
  split-image --crop --padding 100

  # Auto-detect mode (experimental)
  split-image --mode auto --crop
  `);
}

async function main() {
  try {
    const options = parseArgs();

    // Validate input file exists
    if (!existsSync(options.inputPath)) {
      throw new Error(`Input file not found: ${options.inputPath}`);
    }

    // Create output directory if it doesn't exist
    if (!existsSync(options.outputDir)) {
      await mkdir(options.outputDir, { recursive: true });
      console.log(`📁 Created output directory: ${options.outputDir}`);
    }

    // Validate mode-specific options
    if (options.mode === 'manual' && (!options.rows || !options.cols)) {
      throw new Error('Manual mode requires --rows and --cols options');
    }

    const splitter = new ImageSplitter(options);
    await splitter.split();

  } catch (error) {
    console.error(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

main();
