import type { TreeLine } from "./parse-change-tree.js";

export const FONT_SIZE_PX = 18;
export const CHAR_ADVANCE_PX = 10.8;
export const HORIZONTAL_PADDING_PX = 21;
export const VERTICAL_PADDING_PX = 19;
export const CORNER_RADIUS_PX = 8;
export const DEFAULT_MAX_LINE_WIDTH = 120;
export const LEGEND_TEXT = "++ added   ** changed   ~~ moved   -- removed";

export interface LineMetrics {
  line: TreeLine;
  characterWidth: number;
}

export interface LayoutMetrics {
  lines: LineMetrics[];
  widthPx: number;
  heightPx: number;
  lineHeightPx: number;
}
