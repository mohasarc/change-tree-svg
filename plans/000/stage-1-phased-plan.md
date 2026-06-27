# Stage 1 Phased Plan — Rendering Engine

Source of truth: [`stages.md`](stages.md) Stage 1 and [`change-tree-svg-functional-spec.md`](change-tree-svg-functional-spec.md).

Verification command (every phase must end green): `pnpm test && pnpm lint && pnpm typecheck`

---

## Agreed Decisions

| # | Decision |
|---|----------|
| 1 | Test runner: **vitest** |
| 2 | Linter: **ESLint v9** + `@typescript-eslint/recommended`, flat config (`eslint.config.js`) |
| 3 | Module system: **ESM-first** — `"type": "module"`, `module`/`moduleResolution`: `NodeNext`. Relative imports use `.js` extensions in source. |
| 4 | Build: **tsc direct**, no bundler. Single root `tsconfig.json`. `declaration: true`, `declarationMap: true`. |
| 5 | SVG generation: **raw string** via template literals. No SVG library. |
| 6 | Pipeline: `parseLines()` → `measure()` → `renderSvg()` → public `render()` |
| 7 | `ParsedLine`: `{ raw: string, prefix: string, marker: Marker \| null, body: string, comment: string \| null }` |
| 8 | Width: char count (`trimEnd().length`). `charWidth = 0.6 * fontSize`. `Math.ceil` canvas width. `DEFAULT_MAX_LINE_WIDTH = 120`. |
| 9 | Theming: CSS `@media (prefers-color-scheme: dark)` in embedded `<style>`. **7 CSS custom properties** per palette (container fill, path text, muted, `++`/`**`/`~~`/`--` marker colors). Light is default. GitHub Primer tokens. |
| 10 | Errors: `throw RenderError extends Error`. `name = 'RenderError'`, `message = 'Cannot render tree: <reason>.'`, `reason` field. Exported from `index.ts`. |
| 11 | File layout: `src/index.ts`, `src/parse.ts`, `src/layout.ts`, `src/render.ts`, `src/palette.ts`, `src/types.ts`, `src/error.ts`. Tests colocated as `*.test.ts`. |
| 12 | Accessibility: `<title id="ct-{hash}-title">` + `<desc id="ct-{hash}-desc">`, `role="img"`, `aria-labelledby="ct-{hash}-title ct-{hash}-desc"`. Hash is deterministic djb2 over input string. |
| 13 | Marker detection: `/^([ \t│├└─]*)(\+\+|\*\*|~~|--) (.+?)(?:\s+(#.+))?$/` per line. Marker-like text inside comments or mid-path is plain text. |
| 14 | Empty lines: pass through as `ParsedLine` with empty fields. Counted for height, not max-width. Zero non-empty lines → `RenderError("empty tree")`. |
| 15 | Legend: single `<text>` + colored/muted `<tspan>` per segment, ` ` spacers. `LEGEND_GAP` named constant. Always shown in Stage 1. |

---

## Phase 1 — Project Scaffold

**Goal:** Green `pnpm test && pnpm lint && pnpm typecheck` from a bare repo. Every later phase builds on this scaffold.

**Files to create:**

- `package.json` — name `change-tree-svg`, `"type": "module"`, scripts: `test`, `lint`, `typecheck`, `build`
- `tsconfig.json` — `NodeNext` module/resolution, `ES2022` target, `declaration: true`, `declarationMap: true`, `strict: true`, `outDir: dist`, includes `src/**/*.ts`
- `vitest.config.ts` — minimal config, covers `src/**/*.test.ts`
- `eslint.config.js` — flat config, `@typescript-eslint/recommended`, targets `src/**/*.ts`
- `src/index.ts` — empty placeholder (just a comment: `// Stage 1: exports added per phase`)

**devDependencies:**
- `typescript`
- `vitest`
- `@typescript-eslint/eslint-plugin`
- `@typescript-eslint/parser`
- `eslint`

**Done when:** `pnpm test` (zero tests, passes), `pnpm lint` (no violations on the placeholder), `pnpm typecheck` (no errors) all exit 0.

**Commit:** `chore: scaffold project — pnpm, TypeScript, vitest, ESLint`

---

## Phase 2 — Types, Error, Parser

