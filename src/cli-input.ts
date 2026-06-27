import { readFileSync } from 'node:fs';
import { CliError } from './cli-error.js';

export interface TreeInputSources {
  text: string | null;
  file: string | null;
  stdin: string | null;
}

export function resolveTreeText(sources: TreeInputSources): string {
  const present = [sources.text, sources.file, sources.stdin].filter(
    (source) => source !== null,
  );
  if (present.length >= 2) {
    throw new CliError('exactly one Change Tree input must be provided');
  }
  if (present.length === 0) {
    throw new CliError('Change Tree input is required');
  }

  const content = readContent(sources);
  if (content.trim() === '') {
    throw new CliError('Change Tree input is required');
  }
  return content;
}

function readContent(sources: TreeInputSources): string {
  if (sources.text !== null) return sources.text;
  if (sources.stdin !== null) return sources.stdin;
  const path = sources.file as string;
  try {
    return readFileSync(path, 'utf8');
  } catch {
    throw new CliError(`Change Tree file could not be read: ${path}`);
  }
}
