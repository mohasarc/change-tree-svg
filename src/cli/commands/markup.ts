import type { CliIO } from '../cli.js';
import type { CliOptions } from '../cli-args.js';
import { CliError } from '../cli-error.js';
import { embedMarkup } from '../../engine/markup.js';
import { stripFileNames } from '../strip-files.js';

export function markupCommand(io: CliIO, options: CliOptions): number {
  if (options.outDir === null) throw new CliError('--out-dir is required for markup');
  if (options.baseUrl === null) throw new CliError('--base-url is required for markup');

  const names = stripFileNames(options.outDir);
  if (names.length === 0) throw new CliError(`no strip files (p*.svg) found in ${options.outDir}`);

  const base = options.baseUrl.replace(/\/$/, '');
  const urls = names.map((name) => `${base}/${name}`);
  io.stdout(`${embedMarkup(urls)}\n`);
  return 0;
}
