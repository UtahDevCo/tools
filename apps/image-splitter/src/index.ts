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
    inputPath: '',
    outputDir: 'output',
    mode: 'manual',
    rows: 4,
    cols: 2,
    crop: true,
    cropPadding: 0,
    whiten: true,
    whitenThreshold: 240,
    pdf: true,
    threshold: 50
  };

  // First positional argument is the input file (if it doesn't start with --)
  let argIndex = 0;
  if (args[0] && !args[0].startsWith('-')) {
    options.inputPath = args[0];
    argIndex = 1;
  }

  for (let i = argIndex; i < args.length; i++) {
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
      case '--no-crop':
        options.crop = false;
        break;
      case '--padding':
        options.cropPadding = parseInt(args[++i], 10);
        break;
      case '--no-pdf':
        options.pdf = false;
        break;
      case '--pdf-output':
        options.pdfOutput = args[++i];
        break;
      case '--no-whiten':
        options.whiten = false;
        break;
      case '--whiten-threshold':
        options.whitenThreshold = parseInt(args[++i], 10);
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

  // Validate that input path was provided
  if (!options.inputPath) {
    console.error('Error: Input file is required');
    printHelp();
    process.exit(1);
  }

  return options;
}

function printHelp(): void {
  console.log(`
🎨 Image Splitter - Split large images into a grid of pages

QUICK START:
  split-image <filename>              # Split with defaults (4x2 grid, crop, PDF)
  split-image scan.png --rows 2 --cols 2  # Custom grid size

USAGE:
  split-image <filename> [OPTIONS]

COMMON OPTIONS:
  -i, --input <path>       Input image path (or use first positional argument)
  -o, --output <dir>       Output directory (default: output)
  -r, --rows <num>         Number of rows (default: 4)
  -c, --cols <num>         Number of columns (default: 2)
  
GRID OPTIONS:
  -m, --mode <mode>        Split mode: auto|manual (default: manual)
  -t, --threshold <0-255>  Darkness threshold for border removal (default: 50)

BORDER REMOVAL (enabled by default):
  --no-crop                Disable border trimming
  --padding <pixels>       Padding around content when cropping (default: 0)

BACKGROUND WHITENING (enabled by default):
  --no-whiten              Disable background whitening
  --whiten-threshold <num> Brightness threshold for whitening (default: 240)

PDF OPTIONS (enabled by default):
  --no-pdf                 Don't create a PDF file
  --pdf-output <path>      Custom PDF output path (default: output/output.pdf)

OTHER:
  --help                   Show this help

EXAMPLES:
  # Simple 2x2 grid split
  split-image scan.png --rows 2 --cols 2

  # 4x2 grid (default)
  split-image sheet-music.png
  
  # Custom PDF output path
  split-image scan.png --pdf-output my-book.pdf

  # More padding around content
  split-image scan.png --padding 10

  # Disable cropping and PDF generation
  split-image scan.png --no-crop --no-pdf

  # Auto-detect mode (experimental)
  split-image scan.png --mode auto
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
