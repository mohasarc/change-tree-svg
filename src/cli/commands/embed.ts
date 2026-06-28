import type { CliIO } from '../cli.js';
import type { CliOptions } from '../cli-args.js';
import { embedMarkup } from '../../engine/markup.js';
import { resolveStrips, publishStrips } from './publish.js';

export function embedCommand(io: CliIO, options: CliOptions): number {
  const strips = resolveStrips(io, options);
  const urls = publishStrips(io, options, strips);
  io.stdout(`${embedMarkup(urls)}\n`);
  return 0;
}
