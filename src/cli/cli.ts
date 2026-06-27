#!/usr/bin/env node
import { writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseArgs, USAGE, type CliOptions } from './cli-args.js';
import { resolveTreeText } from './cli-input.js';
import { CliError } from './cli-error.js';
import { RenderError } from '../engine/error.js';
import { render } from '../index.js';
import { renderFallback } from '../engine/fallback.js';

export interface CliIO {
  argv: string[];
  stdin: string | null;
  stdout: (s: string) => void;
  stderr: (s: string) => void;
}

export function runCli(io: CliIO): number {
  let options: CliOptions;
  try {
    options = parseArgs(io.argv);
  } catch {
    io.stderr(`${USAGE}\n`);
    return 1;
  }

  if (options.help) {
    io.stdout(`${USAGE}\n`);
    return 0;
  }

  try {
    const stdin = io.stdin !== null && io.stdin.trim() !== '' ? io.stdin : null;
    const tree = resolveTreeText({ text: options.text, file: options.file, stdin });
    const svg = render(tree, { legend: options.legend });
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
  } catch (err) {
    if (err instanceof CliError || err instanceof RenderError) {
      io.stderr(`${err.message}\n`);
      return 1;
    }
    throw err;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const stdin = process.stdin.isTTY ? null : readFileSync(0, 'utf8');
  process.exit(
    runCli({
      argv: process.argv.slice(2),
      stdin,
      stdout: (s) => process.stdout.write(s),
      stderr: (s) => process.stderr.write(s),
    }),
  );
}
