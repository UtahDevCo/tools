import sharp from 'sharp';
import type { SplitOptions, PageRegion } from './types';

export class ImageSplitter {
  private options: SplitOptions;

  constructor(options: SplitOptions) {
    this.options = options;
  }

  async split(): Promise<void> {
    console.log(`📖 Loading image: ${this.options.inputPath}`);
    
    const image = sharp(this.options.inputPath);
    const metadata = await image.metadata();
    
    if (!metadata.width || !metadata.height) {
      throw new Error('Could not read image dimensions');
    }

    console.log(`📏 Image dimensions: ${metadata.width}x${metadata.height}px`);

    const regions = await this.detectPages(image, metadata.width, metadata.height);
    
    console.log(`✂️  Found ${regions.length} page(s) in grid layout`);

    await this.extractPages(image, regions);
    
    console.log(`✅ Complete! Pages saved to ${this.options.outputDir}/`);
  }

  private async detectPages(
    image: sharp.Sharp,
    width: number,
    height: number
  ): Promise<PageRegion[]> {
    switch (this.options.mode) {
      case 'manual':
        return this.detectManualPages(width, height);
      case 'auto':
        return await this.detectAutoPages(image, width, height);
      default:
        throw new Error(`Unknown mode: ${this.options.mode}`);
    }
  }

