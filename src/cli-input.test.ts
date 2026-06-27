import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveTreeText } from './cli-input.js';
import { CliError } from './cli-error.js';

const base = { text: null, file: null, stdin: null };

describe('resolveTreeText', () => {
  let dir: string;
  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'cli-input-'));
  });
  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('only --text returns its content', () => {
    expect(resolveTreeText({ ...base, text: 'a\nb' })).toBe('a\nb');
  });

  it('only stdin returns its content', () => {
    expect(resolveTreeText({ ...base, stdin: '.\n└── ++ a.ts' })).toBe('.\n└── ++ a.ts');
  });

  it('only --file returns file content', () => {
    const path = join(dir, 'tree.txt');
    writeFileSync(path, '.\n└── ++ a.ts');
    expect(resolveTreeText({ ...base, file: path })).toBe('.\n└── ++ a.ts');
  });

  it('two modes present throws collision error', () => {
    expect(() => resolveTreeText({ ...base, text: 'a', stdin: 'b' })).toThrow(
      new CliError('exactly one Change Tree input must be provided'),
    );
  });

  it('no mode present throws required error', () => {
    expect(() => resolveTreeText({ ...base })).toThrow(
      new CliError('Change Tree input is required'),
    );
  });

  it('whitespace-only text throws required error', () => {
    expect(() => resolveTreeText({ ...base, text: '   ' })).toThrow(
      new CliError('Change Tree input is required'),
    );
  });

  it('unreadable file throws read error', () => {
    const path = join(dir, 'missing.txt');
    expect(() => resolveTreeText({ ...base, file: path })).toThrow(
      new CliError('Change Tree file could not be read: ' + path),
    );
  });

  it('empty file throws required error', () => {
    const path = join(dir, 'empty.txt');
    writeFileSync(path, '   \n');
    expect(() => resolveTreeText({ ...base, file: path })).toThrow(
      new CliError('Change Tree input is required'),
    );
  });
});
