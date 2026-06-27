import { parseLines } from './parse.js';
import { measure } from './layout.js';
import { renderSvg, djb2 } from './render.js';
import type { RenderOptions } from './types.js';

export { RenderError } from './error.js';
export { renderFallback } from './fallback.js';
export type { RenderOptions } from './types.js';

export function render(input: string, options?: Partial<RenderOptions>): string {
  const lines = parseLines(input);
  const hash = djb2(input);
  const metrics = measure(lines, options ?? {});
  return renderSvg(lines, metrics, hash);
}
