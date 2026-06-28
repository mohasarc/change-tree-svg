#!/usr/bin/env node
import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseArgs, USAGE, type CliOptions } from './cli-args.js';
import { CliError } from './cli-error.js';
import { RenderError } from '../engine/error.js';
import { renderCommand } from './commands/render.js';
import { sliceCommand } from './commands/slice.js';
import { markupCommand } from './commands/markup.js';

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
    return dispatch(io, options);
  } catch (err) {
    if (err instanceof CliError || err instanceof RenderError) {
      io.stderr(`${err.message}\n`);
      return 1;
    }
    throw err;
  }
}

function dispatch(io: CliIO, options: CliOptions): number {
  switch (options.command) {
    case 'slice':
      return sliceCommand(io, options);
    case 'markup':
      return markupCommand(io, options);
    default:
      return renderCommand(io, options);
  }
}

function invokedDirectly(): boolean {
  const entry = process.argv[1];
  if (entry === undefined) return false;
  try {
    return realpathSync(entry) === fileURLToPath(import.meta.url);
  } catch {
    return entry === fileURLToPath(import.meta.url);
  }
}

if (invokedDirectly()) {
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