**Goal:** Typed representation of a parsed Change Tree line and a working parser with full test coverage.

**Files to create/change:**

- `src/types.ts` — `Marker`, `ParsedLine`, `RenderOptions`, `LayoutMetrics` type declarations
- `src/error.ts` — `RenderError` class
- `src/parse.ts` — `parseLines(input: string): ParsedLine[]`
- `src/parse.test.ts` — tests listed below

**`src/types.ts` shape:**
```typescript
export type Marker = '++' | '**' | '~~' | '--';

export interface ParsedLine {
  raw: string;
  prefix: string;
  marker: Marker | null;
  body: string;
  comment: string | null;
}

export interface RenderOptions {
  maxLineWidth?: number;  // default DEFAULT_MAX_LINE_WIDTH (120)
}

export interface LayoutMetrics {
  lineHeight: number;
  charWidth: number;
  hPadding: number;
  vPadding: number;
  canvasWidth: number;
  canvasHeight: number;
  legendGap: number;
}
```

**`src/error.ts` shape:**
```typescript
export class RenderError extends Error {
  readonly reason: string;
  constructor(reason: string) {
    super(`Cannot render tree: ${reason}.`);
    this.name = 'RenderError';
    this.reason = reason;
  }
}
```

**`parseLines` behavior:**
- Split input on `\n`.
- For each line, try the marker regex `/^([ \t│├└─]*)(\+\+|\*\*|~~|--) (.+?)(?:\s+(#.+))?$/`.
- If matched: `prefix = m[1]`, `marker = m[2]`, `body = m[3]`, `comment = m[4] ?? null`.
- If not matched: `prefix = ''`, `marker = null`, `body = raw.trimEnd()` (or `''` for blank), `comment = null`.
- `raw` is always the original line before any trimming.
- Returns the full array including blank-line entries.

**Tests (`src/parse.test.ts`):**
- A line with each of the four markers parses with correct marker, prefix, body, comment.
- A line with a marker-like string inside a `#` comment → `marker: null`, full line is body + comment.
- A line with dashes mid-path (`some-path--with-dashes.ts`) → `marker: null`.
- A marker followed by `...` group text parses correctly (`└── ++ ... 12 files # generated fixtures`).
- An empty line → `{ raw: '', prefix: '', marker: null, body: '', comment: null }`.
- A plain path line (no marker, no comment) → correct `body`, `marker: null`, `comment: null`.
- The `raw` field exactly equals the original input line for every case.
- A line with a `~~` marker (`└── ~~ context/ # moved from apps/cli/context/`) → `marker: '~~'`.

**Done when:** `pnpm test` passes all parse tests. `pnpm lint` and `pnpm typecheck` still green.

**Commit:** `feat: add types, RenderError, and parseLines with tests`

---

## Phase 3 — Palette and Layout

**Goal:** Color constants and canvas geometry with full test coverage.

**Files to create/change:**

- `src/palette.ts` — light/dark palette constants, marker color constants
- `src/layout.ts` — `measure(lines: ParsedLine[], options: RenderOptions): LayoutMetrics`
- `src/layout.test.ts` — tests listed below

**`src/palette.ts` shape:**
```typescript
export const FONT_SIZE = 18;
export const CHAR_WIDTH = 0.6 * FONT_SIZE;    // 10.8
export const LINE_HEIGHT = FONT_SIZE * 1.5;   // 27
export const H_PADDING = 21;
export const V_PADDING = 19;
export const LEGEND_GAP = LINE_HEIGHT;
export const DEFAULT_MAX_LINE_WIDTH = 120;

// GitHub Primer semantic tokens
export const LIGHT = {
  containerFill: 'rgba(246,248,250,0.85)',
  pathText: '#24292f',
  muted: '#57606a',
  markerAdded: '#1a7f37',
  markerChanged: '#9a6700',
  markerMoved: '#8250df',
  markerRemoved: '#cf222e',
} as const;

export const DARK = {
  containerFill: 'rgba(22,27,34,0.85)',
  pathText: '#e6edf3',
  muted: '#8b949e',
  markerAdded: '#3fb950',
  markerChanged: '#d29922',
  markerMoved: '#bc8cff',
  markerRemoved: '#f85149',
} as const;
```

