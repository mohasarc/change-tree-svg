import { describe, expect, it } from 'vitest';
import { RenderError } from './error.js';
import { measure } from './layout.js';
import { parseLines } from './parse.js';
import {
  bodyEndChars,
  commentColumnChars,
  legendLengthChars,
  lineEndChars,
} from './geometry.js';
import {
  CHAR_WIDTH,
  COMMENT_GAP,
  COMMENT_OUTLIER_DELTA,
  DEFAULT_MAX_LINE_WIDTH,
  FONT_SIZE,
  H_PADDING,
  LEGEND_GAP,
  LINE_HEIGHT,
  ORIGIN_NUDGE,
  V_PADDING,
} from './palette.js';
import type { ParsedLine } from './types.js';

const DESCENT = 0.3 * FONT_SIZE;

function makeLine(raw: string): ParsedLine {
  return { raw, prefix: '', marker: null, body: raw.trim(), comment: null };
}

// tree lines wider than the 45-char legend so the tree drives bare width
const wideTree = ['.', '├── src/some/deeply/nested/path/to/file.controller.ts', '└── short.ts'];

describe('measure', () => {
  it('default (bare) canvas: ORIGIN_NUDGE text origin, descent-allowance v-padding', () => {
    const lines = wideTree.map(makeLine);
    const metrics = measure(lines, {});

    const maxChars = Math.max(...lines.map((l) => l.raw.trimEnd().length));
    expect(metrics.canvasWidth).toBe(Math.ceil(maxChars * CHAR_WIDTH));
    expect(metrics.canvasHeight).toBe((lines.length + 2) * LINE_HEIGHT + 2 * DESCENT);
    expect(metrics.lineHeight).toBe(LINE_HEIGHT);
    expect(metrics.charWidth).toBe(CHAR_WIDTH);
    expect(metrics.hPadding).toBe(ORIGIN_NUDGE);
    expect(metrics.vPadding).toBe(DESCENT);
    expect(metrics.container).toBe(false);
    expect(metrics.legendGap).toBe(LEGEND_GAP);
  });

  it('container:true restores the H_PADDING/V_PADDING panel dimensions', () => {
    const lines = wideTree.map(makeLine);
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
    const lines = ['abc'].map(makeLine);
    const metrics = measure(lines, { legend: false });
    const raw = 3 * CHAR_WIDTH;
    expect(Number.isInteger(raw)).toBe(false);
    expect(metrics.canvasWidth).toBe(Math.ceil(raw));
  });

  it('blank lines count toward height but not max-width check', () => {
    const lines = ['src/', '', '└── bar.ts'].map(makeLine);
    const metrics = measure(lines, { legend: false });
    expect(metrics.canvasHeight).toBe(lines.length * LINE_HEIGHT + 2 * DESCENT);
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

  it('bare canvasWidth hugs rendered geometry, below raw author padding', () => {
    const input = [
      '.',
      '++ src/foo.ts            # added the foo module',
      '** src/bar.ts            # tweaked bar',
    ].join('\n');
    const lines = parseLines(input);
    const metrics = measure(lines, { legend: false });

    const columnChars = commentColumnChars(lines, COMMENT_OUTLIER_DELTA, COMMENT_GAP);
    const maxLineEnd = Math.max(...lines.map((l) => lineEndChars(l, columnChars, COMMENT_GAP)));
    const maxRaw = Math.max(...lines.map((l) => l.raw.trimEnd().length));

    expect(metrics.canvasWidth).toBe(Math.ceil(maxLineEnd * CHAR_WIDTH));
    expect(metrics.canvasWidth).toBeLessThan(Math.ceil(maxRaw * CHAR_WIDTH));
  });

  it('legend is counted in width when it is the widest line', () => {
    const lines = parseLines(['.', '++ a.ts'].join('\n'));
    const withLegend = measure(lines, {});
    const withoutLegend = measure(lines, { legend: false });

    expect(withLegend.canvasWidth).toBe(Math.ceil(legendLengthChars() * CHAR_WIDTH));
    expect(withoutLegend.canvasWidth).toBeLessThan(withLegend.canvasWidth);
  });

  it('exposes commentColumnChars matching geometry for a multi-comment tree', () => {
    const lines = parseLines(
      ['++ aa.ts # x', '** bbbb.ts # y', '-- c.ts # z'].join('\n'),
    );
    const metrics = measure(lines, { legend: false });
    expect(metrics.commentColumnChars).toBe(
      commentColumnChars(lines, COMMENT_OUTLIER_DELTA, COMMENT_GAP),
    );
    expect(metrics.commentColumnChars).not.toBeNull();
  });

  it('an uncommented tree has null column and bodyEnd-based width', () => {
    const lines = parseLines(['.', '++ src/a.ts', '** src/b.ts'].join('\n'));
    const metrics = measure(lines, { legend: false });
    const maxBodyEnd = Math.max(...lines.map(bodyEndChars));
    expect(metrics.commentColumnChars).toBeNull();
    expect(metrics.canvasWidth).toBe(Math.ceil(maxBodyEnd * CHAR_WIDTH));
  });
});
