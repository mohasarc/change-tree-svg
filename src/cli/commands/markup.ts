import { readdirSync } from 'node:fs';
import type { CliIO } from '../cli.js';
import type { CliOptions } from '../cli-args.js';
import { CliError } from '../cli-error.js';
import { embedMarkup } from '../../engine/markup.js';

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

function stripFileNames(dir: string): string[] {
  return readdirSync(dir)
    .map((name) => ({ name, index: stripIndex(name) }))
    .filter((entry) => entry.index !== null)
    .sort((a, b) => (a.index as number) - (b.index as number))
    .map((entry) => entry.name);
}

function stripIndex(name: string): number | null {
  const match = /^p(\d+)\.svg$/.exec(name);
  return match ? Number(match[1]) : null;
}
