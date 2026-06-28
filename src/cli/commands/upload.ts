import type { CliIO } from '../cli.js';
import type { CliOptions } from '../cli-args.js';
import { resolveStrips, publishStrips } from './publish.js';

export function uploadCommand(io: CliIO, options: CliOptions): number {
  const strips = resolveStrips(io, options);
  const urls = publishStrips(io, options, strips);
  io.stdout(`${urls.join('\n')}\n`);
  return 0;
}