  private detectManualPages(width: number, height: number): PageRegion[] {
    const rows = this.options.rows || 1;
    const cols = this.options.cols || 1;
    const pageWidth = Math.floor(width / cols);
    const pageHeight = Math.floor(height / rows);
    
    const regions: PageRegion[] = [];
    let pageNumber = 1;
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        regions.push({
          left: col * pageWidth,
          top: row * pageHeight,
          width: col === cols - 1 ? width - (col * pageWidth) : pageWidth,
          height: row === rows - 1 ? height - (row * pageHeight) : pageHeight,
          row: row + 1,
          col: col + 1,
          pageNumber: pageNumber++
        });
      }
    }
    
    return regions;
  }

  private async detectAutoPages(
    image: sharp.Sharp,
    width: number,
    height: number
  ): Promise<PageRegion[]> {
    console.log('🔍 Auto-detecting page grid boundaries...');
    
    // Convert to grayscale and get raw pixel data
    const { data } = await image
      .clone()
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const threshold = this.options.threshold || 250;
    
    // Find vertical gaps (columns)
    const verticalGaps = this.findGaps(data, width, height, 'vertical', threshold);
    console.log(`   Found ${verticalGaps.length} vertical gap(s) (${verticalGaps.length + 1} columns)`);
    
    // Find horizontal gaps (rows)
    const horizontalGaps = this.findGaps(data, width, height, 'horizontal', threshold);
    console.log(`   Found ${horizontalGaps.length} horizontal gap(s) (${horizontalGaps.length + 1} rows)`);
    
    // Create column boundaries
    const colBoundaries = [0, ...verticalGaps, width];
    
    // Create row boundaries
    const rowBoundaries = [0, ...horizontalGaps, height];
    
    // Generate regions for each cell in the grid
    const regions: PageRegion[] = [];
    let pageNumber = 1;
    
    for (let rowIdx = 0; rowIdx < rowBoundaries.length - 1; rowIdx++) {
      for (let colIdx = 0; colIdx < colBoundaries.length - 1; colIdx++) {
        const left = colBoundaries[colIdx];
        const right = colBoundaries[colIdx + 1];
        const top = rowBoundaries[rowIdx];
        const bottom = rowBoundaries[rowIdx + 1];
        
        regions.push({
          left,
          top,
          width: right - left,
          height: bottom - top,
          row: rowIdx + 1,
          col: colIdx + 1,
          pageNumber: pageNumber++
        });
      }
    }
    
    return regions;
  }

  private findGaps(
    data: Buffer,
    width: number,
    height: number,
    direction: 'horizontal' | 'vertical',
    threshold: number
  ): number[] {
    const minGapSize = 20;
    const scanStep = 2;
    const gaps: number[] = [];
    
    if (direction === 'horizontal') {
      // Scan rows for horizontal gaps
      for (let y = 0; y < height; y += scanStep) {
        let whitePixelCount = 0;
        
        for (let x = 0; x < width; x += 10) {
          const idx = y * width + x;
          if (data[idx] >= threshold) {
            whitePixelCount++;
          }
        }
        
        const sampledPixels = Math.floor(width / 10);
        if (whitePixelCount / sampledPixels > 0.9) {
          gaps.push(y);
        }
      }
    } else {
      // Scan columns for vertical gaps
      for (let x = 0; x < width; x += scanStep) {
        let whitePixelCount = 0;
        
        for (let y = 0; y < height; y += 10) {
          const idx = y * width + x;
          if (data[idx] >= threshold) {
            whitePixelCount++;
          }
        }
        
        const sampledPixels = Math.floor(height / 10);
        if (whitePixelCount / sampledPixels > 0.9) {
          gaps.push(x);
        }
      }
    }
    
    // Group consecutive gaps and find their midpoints
    const gapRanges: Array<{ start: number; end: number }> = [];
    let currentGapStart = -1;
    
    for (let i = 0; i < gaps.length; i++) {
      if (currentGapStart === -1) {
        currentGapStart = gaps[i];
      }
      
      if (i === gaps.length - 1 || gaps[i + 1] - gaps[i] > scanStep * 2) {
        const gapEnd = gaps[i];
        if (gapEnd - currentGapStart >= minGapSize) {
          gapRanges.push({ start: currentGapStart, end: gapEnd });
        }
        currentGapStart = -1;
      }
    }
    
    // Return midpoints of gaps
    return gapRanges.map(gap => Math.floor((gap.start + gap.end) / 2));
  }

  private async extractPages(
    image: sharp.Sharp,
    regions: PageRegion[]
  ): Promise<void> {
    for (const region of regions) {
      const outputPath = `${this.options.outputDir}/page-${region.pageNumber}_r${region.row}c${region.col}.png`;
      
      console.log(`   Extracting page ${region.pageNumber} [row ${region.row}, col ${region.col}] (${region.width}x${region.height}px) -> ${outputPath}`);
      
      let pageImage = image.clone().extract({
        left: region.left,
        top: region.top,
        width: region.width,
        height: region.height
      });

      // Always trim borders for auto mode, or when crop is explicitly enabled
      if (this.options.mode === 'auto' || this.options.crop) {
        pageImage = await this.trimPage(pageImage);
      }

      await pageImage.toFile(outputPath);
    }
  }

  private async trimPage(pageImage: sharp.Sharp): Promise<sharp.Sharp> {
    const padding = this.options.cropPadding || 50;

    const { data, info } = await pageImage
      .clone()
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const width = info.width;
    const height = info.height;

    // Check if a line is uniform (border-like) by sampling every Nth pixel
    const isUniformLine = (lineData: number[]): boolean => {
      const sampleStep = 10;
      const samples: number[] = [];
      for (let i = 0; i < lineData.length; i += sampleStep) {
        samples.push(lineData[i]);
      }
      const avg = samples.reduce((sum, val) => sum + val, 0) / samples.length;
      const variance = samples.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / samples.length;
      const stdDev = Math.sqrt(variance);
      // A border line should have low variance (uniform color)
      // Increased threshold to 20 to account for compression artifacts
      return stdDev < 20;
    };

    // Find content bounds by removing uniform border lines
    let minX = 0;
    let maxX = width - 1;
    let minY = 0;
    let maxY = height - 1;

    // Scan from left: remove uniform columns
    for (let x = 0; x < width / 2; x++) {
      const colData = Array.from({ length: height }, (_, y) => data[y * width + x]);
      if (!isUniformLine(colData)) {
        minX = x;
        break;
      }
    }

    // Scan from right: remove uniform columns
    for (let x = width - 1; x >= width / 2; x--) {
      const colData = Array.from({ length: height }, (_, y) => data[y * width + x]);
      if (!isUniformLine(colData)) {
        maxX = x;
        break;
      }
    }

    // Scan from top: remove uniform rows
    for (let y = 0; y < height / 2; y++) {
      const rowData = Array.from({ length: width }, (_, x) => data[y * width + x]);
      if (!isUniformLine(rowData)) {
        minY = y;
        break;
      }
    }

    // Scan from bottom: remove uniform rows
    for (let y = height - 1; y >= height / 2; y--) {
      const rowData = Array.from({ length: width }, (_, x) => data[y * width + x]);
      if (!isUniformLine(rowData)) {
        maxY = y;
        break;
      }
    }

    // Add padding
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(width - 1, maxX + padding);
    maxY = Math.min(height - 1, maxY + padding);

    const cropWidth = maxX - minX + 1;
    const cropHeight = maxY - minY + 1;

    // Only crop if we found borders to remove
    if (cropWidth > 0 && cropHeight > 0 && (minX > 0 || minY > 0 || maxX < width - 1 || maxY < height - 1)) {
      return pageImage.extract({
        left: minX,
        top: minY,
        width: cropWidth,
        height: cropHeight
      });
    }

    return pageImage;
  }
}
