import { writeFileSync } from 'node:fs';
import type { CliIO } from '../cli.js';
import type { CliOptions } from '../cli-args.js';
import { resolveTreeText } from '../cli-input.js';
import { render } from '../../index.js';
import { renderFallback } from '../../engine/fallback.js';

export function renderCommand(io: CliIO, options: CliOptions): number {
  const stdin = io.stdin !== null && io.stdin.trim() !== '' ? io.stdin : null;
  const tree = resolveTreeText({ text: options.text, file: options.file, stdin });
  const svg = render(tree, { legend: options.legend, container: options.container });
  const fallback = options.fallback ? renderFallback(tree, { legend: options.legend }) : null;

  if (options.output !== null) {
    try {
      writeFileSync(options.output, svg);
    } catch {
      io.stderr(`SVG file could not be created: ${options.output}\n`);
      return 1;
    }
    if (fallback !== null) io.stdout(`${fallback}\n`);
  } else {
    io.stdout(fallback !== null ? `${svg}\n\n${fallback}\n` : `${svg}\n`);
  }
  return 0;
}
