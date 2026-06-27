import { describe, expect, it } from 'vitest';
import { parseLines } from './parse.js';

describe('parseLines', () => {
  it('parses a ++ added marker line', () => {
    const [line] = parseLines('├── ++ src/foo.ts # new file');
    expect(line.marker).toBe('++');
    expect(line.prefix).toBe('├── ');
    expect(line.body).toBe('src/foo.ts');
    expect(line.comment).toBe('# new file');
    expect(line.raw).toBe('├── ++ src/foo.ts # new file');
  });

  it('parses a ** changed marker line', () => {
    const [line] = parseLines('│   ** src/bar.ts');
    expect(line.marker).toBe('**');
    expect(line.prefix).toBe('│   ');
    expect(line.body).toBe('src/bar.ts');
    expect(line.comment).toBeNull();
  });

  it('parses a ~~ moved marker line', () => {
    const [line] = parseLines('└── ~~ context/ # moved from apps/cli/context/');
    expect(line.marker).toBe('~~');
    expect(line.prefix).toBe('└── ');
    expect(line.body).toBe('context/');
    expect(line.comment).toBe('# moved from apps/cli/context/');
  });

  it('parses a -- removed marker line', () => {
    const [line] = parseLines('└── -- old.ts');
    expect(line.marker).toBe('--');
    expect(line.prefix).toBe('└── ');
    expect(line.body).toBe('old.ts');
    expect(line.comment).toBeNull();
  });

  it('does not detect marker inside a comment', () => {
    const [line] = parseLines('src/foo.ts # ++ added accidentally');
    expect(line.marker).toBeNull();
    expect(line.body).toBe('src/foo.ts # ++ added accidentally');
    expect(line.comment).toBeNull();
  });

  it('does not detect -- as marker when embedded mid-path', () => {
    const [line] = parseLines('some-path--with-dashes.ts');
    expect(line.marker).toBeNull();
    expect(line.body).toBe('some-path--with-dashes.ts');
  });

  it('parses a marker followed by ellipsis group text', () => {
    const [line] = parseLines('└── ++ ... 12 files # generated fixtures');
    expect(line.marker).toBe('++');
    expect(line.prefix).toBe('└── ');
    expect(line.body).toBe('... 12 files');
    expect(line.comment).toBe('# generated fixtures');
  });

  it('parses an empty line', () => {
    const [line] = parseLines('');
    expect(line).toEqual({ raw: '', prefix: '', marker: null, body: '', comment: null });
  });

  it('parses a plain path line with no marker or comment', () => {
    const [line] = parseLines('src/components/Button.tsx');
    expect(line.marker).toBeNull();
    expect(line.body).toBe('src/components/Button.tsx');
    expect(line.comment).toBeNull();
    expect(line.prefix).toBe('');
  });

  it('preserves raw field exactly for every case', () => {
    const inputs = [
      '├── ++ src/foo.ts # new file',
      'some-path--with-dashes.ts',
      '',
      '└── ~~ context/ # moved from apps/cli/context/',
    ];
    const lines = parseLines(inputs.join('\n'));
    lines.forEach((line, i) => {
      expect(line.raw).toBe(inputs[i]);
    });
  });

  it('returns all lines including blanks when input has multiple lines', () => {
    const input = '├── ++ src/foo.ts\n\n└── -- old.ts';
    const lines = parseLines(input);
    expect(lines).toHaveLength(3);
    expect(lines[1].raw).toBe('');
    expect(lines[1].marker).toBeNull();
  });
});
