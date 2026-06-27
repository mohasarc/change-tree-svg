import type { RenderOptions } from './types.js';
import { legendPlainText } from './legend.js';

export function renderFallback(input: string, options?: Partial<RenderOptions>): string {
  const tree = input.endsWith('\n') ? input.slice(0, -1) : input;
  const legend = options?.legend ?? true;
  return legend ? `${tree}\n\n${legendPlainText()}` : tree;
}
