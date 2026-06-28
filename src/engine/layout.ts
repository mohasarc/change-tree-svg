import { RenderError } from './error.js';
import type { ParsedLine, LayoutMetrics, RenderOptions } from './types.js';
import {
  CHAR_WIDTH,
  DEFAULT_MAX_LINE_WIDTH,
  DESCENT_ALLOWANCE,
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

  const legend = options.legend ?? true;
  const container = options.container ?? false;
  const hPadding = container ? H_PADDING : 0;
  const vPadding = container ? V_PADDING : DESCENT_ALLOWANCE;
  const maxLineChars = Math.max(...nonEmpty.map((l) => l.raw.trimEnd().length));
  const canvasWidth = Math.ceil(maxLineChars * CHAR_WIDTH + 2 * hPadding);
  const canvasHeight = (lines.length + (legend ? 2 : 0)) * LINE_HEIGHT + 2 * vPadding;

  return {
    lineHeight: LINE_HEIGHT,
    charWidth: CHAR_WIDTH,
    hPadding,
    vPadding,
    canvasWidth,
    canvasHeight,
    legendGap: LEGEND_GAP,
    legend,
    container,
  };
}
