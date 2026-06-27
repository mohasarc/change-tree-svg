import { describe, it, expect } from 'vitest';
import { renderFallback } from './fallback.js';
import { legendPlainText } from './legend.js';

const LEGEND_LINE = '++ added   ** changed   ~~ moved   -- removed';

describe('renderFallback', () => {
  it('tree + blank line + legend, no trailing newline', () => {
    expect(renderFallback('.\n└── ++ a.ts')).toBe(
      `.\n└── ++ a.ts\n\n${LEGEND_LINE}`,
    );
  });

  it('legend line equals the spec line', () => {
    expect(legendPlainText()).toBe(LEGEND_LINE);
    expect(renderFallback('x').endsWith(`\n\n${LEGEND_LINE}`)).toBe(true);
  });

  it('legend:false → normalized tree only, no blank line, no legend', () => {
    expect(renderFallback('.\n└── ++ a.ts', { legend: false })).toBe(
      '.\n└── ++ a.ts',
    );
  });

  it('strips a single trailing newline', () => {
    expect(renderFallback('x\n')).toBe(`x\n\n${LEGEND_LINE}`);
  });

  it('authored trailing blank line survives', () => {
    expect(renderFallback('x\n\n')).toBe(`x\n\n\n${LEGEND_LINE}`);
  });

  it('verbatim fidelity of indentation, glyphs, markers, comments', () => {
    const tree = '.\n├── ++ src/a.ts # new\n└── ** src/b.ts';
    expect(renderFallback(tree, { legend: false })).toBe(tree);
  });
});