**`measure` behavior:**
- Count non-empty lines for max-width check. If zero → throw `RenderError('empty tree')`.
- Check each line's `raw.trimEnd().length` against `options.maxLineWidth ?? DEFAULT_MAX_LINE_WIDTH`. If any exceeds it → throw `RenderError('line too wide to render at the current maximum width')`.
- `canvasWidth = Math.ceil(maxLineChars * CHAR_WIDTH + 2 * H_PADDING)`.
- `canvasHeight = (lines.length + 2) * LINE_HEIGHT + 2 * V_PADDING` (lines + gap + legend).
- Returns a `LayoutMetrics` object with all constants included.

**Tests (`src/layout.test.ts`):**
- A valid tree of 3 lines → canvas dimensions are consistent with the formula.
- An all-blank-line input → throws `RenderError` with reason `'empty tree'`.
- A tree with one line exceeding maxLineWidth → throws `RenderError` with reason containing `'too wide'`.
- A tree at exactly maxLineWidth chars → does not throw.
- `canvasWidth` uses `Math.ceil` (verify with a fractional-width line).
- A tree with blank lines interspersed → blank lines count toward height but not toward max-width check.
- Custom `maxLineWidth` option is respected.

**Done when:** `pnpm test` passes all layout tests. `pnpm lint` and `pnpm typecheck` still green.

**Commit:** `feat: add palette constants and layout measurement with tests`

---

## Phase 4 — SVG Renderer

**Goal:** Emit valid, themed, accessible SVG from parsed lines and layout metrics.

**Files to create/change:**

- `src/render.ts` — `renderSvg(lines: ParsedLine[], metrics: LayoutMetrics, inputHash: string): string`
- `src/render.test.ts` — tests listed below

**`renderSvg` behavior:**

SVG structure (in order):
```
<svg xmlns="..." width="{W}" height="{H}" role="img" aria-labelledby="ct-{hash}-title ct-{hash}-desc">
  <style>
    :root { --ct-fill: ...; --ct-path: ...; --ct-muted: ...; --ct-added: ...; --ct-changed: ...; --ct-moved: ...; --ct-removed: ...; }
    @media (prefers-color-scheme: dark) { :root { /* dark overrides */ } }
    text { font-family: ui-monospace, ...; font-size: 18px; }
  </style>
  <title id="ct-{hash}-title">Change Tree</title>
  <desc id="ct-{hash}-desc">Colored Unicode repository tree showing where changes live in a diff. Status markers: ++ added (green), ** changed (yellow), ~~ moved (purple), -- removed (red). Collapsed ... groups are authored summaries, not automatically verified file counts.</desc>
  <rect width="100%" height="100%" rx="8" fill="var(--ct-fill)" />
  <!-- one <text> per line, positioned by y = vPadding + i * lineHeight + lineHeight (baseline) -->
  <!-- each line: prefix as muted tspan, marker as colored tspan (if present), body as path tspan, comment as muted tspan (if present) -->
  <!-- legend text at bottom -->
</svg>
```

Each tree line is a `<text>` element at `x="{hPadding}" y="{baseline}"`:
- `prefix` → `<tspan fill="var(--ct-muted)">`
- `marker` (if present) → `<tspan fill="var(--ct-{markerVar})">` where markerVar maps `++→added`, `**→changed`, `~~→moved`, `--→removed`
- body text (after marker, if any) → `<tspan fill="var(--ct-path)">`
- comment (if present) → `<tspan fill="var(--ct-muted)">`
- blank line → empty `<text>` (preserves vertical spacing)

For non-marker lines: full `raw.trimEnd()` content as a single `<tspan fill="var(--ct-path)">` (no prefix split needed — prefix is empty for non-indented lines; for indented non-marker lines the entire line is path-colored).

Legend line at `y = vPadding + (lines.length + 1.5) * lineHeight`:
```
++ added{3× }** changed{3× }~~ moved{3× }-- removed
```
Each marker segment uses its color var; ` added` / ` changed` / ` moved` / ` removed` and separators use `--ct-muted`.

Hash function: djb2 over the input string, returned as a base-36 string, deterministic.

