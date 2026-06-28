import { RenderError } from './error.js';
import { commentColumnChars, legendLengthChars, lineEndChars } from './geometry.js';
import type { ParsedLine, LayoutMetrics, RenderOptions } from './types.js';
import {
  CHAR_WIDTH,
  COMMENT_GAP,
  COMMENT_OUTLIER_DELTA,
  COMMENT_OVERFLOW_GAP,
  DEFAULT_MAX_LINE_WIDTH,
  DESCENT_ALLOWANCE,
  H_PADDING,
  LEGEND_GAP,
  LINE_HEIGHT,
  ORIGIN_NUDGE,
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
  const hPadding = container ? H_PADDING : ORIGIN_NUDGE;
  const vPadding = container ? V_PADDING : DESCENT_ALLOWANCE;

  const columnChars = commentColumnChars(nonEmpty, COMMENT_OUTLIER_DELTA, COMMENT_GAP);
  const widthChars = Math.max(
    ...nonEmpty.map((l) => lineEndChars(l, columnChars, COMMENT_OVERFLOW_GAP)),
    legend ? legendLengthChars() : 0,
  );
  const canvasWidth = Math.ceil(widthChars * CHAR_WIDTH + (container ? 2 * H_PADDING : 0));
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
    commentColumnChars: columnChars,
  };
}
