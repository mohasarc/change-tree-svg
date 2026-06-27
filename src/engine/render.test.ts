import { describe, it, expect } from 'vitest';
import { parseLines } from './parse.js';
import { measure } from './layout.js';
import { renderSvg, djb2 } from './render.js';

function render(lines: string[]): string {
  const input = lines.join('\n');
  const parsed = parseLines(input);
  const metrics = measure(parsed, {});
  return renderSvg(parsed, metrics, djb2(input));
}

describe('renderSvg', () => {
  it('output starts with <svg', () => {
    expect(render(['.'])).toMatch(/^<svg/);
  });

  it('output contains role="img"', () => {
    expect(render(['.'])).toContain('role="img"');
  });

  it('output contains <title and <desc', () => {
    const svg = render(['.']);
    expect(svg).toContain('<title');
    expect(svg).toContain('<desc');
  });

  it('<desc> text names all four markers and mentions ... as authored summaries', () => {
    const svg = render(['.']);
    expect(svg).toContain('++ added');
    expect(svg).toContain('** changed');
    expect(svg).toContain('~~ moved');
    expect(svg).toContain('-- removed');
    expect(svg).toContain('...');
    expect(svg).toContain('authored summaries');
  });

  it('<style> block contains @media (prefers-color-scheme: dark)', () => {
    expect(render(['.'])).toContain('@media (prefers-color-scheme: dark)');
  });

  it('CSS custom property --ct-added appears in output', () => {
    expect(render(['.'])).toContain('--ct-added');
  });

  it('++ marker line → output contains added marker color variable', () => {
    expect(render(['++ src/new.ts'])).toContain('var(--ct-added)');
  });

  it('** marker line → output contains changed marker color variable', () => {
    expect(render(['** src/changed.ts'])).toContain('var(--ct-changed)');
  });

  it('~~ marker line → output contains moved marker color variable', () => {
    expect(render(['~~ src/moved.ts'])).toContain('var(--ct-moved)');
  });

  it('-- marker line → output contains removed marker color variable', () => {
    expect(render(['-- src/removed.ts'])).toContain('var(--ct-removed)');
  });

  it('comment → --ct-muted tspan wraps the comment text', () => {
    const svg = render(['++ src/foo.ts # added file']);
    expect(svg).toContain('<tspan fill="var(--ct-muted)"> # added file</tspan>');
  });

  it('branch glyph prefix → prefix tspan uses --ct-muted', () => {
    const svg = render(['└── ++ src/render.ts']);
    expect(svg).toContain('<tspan fill="var(--ct-muted)">└── </tspan>');
  });

  it('legend line appears in output', () => {
    expect(render(['.'])).toContain('++ added');
  });

  it('blank line in the middle → total <text> count equals lines.length + 1 (for legend)', () => {
    const lines = ['++ src/a.ts', '', '** src/b.ts'];
    const svg = render(lines);
    const parsed = parseLines(lines.join('\n'));
    const count = (svg.match(/<text /g) ?? []).length;
    expect(count).toBe(parsed.length + 1);
  });

  it('aria-labelledby references the same ids as <title> and <desc>', () => {
    const svg = render(['.']);
    const ariaMatch = svg.match(/aria-labelledby="([^"]+)"/);
    expect(ariaMatch).not.toBeNull();
    const [titleRef, descRef] = ariaMatch![1].split(' ');
    expect(svg).toContain(`id="${titleRef}"`);
    expect(svg).toContain(`id="${descRef}"`);
  });

  it('same input → identical output (determinism)', () => {
    const lines = ['++ src/foo.ts', '** src/bar.ts # changed'];
    expect(render(lines)).toBe(render(lines));
  });

  it('metrics.legend === false → no "++ added" legend text in output', () => {
    const input = '++ src/a.ts';
    const parsed = parseLines(input);
    const metrics = measure(parsed, { legend: false });
    const svg = renderSvg(parsed, metrics, djb2(input));
    expect(svg).not.toContain('<tspan fill="var(--ct-muted)"> added   </tspan>');
    expect(svg).toContain('var(--ct-added)');
  });
});
