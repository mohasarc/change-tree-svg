import { parseLines } from './parse.js';
import { measure } from './layout.js';
import { renderInner } from './render.js';
import { DEFAULT_STRIP_WIDTH } from './palette.js';
import type { RenderOptions, SliceOptions } from './types.js';

export function slice(input: string, options: Partial<RenderOptions & SliceOptions> = {}): string[] {
  const stripWidth = options.stripWidth ?? DEFAULT_STRIP_WIDTH;
  const lines = parseLines(input);
  const metrics = measure(lines, { ...options, container: false });
  const inner = renderInner(lines, metrics);

  const totalWidth = metrics.canvasWidth;
  const totalHeight = metrics.canvasHeight;
  const scale = (options.height ?? totalHeight) / totalHeight;
  const stripCount = Math.ceil(totalWidth / stripWidth);

  const strips: string[] = [];
  for (let i = 0; i < stripCount; i++) {
    const windowX = i * stripWidth;
    const windowWidth = Math.min(stripWidth, totalWidth - windowX);
    const width = Math.round(windowWidth * scale);
    const height = Math.round(totalHeight * scale);
    strips.push(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${windowX} 0 ${windowWidth} ${totalHeight}">${inner}</svg>`,
    );
  }
  return strips;
}
