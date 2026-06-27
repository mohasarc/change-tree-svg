import { describe, expect, it } from 'vitest';
import { RenderError } from './error.js';
import { measure } from './layout.js';
import {
  CHAR_WIDTH,
  DEFAULT_MAX_LINE_WIDTH,
  H_PADDING,
  LEGEND_GAP,
  LINE_HEIGHT,
  V_PADDING,
} from './palette.js';
import type { ParsedLine } from './types.js';

function makeLine(raw: string): ParsedLine {
  return { raw, prefix: '', marker: null, body: raw.trim(), comment: null };
}

describe('measure', () => {
  it('returns consistent canvas dimensions for a 3-line valid tree', () => {
    const lines = ['src/', '├── foo.ts', '└── bar.ts'].map(makeLine);
    const metrics = measure(lines, {});

    const maxChars = Math.max(...lines.map((l) => l.raw.trimEnd().length));
    expect(metrics.canvasWidth).toBe(Math.ceil(maxChars * CHAR_WIDTH + 2 * H_PADDING));
    expect(metrics.canvasHeight).toBe((lines.length + 2) * LINE_HEIGHT + 2 * V_PADDING);
    expect(metrics.lineHeight).toBe(LINE_HEIGHT);
    expect(metrics.charWidth).toBe(CHAR_WIDTH);
    expect(metrics.hPadding).toBe(H_PADDING);
    expect(metrics.vPadding).toBe(V_PADDING);
    expect(metrics.legendGap).toBe(LEGEND_GAP);
  });

  it('throws RenderError with reason "empty tree" for all-blank input', () => {
    const lines = ['', '  ', '\t'].map(makeLine);
    expect(() => measure(lines, {})).toThrow(RenderError);
    expect(() => measure(lines, {})).toThrow('empty tree');
  });

  it('throws RenderError containing "too wide" when a line exceeds maxLineWidth', () => {
    const longLine = 'a'.repeat(121);
    const lines = ['src/', longLine].map(makeLine);
    expect(() => measure(lines, {})).toThrow('too wide');
  });

  it('does not throw when a line is exactly maxLineWidth chars', () => {
    const line = 'a'.repeat(DEFAULT_MAX_LINE_WIDTH);
    const lines = [line].map(makeLine);
    expect(() => measure(lines, {})).not.toThrow();
  });

  it('canvasWidth uses Math.ceil for fractional-width lines', () => {
    // CHAR_WIDTH = 10.8; 3-char line → 3 * 10.8 + 2 * 21 = 32.4 + 42 = 74.4 → ceil → 75
    const lines = ['abc'].map(makeLine);
    const metrics = measure(lines, {});
    const raw = 3 * CHAR_WIDTH + 2 * H_PADDING;
    expect(Number.isInteger(raw)).toBe(false);
    expect(metrics.canvasWidth).toBe(Math.ceil(raw));
  });

  it('blank lines count toward height but not max-width check', () => {
    const lines = ['src/', '', '└── bar.ts'].map(makeLine);
    const metrics = measure(lines, {});
    expect(metrics.canvasHeight).toBe((lines.length + 2) * LINE_HEIGHT + 2 * V_PADDING);
    const maxChars = Math.max(
      ...[lines[0], lines[2]].map((l) => l.raw.trimEnd().length),
    );
    expect(metrics.canvasWidth).toBe(Math.ceil(maxChars * CHAR_WIDTH + 2 * H_PADDING));
  });

  it('respects custom maxLineWidth option', () => {
    const line = 'a'.repeat(10);
    const lines = [line].map(makeLine);
    expect(() => measure(lines, { maxLineWidth: 9 })).toThrow('too wide');
    expect(() => measure(lines, { maxLineWidth: 10 })).not.toThrow();
  });
});
