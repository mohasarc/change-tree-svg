import { parseLines } from './engine/parse.js';
import { measure } from './engine/layout.js';
import { renderSvg, djb2 } from './engine/render.js';
import type { RenderOptions } from './engine/types.js';

export { RenderError } from './engine/error.js';
export { renderFallback } from './engine/fallback.js';
export { slice } from './engine/slice.js';
export { embedMarkup } from './engine/markup.js';
export type { RenderOptions, SliceOptions } from './engine/types.js';

export function render(input: string, options?: Partial<RenderOptions>): string {
  const lines = parseLines(input);
  const hash = djb2(input);
  const metrics = measure(lines, options ?? {});
  return renderSvg(lines, metrics, hash);
}
