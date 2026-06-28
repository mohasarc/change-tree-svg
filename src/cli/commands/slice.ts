import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CliIO } from '../cli.js';
import type { CliOptions } from '../cli-args.js';
import { CliError } from '../cli-error.js';
import { resolveTreeText } from '../cli-input.js';
import { slice } from '../../engine/slice.js';

export function sliceCommand(io: CliIO, options: CliOptions): number {
  if (options.outDir === null) throw new CliError('--out-dir is required for slice');

  const stdin = io.stdin !== null && io.stdin.trim() !== '' ? io.stdin : null;
  const tree = resolveTreeText({ text: options.text, file: options.file, stdin });
  const strips = slice(tree, {
    legend: options.legend,
    stripWidth: options.stripWidth,
    height: options.height ?? undefined,
  });

  const names: string[] = [];
  strips.forEach((svg, i) => {
    const name = `p${i}.svg`;
    writeFileSync(join(options.outDir as string, name), svg);
    names.push(name);
  });
  io.stdout(`${names.join('\n')}\n`);
  return 0;
}
