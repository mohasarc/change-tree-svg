import { describe, it, expect } from 'vitest';
import { slice } from './slice.js';
import { parseLines } from './parse.js';
import { measure } from './layout.js';
import { DEFAULT_STRIP_WIDTH } from './palette.js';

const wide = ['.', '++ src/some/deeply/nested/path/to/a/changed/file.ts # added'].join('\n');
const narrow = '++ a.ts';

function bareMetrics(input: string) {
  const parsed = parseLines(input);
  return measure(parsed, { container: false });
}

function viewBox(strip: string): string {
  return strip.match(/viewBox="([^"]+)"/)![1];
}

function attr(strip: string, name: string): string {
  return strip.match(new RegExp(`\\b${name}="([^"]+)"`))![1];
}

function inner(strip: string): string {
  return strip.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
}

describe('slice', () => {
  it('tree wider than stripWidth yields ceil(totalWidth / stripWidth) strips', () => {
    const { canvasWidth } = bareMetrics(wide);
    const strips = slice(wide);
    expect(canvasWidth).toBeGreaterThan(DEFAULT_STRIP_WIDTH);
    expect(strips.length).toBe(Math.ceil(canvasWidth / DEFAULT_STRIP_WIDTH));
  });

  it('tree narrower than stripWidth yields exactly one strip', () => {
    expect(bareMetrics(narrow).canvasWidth).toBeLessThan(DEFAULT_STRIP_WIDTH);
    expect(slice(narrow).length).toBe(1);
  });

  it('every strip starts with <svg, width <= stripWidth, identical height, carries <style>', () => {
    const strips = slice(wide);
    const heights = new Set<string>();
    for (const strip of strips) {
      expect(strip).toMatch(/^<svg/);
      expect(Number(attr(strip, 'width'))).toBeLessThanOrEqual(DEFAULT_STRIP_WIDTH);
      expect(strip).toContain('<style>');
      heights.add(attr(strip, 'height'));
    }
    expect(heights.size).toBe(1);
  });

  it('strip i viewBox x-offset = i * windowWidth', () => {
    const { canvasHeight } = bareMetrics(wide);
    const strips = slice(wide);
    strips.forEach((strip, i) => {
      const [x, y, , h] = viewBox(strip).split(' ');
      expect(Number(x)).toBe(i * DEFAULT_STRIP_WIDTH);
      expect(y).toBe('0');
      expect(Number(h)).toBe(canvasHeight);
    });
  });

  it('inner content is byte-identical across strips', () => {
    const strips = slice(wide);
    const inners = strips.map(inner);
    for (const body of inners) expect(body).toBe(inners[0]);
  });

  it('no <rect> in any strip', () => {
    for (const strip of slice(wide)) expect(strip).not.toContain('<rect');
  });

  it('determinism — same input+options → identical array', () => {
    expect(slice(wide, { stripWidth: 200 })).toEqual(slice(wide, { stripWidth: 200 }));
  });

  it('height option scales the box uniformly; viewBox window unchanged', () => {
    const { canvasHeight } = bareMetrics(wide);
    const native = slice(wide);
    const scaled = slice(wide, { height: Math.round(canvasHeight / 2) });
    expect(scaled.length).toBe(native.length);
    native.forEach((strip, i) => {
      expect(viewBox(scaled[i])).toBe(viewBox(strip));
      const ratio = Number(attr(scaled[i], 'width')) / Number(attr(strip, 'width'));
      expect(ratio).toBeLessThan(1);
      expect(Number(attr(scaled[i], 'height'))).toBeLessThan(Number(attr(strip, 'height')));
    });
  });
});
