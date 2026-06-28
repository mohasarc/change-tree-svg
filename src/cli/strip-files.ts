import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export function stripFileNames(dir: string): string[] {
  return readdirSync(dir)
    .map((name) => ({ name, index: stripIndex(name) }))
    .filter((entry) => entry.index !== null)
    .sort((a, b) => (a.index as number) - (b.index as number))
    .map((entry) => entry.name);
}

export function readStrips(dir: string): string[] {
  return stripFileNames(dir).map((name) => readFileSync(join(dir, name), 'utf8'));
}

function stripIndex(name: string): number | null {
  const match = /^p(\d+)\.svg$/.exec(name);
  return match ? Number(match[1]) : null;
}
