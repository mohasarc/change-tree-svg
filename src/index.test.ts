import { describe, it, expect } from 'vitest';
import { render, RenderError } from './index.js';

const SIMPLE_TREE = `.
├── ++ src/index.ts # new entry
├── ** src/parse.ts
├── ~~ src/layout.ts # moved from lib/
└── -- src/old.ts`;

describe('render() — fidelity', () => {
  it('preserves raw text of each line in SVG output', () => {
    const svg = render(SIMPLE_TREE);
    expect(svg).toContain('src/index.ts');
    expect(svg).toContain('src/parse.ts');
    expect(svg).toContain('src/layout.ts');
    expect(svg).toContain('src/old.ts');
  });
});

describe('render() — marker coloring', () => {
  it('++ marker uses --ct-added', () => {
    const svg = render('++ src/new.ts');
    expect(svg).toContain('--ct-added');
  });

  it('** marker uses --ct-changed', () => {
    const svg = render('** src/changed.ts');
    expect(svg).toContain('--ct-changed');
  });

  it('~~ marker uses --ct-moved', () => {
    const svg = render('~~ src/moved.ts');
    expect(svg).toContain('--ct-moved');
  });

  it('-- marker uses --ct-removed', () => {
    const svg = render('-- src/removed.ts');
    expect(svg).toContain('--ct-removed');
  });
});

describe('render() — muting', () => {
  it('branch glyphs appear in --ct-muted tspan', () => {
    const svg = render('├── ** src/file.ts');
    expect(svg).toContain('fill="var(--ct-muted)">├──');
  });

  it('comments appear in --ct-muted tspan', () => {
    const svg = render('** src/file.ts # a comment');
    expect(svg).toContain('fill="var(--ct-muted)"> # a comment');
  });
});

describe('render() — light/dark theming', () => {
  it('contains @media (prefers-color-scheme: dark)', () => {
    const svg = render('** src/file.ts');
    expect(svg).toContain('@media (prefers-color-scheme: dark)');
  });

  it('contains light and dark --ct-fill values', () => {
    const svg = render('** src/file.ts');
    // light fill
    expect(svg).toContain('rgba(246,248,250,0.85)');
    // dark fill
    expect(svg).toContain('rgba(22,27,34,0.85)');
  });
});

describe('render() — legend', () => {
  it('contains legend segments', () => {
    const svg = render('** src/file.ts');
    expect(svg).toContain('++ added');
    expect(svg).toContain('** changed');
    expect(svg).toContain('~~ moved');
    expect(svg).toContain('-- removed');
  });
});

describe('render() — accessibility', () => {
  it('has role="img"', () => {
    const svg = render('** src/file.ts');
    expect(svg).toContain('role="img"');
  });

  it('has a non-empty <title> element', () => {
    const svg = render('** src/file.ts');
    expect(svg).toMatch(/<title[^>]*>[^<]+<\/title>/);
  });

  it('<desc> mentions all four markers', () => {
    const svg = render('** src/file.ts');
    const descMatch = svg.match(/<desc[^>]*>([\s\S]*?)<\/desc>/);
    expect(descMatch).not.toBeNull();
    const desc = descMatch![1];
    expect(desc).toContain('++');
    expect(desc).toContain('**');
    expect(desc).toContain('~~');
    expect(desc).toContain('--');
  });

  it('aria-labelledby references title and desc ids', () => {
    const svg = render('** src/file.ts');
    const labelMatch = svg.match(/aria-labelledby="([^"]+)"/);
    expect(labelMatch).not.toBeNull();
    const ids = labelMatch![1].split(' ');
    expect(ids.length).toBe(2);
    const titleMatch = svg.match(/id="([^"]+)"[^>]*>Change Tree</);
    const descMatch = svg.match(/<desc id="([^"]+)"/);
    expect(titleMatch).not.toBeNull();
    expect(descMatch).not.toBeNull();
    expect(ids).toContain(titleMatch![1]);
    expect(ids).toContain(descMatch![1]);
  });
});

describe('render() — rejection', () => {
  it('render("") throws RenderError with reason "empty tree"', () => {
    expect(() => render('')).toThrow(RenderError);
    try { render(''); } catch (e) {
      expect(e).toBeInstanceOf(RenderError);
      expect((e as RenderError).reason).toBe('empty tree');
    }
  });

  it('render("\\n\\n") throws RenderError with reason "empty tree"', () => {
    expect(() => render('\n\n')).toThrow(RenderError);
    try { render('\n\n'); } catch (e) {
      expect(e).toBeInstanceOf(RenderError);
      expect((e as RenderError).reason).toBe('empty tree');
    }
  });

  it('a line longer than maxLineWidth throws RenderError with reason containing "too wide"', () => {
    const longLine = '** ' + 'x'.repeat(130);
    expect(() => render(longLine, { maxLineWidth: 120 })).toThrow(RenderError);
    try { render(longLine, { maxLineWidth: 120 }); } catch (e) {
      expect(e).toBeInstanceOf(RenderError);
      expect((e as RenderError).reason).toContain('too wide');
    }
  });

  it('thrown error is instanceof RenderError', () => {
    expect(() => render('')).toThrow(RenderError);
  });

  it('error message starts with "Cannot render tree:"', () => {
    try { render(''); } catch (e) {
      expect((e as Error).message).toMatch(/^Cannot render tree:/);
    }
  });
});

describe('render() — edge cases from spec', () => {
  it('tree with no status markers still renders tree and legend', () => {
    const svg = render('.\n└── src/\n    └── file.ts');
    expect(svg).toContain('<svg');
    expect(svg).toContain('++ added');
  });

  it('non-marker line with inline comment renders entire line in --ct-path', () => {
    const svg = render('src/ # top-level');
    expect(svg).toContain('fill="var(--ct-path)">src/ # top-level');
  });

  it('marker-like string inside a # comment treated as comment text, not marker', () => {
    const svg = render('src/file.ts # ++ not a marker');
    // The full line is rendered as a path tspan (no marker split)
    expect(svg).toContain('fill="var(--ct-path)">src/file.ts # ++ not a marker');
  });

  it('marker-like string in the middle of a path treated as path text', () => {
    const svg = render('src/some--path.ts');
    // The full line is rendered as a path tspan (no marker split)
    expect(svg).toContain('fill="var(--ct-path)">src/some--path.ts');
  });

  it('same input produces identical output (determinism)', () => {
    const input = '** src/file.ts # changed';
    expect(render(input)).toBe(render(input));
  });
});
