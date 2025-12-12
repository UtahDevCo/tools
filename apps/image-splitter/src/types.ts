export interface SplitOptions {
  inputPath: string;
  outputDir: string;
  mode: 'auto' | 'manual' | 'fixed';
  rows?: number;
  cols?: number;
  threshold?: number;
  crop?: boolean;
  cropPadding?: number;
}

export interface PageRegion {
  left: number;
  top: number;
  width: number;
  height: number;
  row: number;
  col: number;
  pageNumber: number;
}
