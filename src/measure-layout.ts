import type { TreeLine } from "./parse-change-tree.js";
import { ChangeTreeRenderError } from "./parse-change-tree.js";

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

const LINE_HEIGHT_PX = Math.round(FONT_SIZE_PX * 1.5);

function visibleCharacterWidth(line: TreeLine): number {
  const markerSpace = line.body === "" ? "" : " ";
  const marker = line.marker === null ? "" : line.marker + markerSpace;
  const comment = line.comment ?? "";
  const fullLine = line.indent + marker + line.body + comment;
  return [...fullLine].length;
}

export function measureLayout(
  lines: TreeLine[],
  maxLineWidth: number,
): LayoutMetrics {
  const measured: LineMetrics[] = lines.map((line, index) => {
    const characterWidth = visibleCharacterWidth(line);
    if (characterWidth > maxLineWidth) {
      throw new ChangeTreeRenderError(
        `Cannot render tree: line ${index + 1} exceeds maximum width of ${maxLineWidth} characters.`,
      );
    }
    return { line, characterWidth };
  });

  const legendWidth = [...LEGEND_TEXT].length;
  const widestLine = measured.reduce(
    (widest, line) => Math.max(widest, line.characterWidth),
    0,
  );
  const contentCharacters = Math.max(widestLine, legendWidth);

  const widthPx =
    Math.round(contentCharacters * CHAR_ADVANCE_PX) + 2 * HORIZONTAL_PADDING_PX;
  const heightPx =
    measured.length * LINE_HEIGHT_PX +
    LINE_HEIGHT_PX +
    2 * VERTICAL_PADDING_PX;

  return { lines: measured, widthPx, heightPx, lineHeightPx: LINE_HEIGHT_PX };
}
