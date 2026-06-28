import { describe, it, expect } from 'vitest';
import { parseLines } from './parse.js';
import { measure } from './layout.js';
import { renderSvg, renderInner, djb2 } from './render.js';
import { H_PADDING } from './palette.js';
import type { RenderOptions } from './types.js';

function render(lines: string[], options: RenderOptions = {}): string {
  const input = lines.join('\n');
  const parsed = parseLines(input);
  const metrics = measure(parsed, options);
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

  it('default render omits the <rect background', () => {
    expect(render(['++ src/a.ts'])).not.toContain('<rect');
  });

  it('container:true draws the <rect panel with --ct-fill and rx="8"', () => {
    const svg = render(['++ src/a.ts'], { container: true });
    expect(svg).toContain('<rect');
    expect(svg).toContain('var(--ct-fill)');
    expect(svg).toContain('rx="8"');
  });

  it('default text starts at content origin x="0"', () => {
    expect(render(['++ src/a.ts'])).toContain('<text x="0"');
  });

  it('container:true insets text by H_PADDING', () => {
    expect(render(['++ src/a.ts'], { container: true })).toContain(`<text x="${H_PADDING}"`);
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

describe('renderInner', () => {
  function inner(lines: string[], options = {}): string {
    const parsed = parseLines(lines.join('\n'));
    return renderInner(parsed, measure(parsed, options));
  }

  it('contains the <style> block', () => {
    expect(inner(['.'])).toContain('<style>');
  });

  it('emits one <text per line (legend off)', () => {
    const lines = ['++ src/a.ts', '', '** src/b.ts'];
    const parsed = parseLines(lines.join('\n'));
    const svgInner = renderInner(parsed, measure(parsed, { legend: false }));
    const count = (svgInner.match(/<text /g) ?? []).length;
    expect(count).toBe(parsed.length);
  });

  it('contains no <svg, <rect, or <title wrapper', () => {
    const svgInner = inner(['++ src/a.ts']);
    expect(svgInner).not.toContain('<svg');
    expect(svgInner).not.toContain('<rect');
    expect(svgInner).not.toContain('<title');
  });
});
