import { describe, expect, it } from 'vitest';
import {
  bodyEndChars,
  commentColumnChars,
  commentStartChars,
  legendLengthChars,
  lineEndChars,
} from './geometry.js';
import { COMMENT_GAP, COMMENT_OUTLIER_DELTA } from './palette.js';
import { legendPlainText } from './legend.js';
import type { ParsedLine } from './types.js';

function markerLine(body: string, comment: string | null): ParsedLine {
  return {
    raw: `++ ${body}${comment ? ` ${comment}` : ''}`,
    prefix: '',
    marker: '++',
    body,
    comment,
  };
}

function bodyOfLength(length: number, comment: string | null): ParsedLine {
  return markerLine('x'.repeat(length - 3), comment);
}

describe('bodyEndChars', () => {
  it('counts prefix + marker + space + body on a marker line', () => {
    const line: ParsedLine = {
      raw: '├── ++ foo.ts',
      prefix: '├── ',
      marker: '++',
      body: 'foo.ts',
      comment: null,
    };
    expect(bodyEndChars(line)).toBe(4 + 2 + 1 + 6);
  });

  it('counts body length on a non-marker line', () => {
    const line: ParsedLine = {
      raw: 'src/',
      prefix: '',
      marker: null,
      body: 'src/',
      comment: null,
    };
    expect(bodyEndChars(line)).toBe(4);
  });
});

describe('commentColumnChars', () => {
  it('is null when no line carries a comment', () => {
    const lines = [markerLine('a.ts', null), markerLine('bb.ts', null)];
    expect(commentColumnChars(lines, COMMENT_OUTLIER_DELTA, COMMENT_GAP)).toBeNull();
  });

  it('is max(bodyEnd) + gap when all commented bodies are uniform', () => {
    const lines = [
      markerLine('alpha', '#one'),
      markerLine('bravo', '#two'),
      markerLine('charl', '#three'),
    ];
    const maxEnd = Math.max(...lines.map(bodyEndChars));
    expect(commentColumnChars(lines, COMMENT_OUTLIER_DELTA, COMMENT_GAP)).toBe(maxEnd + COMMENT_GAP);
  });

  it('excludes a long outlier past the median + delta', () => {
    const lines = [
      bodyOfLength(12, '#a'),
      bodyOfLength(13, '#b'),
      bodyOfLength(14, '#c'),
      bodyOfLength(41, '#d'),
    ];
    expect(commentColumnChars(lines, 8, COMMENT_GAP)).toBe(14 + COMMENT_GAP);
  });
});

describe('commentStartChars', () => {
  it('lands an aligned body on the column', () => {
    const line = bodyOfLength(10, '#x');
    expect(commentStartChars(line, 20, COMMENT_GAP)).toBe(20);
  });

  it('overflows a long body past the column', () => {
    const line = bodyOfLength(30, '#x');
    expect(commentStartChars(line, 20, COMMENT_GAP)).toBe(30 + COMMENT_GAP);
  });
});

describe('lineEndChars', () => {
  it('ends an aligned commented line at column + comment length', () => {
    const line = bodyOfLength(10, '#hello');
    expect(lineEndChars(line, 20, COMMENT_GAP)).toBe(20 + '#hello'.length);
  });

  it('ends an overflow commented line at bodyEnd + gap + comment length', () => {
    const line = bodyOfLength(30, '#hello');
    expect(lineEndChars(line, 20, COMMENT_GAP)).toBe(30 + COMMENT_GAP + '#hello'.length);
  });

  it('ends an uncommented line at bodyEnd', () => {
    const line = bodyOfLength(15, null);
    expect(lineEndChars(line, 20, COMMENT_GAP)).toBe(15);
  });
});

describe('legendLengthChars', () => {
  it('equals the plain legend string length', () => {
    expect(legendLengthChars()).toBe(legendPlainText().length);
  });
});