**Tests (`src/render.test.ts`):**
- Output is a string starting with `<svg`.
- Output contains `role="img"`.
- Output contains `<title` and `<desc`.
- `<desc>` text names all four markers and mentions `...` as authored summaries.
- `<style>` block contains `@media (prefers-color-scheme: dark)`.
- CSS custom property `--ct-added` appears in output.
- A `++` marker line → output contains the added marker color variable.
- A `**` marker line → output contains the changed marker color variable.
- A `~~` marker line → output contains the moved marker color variable.
- A `--` marker line → output contains the removed marker color variable.
- A comment line → `--ct-muted` appears in the tspan for the comment.
- A branch glyph prefix (`│`, `├`, `└`, `─`) → prefix tspan uses `--ct-muted`.
- The legend line appears in output (contains `++ added`).
- A blank-line input in the middle → the tree line count in the SVG equals lines.length.
- `aria-labelledby` references the same ids as `<title>` and `<desc>`.
- Same input + same options → identical output (determinism).

**Done when:** `pnpm test` passes all render tests. `pnpm lint` and `pnpm typecheck` still green.

**Commit:** `feat: add SVG renderer with theming, accessibility, and legend`

---

## Phase 5 — Public Entry Point and Integration Tests

**Goal:** Wire the pipeline into a single public `render()` function; verify the full spec with integration tests.

**Files to create/change:**

- `src/index.ts` — `render()`, re-export `RenderError`, `RenderOptions`
- `src/index.test.ts` — integration tests listed below

**`render` signature:**
```typescript
export function render(input: string, options?: Partial<RenderOptions>): string
```

**`render` behavior:**
1. Parse: `parseLines(input)`.
2. Compute hash: `djb2(input)` (imported from `render.ts` or a shared util).
3. Measure: `measure(lines, options ?? {})` — throws `RenderError` on invalid input.
4. Emit: `renderSvg(lines, metrics, hash)`.
5. Return the SVG string.

**`src/index.ts` exports:**
```typescript
export { render } from './render-pipeline.js';  // or inline
export { RenderError } from './error.js';
export type { RenderOptions } from './types.js';
```

**Integration tests (`src/index.test.ts`):**

Fidelity:
- Input tree lines appear verbatim in the SVG output (text content preserved).
- The `raw` text of each line is present in the SVG.

Marker coloring:
- A tree with `++` → SVG contains `--ct-added`.
- A tree with `**` → SVG contains `--ct-changed`.
- A tree with `~~` → SVG contains `--ct-moved`.
- A tree with `--` → SVG contains `--ct-removed`.

Muting:
- Branch glyphs (`├──`, `└──`, `│`) appear in a `--ct-muted` tspan.
- Comments (`# ...`) appear in a `--ct-muted` tspan.

Light/dark:
- SVG contains `@media (prefers-color-scheme: dark)`.
- Both light and dark values for `--ct-fill` appear in the SVG.

Legend:
- SVG contains the legend text (`++ added`, `** changed`, `~~ moved`, `-- removed`).

Accessibility:
- SVG has `role="img"`.
- `<title>` element present and non-empty.
- `<desc>` element contains all four marker descriptions.
- `aria-labelledby` references the title and desc ids.

Rejection:
- `render('')` throws `RenderError` with `reason === 'empty tree'`.
- `render('\n\n')` (only blank lines) throws `RenderError` with `reason === 'empty tree'`.
- A tree with a line longer than `maxLineWidth` throws `RenderError` with `reason` containing `'too wide'`.
- Thrown error is `instanceof RenderError`.
- `e.message` starts with `'Cannot render tree:'`.

Edge cases from spec:
- A tree with no status markers → still renders the tree and legend.
- A tree with comments but no markers → comments still use `--ct-muted`.
- A marker-like string inside a `#` comment → treated as comment text, not colored as a marker.
- A marker-like string in the middle of a path name → treated as path text.

**Done when:** `pnpm test` passes all integration tests. `pnpm lint` and `pnpm typecheck` still green. Stage 1 done-when criteria met.

**Commit:** `feat: add public render() entry point and integration tests`

---

## Phase Order and Dependencies

```
Phase 1 (scaffold)
  └── Phase 2 (parse)
        └── Phase 3 (palette + layout)
              └── Phase 4 (renderer)
                    └── Phase 5 (entry + integration)
```

Each phase's commit leaves the verification command green. No phase is skippable.

---

## Open Questions

None. All load-bearing design decisions were resolved in the planning dialogue.
