export type Marker = '++' | '**' | '~~' | '--';

export interface ParsedLine {
  raw: string;
  prefix: string;
  marker: Marker | null;
  body: string;
  comment: string | null;
}

export interface RenderOptions {
  maxLineWidth?: number;
}

export interface LayoutMetrics {
  lineHeight: number;
  charWidth: number;
  hPadding: number;
  vPadding: number;
  canvasWidth: number;
  canvasHeight: number;
  legendGap: number;
}
