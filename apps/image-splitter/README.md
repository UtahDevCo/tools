# Image Splitter

Split large images into a grid of pages with automatic border removal. Perfect for sheet music, comics, or any scanned multi-page layout.

## Installation

### Global Installation (Recommended)

```bash
cd /path/to/image-splitter
bun link
```

This creates two global commands:
- `image-splitter` 
- `split-image` (shorter alias)

## Quick Start

```bash
# Show help
split-image

# Split with default settings (4x2 grid, border removal, 50px padding)
split-image --crop

# Split and create a PDF
split-image --crop --pdf

# That's it! Your 8 pages and PDF are in the output/ directory
```

## Usage

### Recommended Command

```bash
# Individual images only
split-image --crop

# Individual images + PDF
split-image --crop --pdf
```

This uses sensible defaults:
- **Input**: `yellow-ledbetter-high-quality.png` (or specify with `--input`)
- **Output**: `output/` directory
- **Grid**: 4 rows × 2 columns = 8 pages
- **Border removal**: Enabled (removes light and dark borders)
- **Padding**: 50px around content
- **PDF**: Optional (add `--pdf` flag)

### Custom Options

```bash
# Different grid size with PDF
split-image --rows 2 --cols 3 --crop --pdf

# Custom input file with PDF
split-image --input my-scan.png --crop --pdf

# Custom PDF name
split-image --crop --pdf --pdf-output my-book.pdf

# More padding around content  
split-image --crop --padding 100 --pdf

# Custom output directory
split-image --output ./my-pages --crop --pdf

# Change multiple options
split-image --input scan.png --rows 3 --cols 2 --crop --padding 75 --pdf
```

## All Options

- `--crop` - **Enable border trimming (recommended!)**
- `--pdf` - **Create a PDF from the extracted pages**
- `-i, --input <path>` - Input image path (default: yellow-ledbetter-high-quality.png)
- `-o, --output <dir>` - Output directory (default: output)
- `-r, --rows <num>` - Number of rows (default: 4)
- `-c, --cols <num>` - Number of columns (default: 2)
- `--padding <pixels>` - Padding around content when cropping (default: 50)
- `--pdf-output <path>` - Custom PDF output path (default: output/output.pdf)
- `-m, --mode <mode>` - Split mode: auto or manual (default: manual)
- `-t, --threshold <0-255>` - White threshold for auto mode (default: 250)
- `--help` - Show help

## Features

- ✅ **Smart Border Removal** - Automatically removes both light and dark borders
- ✅ **PDF Generation** - Optionally create a PDF from extracted pages
- ✅ **Manual Grid Mode** - Split into exact rows × columns  
- ✅ **Auto Detection Mode** - Experimental auto-detection of page boundaries
- ✅ **Configurable Padding** - Keep a safe margin around content (default 50px)
- ✅ **Global Installation** - Use from anywhere on your system
- ✅ **Clean Output** - Files named `page-N_rRcC.png` (e.g., `page-1_r1c1.png`)

## How Border Removal Works

When `--crop` is enabled:
1. Scans each edge of every extracted page
2. Detects uniform border lines (low pixel variance)
3. Removes solid-color borders (both dark ~72 and light ~243)
4. Adds configurable padding around the actual content
5. Result: Clean pages without distracting borders!

## Output

Files are named: `page-{N}_r{row}c{col}.png`

Example output for 4×2 grid:
- `page-1_r1c1.png` (row 1, column 1)
- `page-2_r1c2.png` (row 1, column 2)
- `page-3_r2c1.png` (row 2, column 1)
- ... and so on (8 pages total)

## Examples

```bash
# Most common use case - images + PDF
split-image --crop --pdf

# Just images, no PDF
split-image --crop

# 2x2 grid (4 pages) with PDF
split-image --rows 2 --cols 2 --crop --pdf

# Different input file with custom PDF name
split-image --input my-sheet-music.png --crop --pdf --pdf-output sheet-music.pdf

# Lots of padding for printing
split-image --crop --padding 100 --pdf

# Experimental auto-detect mode
split-image --mode auto --crop --pdf
```

## Development

```bash
# Install dependencies
bun install

# Run locally
bun run src/index.ts --crop

# Build
bun run build
```
