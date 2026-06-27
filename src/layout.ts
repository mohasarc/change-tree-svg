import { RenderError } from './error.js';
import type { ParsedLine, LayoutMetrics, RenderOptions } from './types.js';
import {
  CHAR_WIDTH,
  DEFAULT_MAX_LINE_WIDTH,
  H_PADDING,
  LEGEND_GAP,
  LINE_HEIGHT,
  V_PADDING,
} from './palette.js';

export function measure(lines: ParsedLine[], options: RenderOptions): LayoutMetrics {
  const nonEmpty = lines.filter((l) => l.raw.trimEnd().length > 0);
  if (nonEmpty.length === 0) throw new RenderError('empty tree');

  const maxLineWidth = options.maxLineWidth ?? DEFAULT_MAX_LINE_WIDTH;
  for (const line of nonEmpty) {
    if (line.raw.trimEnd().length > maxLineWidth) {
      throw new RenderError('line too wide to render at the current maximum width');
    }
  }

  const maxLineChars = Math.max(...nonEmpty.map((l) => l.raw.trimEnd().length));
  const canvasWidth = Math.ceil(maxLineChars * CHAR_WIDTH + 2 * H_PADDING);
  const canvasHeight = (lines.length + 2) * LINE_HEIGHT + 2 * V_PADDING;

  return {
    lineHeight: LINE_HEIGHT,
    charWidth: CHAR_WIDTH,
    hPadding: H_PADDING,
    vPadding: V_PADDING,
    canvasWidth,
    canvasHeight,
    legendGap: LEGEND_GAP,
  };
}
