import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import { readFile, writeFile } from 'fs/promises';
import type { SplitOptions, PageRegion } from './types';

type SeparatorBand = {
  start: number;
  end: number;
  midpoint: number;
  score: number;
};

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

    const pageFiles = await this.extractPages(image, regions);
    
    if (this.options.pdf) {
      await this.createPDF(pageFiles);
    }
    
    console.log(`✅ Complete! Pages saved to ${this.options.outputDir}/`);
  }

  private async detectPages(
    image: sharp.Sharp,
    width: number,
    height: number
  ): Promise<PageRegion[]> {
    switch (this.options.mode) {
      case 'manual':
        return await this.detectManualPages(image, width, height);
      case 'auto':
        return await this.detectAutoPages(image, width, height);
      case 'fixed':
        return await this.detectManualPages(image, width, height);
      case 'stacked-pages':
        return await this.detectStackedPages(image, width, height);
      default:
        throw new Error(`Unknown mode: ${this.options.mode}`);
    }
  }

  private async detectManualPages(
    image: sharp.Sharp,
    width: number,
    height: number
  ): Promise<PageRegion[]> {
    const rows = this.options.rows || 1;
    const cols = this.options.cols || 1;

    const { data } = await this.getGreyscaleData(image);

    const rowBoundaries = this.refineManualBoundaries(data, width, height, rows, 'horizontal');
    const colBoundaries = this.refineManualBoundaries(data, width, height, cols, 'vertical');
    
    const regions: PageRegion[] = [];
    let pageNumber = 1;
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const left = colBoundaries[col];
        const right = colBoundaries[col + 1];
        const top = rowBoundaries[row];
        const bottom = rowBoundaries[row + 1];

        regions.push({
          left,
          top,
          width: right - left,
          height: bottom - top,
          row: row + 1,
          col: col + 1,
          pageNumber: pageNumber++
        });
      }
    }
    
    return regions;
  }

  private async detectStackedPages(
    image: sharp.Sharp,
    width: number,
    height: number
  ): Promise<PageRegion[]> {
    const rows = this.options.rows || 1;
    const cols = this.options.cols || 1;
    const { data } = await this.getGreyscaleData(image);

    const separatorBands = this.findHorizontalSeparatorBands(data, width, height);
    const selectedBands = this.selectSeparatorBands(separatorBands, height, rows);

    console.log(`🔍 Found ${separatorBands.length} horizontal separator band(s); using ${selectedBands.length}`);

    if (rows > 1 && selectedBands.length < rows - 1) {
      console.log('   Falling back to manual snapped boundaries because not enough separator bands were found.');
      return await this.detectManualPages(image, width, height);
    }

    const rowSpans = this.buildRowSpansFromSeparators(selectedBands, height);
    const colBoundaries = this.refineManualBoundaries(data, width, height, cols, 'vertical');
    const regions: PageRegion[] = [];
    let pageNumber = 1;

    for (let rowIndex = 0; rowIndex < rowSpans.length; rowIndex++) {
      const rowSpan = rowSpans[rowIndex];

      for (let col = 0; col < cols; col++) {
        const left = colBoundaries[col];
        const right = colBoundaries[col + 1];

        regions.push({
          left,
          top: rowSpan.top,
          width: right - left,
          height: rowSpan.bottom - rowSpan.top,
          row: rowIndex + 1,
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
    
    const { data } = await this.getGreyscaleData(image);

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

  private findHorizontalSeparatorBands(
    data: Buffer,
    width: number,
    height: number
  ): SeparatorBand[] {
    const bands: SeparatorBand[] = [];
    let currentStart = -1;
    let scoreSum = 0;
    let scoreCount = 0;

    for (let y = 0; y < height; y++) {
      const stats = this.getLineStats(data, width, height, 'horizontal', y);
      const isSeparatorLine =
        stats.uniformityRatio > 0.98 &&
        stats.meanBrightness < 180 &&
        stats.contentRatio > 0.98;

      if (isSeparatorLine) {
        if (currentStart === -1) {
          currentStart = y;
          scoreSum = 0;
          scoreCount = 0;
        }

        scoreSum += (255 - stats.meanBrightness) * stats.uniformityRatio;
        scoreCount++;
        continue;
      }

      if (currentStart !== -1) {
        const end = y - 1;
        const thickness = end - currentStart + 1;

        if (thickness >= 8) {
          bands.push({
            start: currentStart,
            end,
            midpoint: Math.floor((currentStart + end) / 2),
            score: (scoreSum / Math.max(scoreCount, 1)) * thickness
          });
        }

        currentStart = -1;
      }
    }

    if (currentStart !== -1) {
      const end = height - 1;
      const thickness = end - currentStart + 1;

      if (thickness >= 8) {
        bands.push({
          start: currentStart,
          end,
          midpoint: Math.floor((currentStart + end) / 2),
          score: (scoreSum / Math.max(scoreCount, 1)) * thickness
        });
      }
    }

    return bands;
  }

  private selectSeparatorBands(
    separatorBands: SeparatorBand[],
    height: number,
    rows: number
  ): SeparatorBand[] {
    if (rows <= 1 || separatorBands.length === 0) {
      return [];
    }

    const requiredSeparators = rows - 1;

    if (separatorBands.length <= requiredSeparators) {
      return separatorBands;
    }

    const idealStep = height / rows;
    const availableBands = [...separatorBands];
    const selectedBands: SeparatorBand[] = [];

    for (let index = 1; index <= requiredSeparators; index++) {
      const idealPosition = Math.round(idealStep * index);
      let bestBandIndex = -1;
      let bestDistance = Number.POSITIVE_INFINITY;

      for (let bandIndex = 0; bandIndex < availableBands.length; bandIndex++) {
        const distance = Math.abs(availableBands[bandIndex].midpoint - idealPosition);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestBandIndex = bandIndex;
        }
      }

      if (bestBandIndex !== -1) {
        selectedBands.push(availableBands.splice(bestBandIndex, 1)[0]);
      }
    }

    return selectedBands.sort((left, right) => left.start - right.start);
  }

  private buildRowSpansFromSeparators(
    separatorBands: SeparatorBand[],
    height: number
  ): Array<{ top: number; bottom: number }> {
    const rowSpans: Array<{ top: number; bottom: number }> = [];
    let currentTop = 0;

    for (const band of separatorBands) {
      if (band.start > currentTop) {
        rowSpans.push({ top: currentTop, bottom: band.start });
      }

      currentTop = Math.min(height, band.end + 1);
    }

    if (currentTop < height) {
      rowSpans.push({ top: currentTop, bottom: height });
    }

    return rowSpans.filter(span => span.bottom > span.top);
  }

  private async getGreyscaleData(
    image: sharp.Sharp
  ): Promise<{ data: Buffer; width: number; height: number }> {
    const { data, info } = await image
      .clone()
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    return {
      data,
      width: info.width,
      height: info.height
    };
  }

  private refineManualBoundaries(
    data: Buffer,
    width: number,
    height: number,
    segments: number,
    direction: 'horizontal' | 'vertical'
  ): number[] {
    const totalSize = direction === 'horizontal' ? height : width;

    if (segments <= 1) {
      return [0, totalSize];
    }

    const segmentSize = totalSize / segments;
    const searchRadius = Math.max(40, Math.floor(segmentSize * 0.12));
    const boundaries = [0];

    for (let segment = 1; segment < segments; segment++) {
      const idealBoundary = Math.round(segmentSize * segment);
      const start = Math.max(boundaries[boundaries.length - 1] + 1, idealBoundary - searchRadius);
      const end = Math.min(totalSize - 2, idealBoundary + searchRadius);

      const gutterRuns: Array<{ start: number; end: number }> = [];
      let bestBoundary = idealBoundary;
      let bestScore = Number.POSITIVE_INFINITY;
      let bestSeparatorBoundary = -1;
      let bestSeparatorScore = Number.NEGATIVE_INFINITY;
      let currentRunStart = -1;

      for (let position = start; position <= end; position++) {
        const stats = this.getLineStats(data, width, height, direction, position);
        const distancePenalty = Math.abs(position - idealBoundary) / searchRadius;
        const score = stats.contentRatio * 4 + stats.uniformityRatio * 1.5 + distancePenalty;
        const isLikelyGutter = stats.contentRatio < 0.02 || stats.uniformityRatio > 0.95;
        const separatorScore =
          stats.uniformityRatio * (1 - stats.meanBrightness / 255) * 3 - distancePenalty;

        if (isLikelyGutter && currentRunStart === -1) {
          currentRunStart = position;
        }

        if (!isLikelyGutter && currentRunStart !== -1) {
          gutterRuns.push({ start: currentRunStart, end: position - 1 });
          currentRunStart = -1;
        }

        if (score < bestScore) {
          bestScore = score;
          bestBoundary = position;
        }

        if (stats.uniformityRatio > 0.97 && stats.meanBrightness < 245 && separatorScore > bestSeparatorScore) {
          bestSeparatorScore = separatorScore;
          bestSeparatorBoundary = position;
        }
      }

      if (currentRunStart !== -1) {
        gutterRuns.push({ start: currentRunStart, end });
      }

      const widestRun = gutterRuns
        .filter(run => run.end >= run.start)
        .sort((left, right) => {
          const leftWidth = left.end - left.start;
          const rightWidth = right.end - right.start;

          if (rightWidth !== leftWidth) {
            return rightWidth - leftWidth;
          }

          const leftCenter = (left.start + left.end) / 2;
          const rightCenter = (right.start + right.end) / 2;
          return Math.abs(leftCenter - idealBoundary) - Math.abs(rightCenter - idealBoundary);
        })[0];

      if (bestSeparatorBoundary !== -1 && bestSeparatorScore > -0.15) {
        bestBoundary = bestSeparatorBoundary;
      } else if (widestRun) {
        bestBoundary = Math.round((widestRun.start + widestRun.end) / 2);
      }

      boundaries.push(bestBoundary);
    }

    boundaries.push(totalSize);
    return boundaries;
  }

  private getLineStats(
    data: Buffer,
    width: number,
    height: number,
    direction: 'horizontal' | 'vertical',
    position: number
  ): { contentRatio: number; uniformityRatio: number; meanBrightness: number } {
    const sampleStep = 4;
    const limit = direction === 'horizontal' ? width : height;
    let sampleCount = 0;
    let darkCount = 0;
    let sum = 0;
    let sumSquares = 0;

    for (let offset = 0; offset < limit; offset += sampleStep) {
      const idx = direction === 'horizontal'
        ? position * width + offset
        : offset * width + position;
      const value = data[idx];

      sampleCount++;
      sum += value;
      sumSquares += value * value;

      if (value < 245) {
        darkCount++;
      }
    }

    const mean = sum / sampleCount;
    const variance = Math.max(0, (sumSquares / sampleCount) - (mean * mean));
    const stdDev = Math.sqrt(variance);

    return {
      contentRatio: darkCount / sampleCount,
      uniformityRatio: Math.max(0, 1 - Math.min(stdDev, 32) / 32),
      meanBrightness: mean
    };
  }

  private async extractPages(
    image: sharp.Sharp,
    regions: PageRegion[]
  ): Promise<string[]> {
    const pageFiles: string[] = [];
    
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
        pageImage = await this.trimPage(pageImage, {
          trimHorizontally: true,
          trimVertically: this.options.mode !== 'stacked-pages'
        });
      }

      // Whiten background if enabled
      if (this.options.whiten) {
        pageImage = await this.whitenBackground(pageImage);
      }

      await pageImage.toFile(outputPath);
      pageFiles.push(outputPath);
    }
    
    return pageFiles;
  }

  private async trimPage(
    pageImage: sharp.Sharp,
    options: { trimHorizontally: boolean; trimVertically: boolean }
  ): Promise<sharp.Sharp> {
    const padding = this.options.cropPadding || 0;
    const horizontalPadding =
      this.options.mode === 'stacked-pages' ? Math.max(padding, 75) : padding;
    const verticalPadding = padding;

    const { data, info } = await pageImage
      .clone()
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const width = info.width;
    const height = info.height;

    const isRemovableLine = (direction: 'horizontal' | 'vertical', position: number): boolean => {
      const stats = this.getLineStats(data, width, height, direction, position);
      return stats.contentRatio < 0.02 || stats.uniformityRatio > 0.9;
    };

    // Find content bounds by removing blank margins and uniform separator bands.
    let minX = 0;
    let maxX = width - 1;
    let minY = 0;
    let maxY = height - 1;

    if (options.trimHorizontally) {
      // Scan from left: remove blank or uniform columns
      for (let x = 0; x < width / 2; x++) {
        if (!isRemovableLine('vertical', x)) {
          minX = x;
          break;
        }
      }

      // Scan from right: remove blank or uniform columns
      for (let x = width - 1; x >= width / 2; x--) {
        if (!isRemovableLine('vertical', x)) {
          maxX = x;
          break;
        }
      }
    }

    if (options.trimVertically) {
      // Scan from top: remove blank or uniform rows
      for (let y = 0; y < height / 2; y++) {
        if (!isRemovableLine('horizontal', y)) {
          minY = y;
          break;
        }
      }

      // Scan from bottom: remove blank or uniform rows
      for (let y = height - 1; y >= height / 2; y--) {
        if (!isRemovableLine('horizontal', y)) {
          maxY = y;
          break;
        }
      }
    }

    // Add padding
    minX = Math.max(0, minX - horizontalPadding);
    minY = Math.max(0, minY - verticalPadding);
    maxX = Math.min(width - 1, maxX + horizontalPadding);
    maxY = Math.min(height - 1, maxY + verticalPadding);

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

  private async whitenBackground(pageImage: sharp.Sharp): Promise<sharp.Sharp> {
    const whitenThreshold = this.options.whitenThreshold || 240;
    
    // Get the image data
    const { data, info } = await pageImage
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    const channels = info.channels;
    
    // Process each pixel
    for (let i = 0; i < data.length; i += channels) {
      // For RGB/RGBA, check if all color channels are above threshold
      const isLight = channels === 1 
        ? data[i] >= whitenThreshold  // Grayscale
        : (data[i] >= whitenThreshold && data[i + 1] >= whitenThreshold && data[i + 2] >= whitenThreshold); // RGB/RGBA
      
      if (isLight) {
        // Make it pure white
        data[i] = 255;     // R or Gray
        if (channels > 1) {
          data[i + 1] = 255; // G
          data[i + 2] = 255; // B
        }
        // Keep alpha channel unchanged if present
      }
    }
    
    // Create new image from modified buffer
    return sharp(data, {
      raw: {
        width: info.width,
        height: info.height,
        channels: info.channels
      }
    });
  }

  private async createPDF(pageFiles: string[]): Promise<void> {
    const pdfOutput = this.options.pdfOutput || `${this.options.outputDir}/output.pdf`;
    
    console.log(`📄 Creating PDF with ${pageFiles.length} page(s)...`);
    
    const pdfDoc = await PDFDocument.create();
    
    for (const pageFile of pageFiles) {
      const imageBytes = await readFile(pageFile);
      const image = await pdfDoc.embedPng(imageBytes);
      
      const page = pdfDoc.addPage([image.width, image.height]);
      page.drawImage(image, {
        x: 0,
        y: 0,
        width: image.width,
        height: image.height,
      });
    }
    
    const pdfBytes = await pdfDoc.save();
    await writeFile(pdfOutput, pdfBytes);
    
    console.log(`📄 PDF created: ${pdfOutput}`);
  }
}
