import { describe, expect, it } from 'vitest';
import { RenderError } from './error.js';
import { measure } from './layout.js';
import {
  CHAR_WIDTH,
  DEFAULT_MAX_LINE_WIDTH,
  FONT_SIZE,
  H_PADDING,
  LEGEND_GAP,
  LINE_HEIGHT,
  V_PADDING,
} from './palette.js';
import type { ParsedLine } from './types.js';

const DESCENT = 0.3 * FONT_SIZE;

function makeLine(raw: string): ParsedLine {
  return { raw, prefix: '', marker: null, body: raw.trim(), comment: null };
}

describe('measure', () => {
  it('default (bare) canvas: no h-padding, descent-allowance v-padding', () => {
    const lines = ['src/', '├── foo.ts', '└── bar.ts'].map(makeLine);
    const metrics = measure(lines, {});

    const maxChars = Math.max(...lines.map((l) => l.raw.trimEnd().length));
    expect(metrics.canvasWidth).toBe(Math.ceil(maxChars * CHAR_WIDTH));
    expect(metrics.canvasHeight).toBe((lines.length + 2) * LINE_HEIGHT + 2 * DESCENT);
    expect(metrics.lineHeight).toBe(LINE_HEIGHT);
    expect(metrics.charWidth).toBe(CHAR_WIDTH);
    expect(metrics.hPadding).toBe(0);
    expect(metrics.vPadding).toBe(DESCENT);
    expect(metrics.container).toBe(false);
    expect(metrics.legendGap).toBe(LEGEND_GAP);
  });

  it('container:true restores the H_PADDING/V_PADDING panel dimensions', () => {
    const lines = ['src/', '├── foo.ts', '└── bar.ts'].map(makeLine);
    const metrics = measure(lines, { container: true });

    const maxChars = Math.max(...lines.map((l) => l.raw.trimEnd().length));
    expect(metrics.canvasWidth).toBe(Math.ceil(maxChars * CHAR_WIDTH + 2 * H_PADDING));
    expect(metrics.canvasHeight).toBe((lines.length + 2) * LINE_HEIGHT + 2 * V_PADDING);
    expect(metrics.hPadding).toBe(H_PADDING);
    expect(metrics.vPadding).toBe(V_PADDING);
    expect(metrics.container).toBe(true);
  });

  it('bare canvasHeight keeps the last line descenders inside the box', () => {
    const lines = ['src/', '└── bar.ts'].map(makeLine);
    const metrics = measure(lines, { legend: false });
    const lastBaseline = metrics.vPadding + lines.length * metrics.lineHeight;
    expect(metrics.canvasHeight).toBeGreaterThanOrEqual(lastBaseline + 0.2 * FONT_SIZE);
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

  it('canvasWidth uses Math.ceil for fractional-width lines (bare)', () => {
    // CHAR_WIDTH = 10.8; 3-char bare line → 3 * 10.8 = 32.4 → ceil → 33
    const lines = ['abc'].map(makeLine);
    const metrics = measure(lines, {});
    const raw = 3 * CHAR_WIDTH;
    expect(Number.isInteger(raw)).toBe(false);
    expect(metrics.canvasWidth).toBe(Math.ceil(raw));
  });

  it('blank lines count toward height but not max-width check', () => {
    const lines = ['src/', '', '└── bar.ts'].map(makeLine);
    const metrics = measure(lines, {});
    expect(metrics.canvasHeight).toBe((lines.length + 2) * LINE_HEIGHT + 2 * DESCENT);
    const maxChars = Math.max(
      ...[lines[0], lines[2]].map((l) => l.raw.trimEnd().length),
    );
    expect(metrics.canvasWidth).toBe(Math.ceil(maxChars * CHAR_WIDTH));
  });

  it('respects custom maxLineWidth option', () => {
    const line = 'a'.repeat(10);
    const lines = [line].map(makeLine);
    expect(() => measure(lines, { maxLineWidth: 9 })).toThrow('too wide');
    expect(() => measure(lines, { maxLineWidth: 10 })).not.toThrow();
  });

  it('legend:false shrinks canvasHeight by the two reserved rows and sets metrics.legend false', () => {
    const lines = ['src/', '├── foo.ts', '└── bar.ts'].map(makeLine);
    const withLegend = measure(lines, {});
    const withoutLegend = measure(lines, { legend: false });
    expect(withLegend.canvasHeight - withoutLegend.canvasHeight).toBeCloseTo(2 * LINE_HEIGHT);
    expect(withoutLegend.legend).toBe(false);
  });

  it('default and legend:true set metrics.legend true with bare height', () => {
    const lines = ['src/', '└── bar.ts'].map(makeLine);
    const bareHeight = (lines.length + 2) * LINE_HEIGHT + 2 * DESCENT;
    const defaulted = measure(lines, {});
    const explicit = measure(lines, { legend: true });
    expect(defaulted.legend).toBe(true);
    expect(explicit.legend).toBe(true);
    expect(defaulted.canvasHeight).toBe(bareHeight);
    expect(explicit.canvasHeight).toBe(bareHeight);
  });
});
