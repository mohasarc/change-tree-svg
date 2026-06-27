# Stage 1 — Rendering engine: phased plan

Turns authored Change Tree text into one faithful, themed, accessible SVG string in the C19 style. Source: [`stages.md`](stages.md) Stage 1; behavior governed by [`change-tree-svg-functional-spec.md`](change-tree-svg-functional-spec.md).

## Goal

After this plan, `change-tree-svg` exports `renderChangeTree(tree, options?)` which takes Change Tree text and returns one SVG string. The SVG preserves the input tree's order, indentation, branch glyphs, markers, paths, collapsed groups, and comments exactly; colors the four status markers (green/yellow/purple/red); mutes glyphs and comments; uses neutral path text; sits in a rounded translucent borderless container; shows the legend at the bottom; adapts to light and dark viewing contexts via CSS with light as the unsignaled default; and carries accessible descriptive text. Empty trees, over-wide lines, and unsupported control characters are rejected with `Cannot render tree: <reason>.`. The package imports and runs; `pnpm test && pnpm lint && pnpm typecheck` is green.

This is greenfield: no `package.json`, no toolchain, no source exists yet. Phase 1 establishes the toolchain from scratch.

## Context

Greenfield repo. Present: `AGENTS.md`, `.agents/rules/`, `plans/000/` (spec + stages), `.github/PULL_REQUEST_TEMPLATE.md`, `.gitignore` (already lists `dist/`, `coverage/`, `*.tsbuildinfo`, `node_modules/` — the intended toolchain shape: TypeScript compiled to `dist/` via `tsc`, a coverage-producing runner). Available: Node 22, pnpm, gt.

The engine is a pure pipeline with three internal stages and one public entry:

- **Parser** — `string` → `TreeLine[]` (ordered line records, verbatim segments).
- **Layout/geometry** — `TreeLine[]` + options → measured dimensions; owns the over-wide rejection.
- **Renderer** — measured lines → one complete SVG document string (tspans, CSS classes, single inline `<style>` with light + dark palettes, container, legend, `<desc>`/aria, XML escaping).
- **Public entry** — `renderChangeTree` composes parser → layout → renderer.

Spec sections that bind behavior: Text Fidelity (17-53), Visual Scanability (54-75), Background Compatibility (77-97), No Hidden Layout Changes (99-120), SVG Visual Format (370-432), Determinism (434-444), Accessibility (446-453), Invalid Input (476-489), Render Tree edge cases (638-643).

Stage boundary: legend show/hide, fallback text, file/pipe input, file output, npm publish metadata, README are **not** Stage 1 (Stages 2-3). The legend is always shown here.

## Conventions

- TDD: each phase writes failing tests first, then production code. Red test as its own commit when the failure is informative; otherwise paired with implementation.
- Small modules, explicit types at public boundaries, readable names, spelled-out abbreviations, early returns.
- Determinism: no `Date`, no random, no locale-dependent formatting.
- Commit hygiene: one logical change per commit; introduce a type before its first use; no move-and-change in one commit.

---

## Phase 1 — Toolchain and public entry

**Behavior delivered.** The package builds, tests, lints, and type-checks. It exposes an importable public entry `renderChangeTree` (initially a stub) wired into the `exports`/`main`/`types` map pointing at `dist/`. `pnpm test && pnpm lint && pnpm typecheck` is green.

**Test cases.**
- Package public surface (unit): importing `renderChangeTree` from the package entry resolves to a function. Asserts the entry point and exports map are wired. Harness: a colocated `src/index.test.ts` importing from the local entry.
- Pipeline smoke (unit): `renderChangeTree("...")` returns a string (stub may return a minimal placeholder until Phase 4 fills it). Asserts the runner executes TypeScript ESM and the function signature compiles. This test is updated to real assertions in Phase 4; here it only proves the toolchain runs.

**Components.**

`package.json` (declarative contract):
- `"name": "change-tree-svg"`, `"version"` placeholder, `"type": "module"`, `"engines": { "node": ">=22" }`.
- `"exports": { ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" } }`, `"main": "./dist/index.js"`, `"types": "./dist/index.d.ts"`.
- Scripts: `"build": "tsc"`, `"test": "vitest run"`, `"lint": "eslint ."`, `"typecheck": "tsc --noEmit"`.
- devDependencies: `typescript`, `vitest`, `eslint`, `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin` (or the flat-config `typescript-eslint` meta-package).

`tsconfig.json`: strict, ESM (`"module": "NodeNext"`, `"moduleResolution": "NodeNext"`), `"target": "ES2022"`, `"declaration": true`, `"outDir": "dist"`, `"rootDir": "src"`.

`eslint.config.js`: flat config wiring `typescript-eslint` recommended rules over `src/**/*.ts`.

Public entry:
```ts
export interface RenderOptions {
  maxLineWidth?: number;
}

export declare function renderChangeTree(tree: string, options?: RenderOptions): string;
```
(`src/index.ts` exports `renderChangeTree` and `RenderOptions`. Body is a stub in this phase.)

**Commit plan.**
1. `chore: add package.json and toolchain config` — package.json, tsconfig.json, eslint.config.js, .npmrc if needed. Config only, no source.
2. `test: add toolchain smoke test for package entry` — failing test importing `renderChangeTree`. Red-test-first; no production code yet.
3. `feat: add renderChangeTree stub and exports map` — `src/index.ts` with the signature above and a stub body; turns the smoke test green. One logical change.

**Done when.** `pnpm install` succeeds; `pnpm test && pnpm lint && pnpm typecheck` is green; `renderChangeTree` and `RenderOptions` are importable from the built entry.

---

## Phase 2 — Parser

**Behavior delivered.** Change Tree text parses into an ordered array of line records, each split into verbatim segments (indent, marker, body, comment). Marker recognition follows the spec exactly. Empty input and unsupported control characters are rejected.

**Test cases.** (all unit, colocated `src/parse-change-tree.test.ts`)
- Order and verbatim fidelity: a multi-line tree parses to one record per line, in input order, and re-joining `indent+marker(+space)+body(+space)+comment` reproduces each original line exactly. Asserts no reorder, no rewrite (spec 21-25).
- Marker in marker position: `├── ++ file.ts` → `marker "++"`, `body "file.ts"`, `indent "├── "` (spec 343-346).
- Marker-like string mid-path is path text: a path containing `**` not in marker position → `marker null`, the `**` stays in `body` (spec 643).
- Marker-like string inside a comment is comment text: `└── file.ts # ++ added` → `marker null`, comment carries `# ++ added` verbatim (spec 642).
- `...` is body, never a marker: `└── ++ ... 12 files` → `marker "++"`, `body "... 12 files"`; `└── ... 12 files` → `marker null`, `body "... 12 files"` (spec 248, 256-262).
- Comment boundary: `a#b.ts` (hash with no preceding whitespace) → `comment null`, `#` stays in body; `path # note` (hash preceded by space) → comment `# note` (spec 349, 642-643).
- Empty line preserved: a blank line becomes a record with empty segments, kept in order (spec 314).
- Empty tree rejected: empty string / whitespace-only input throws `ChangeTreeRenderError` with `Cannot render tree: tree is empty.` (spec 480, 488).
- Control characters rejected: input containing an ASCII control char other than tab/newline throws `Cannot render tree: tree contains unsupported control characters.` (spec 484).

**Components.**
```ts
export interface TreeLine {
  indent: string;                                   // leading whitespace + branch glyphs, verbatim
  marker: "++" | "**" | "~~" | "--" | null;         // only in marker position
  body: string;                                     // path / collapsed-group text, verbatim
  comment: string | null;                           // from first " #" onward, verbatim incl. #
}

export class ChangeTreeRenderError extends Error {}

export function parseChangeTree(tree: string): TreeLine[];
```

Parse-order rule (prose, not implementation): for each line, first detect the comment boundary (first `#` preceded by whitespace) and split it off; then split the leading indent (leading whitespace plus any run of branch-glyph characters `├ └ │ ─` and spaces); then the marker is a standalone `++`/`**`/`~~`/`--` token at the very start of the remaining body region immediately followed by a space, else `null`; the rest is `body`. Box-drawing glyphs are treated as ordinary muted indent characters. Empty-tree and control-char checks run before line parsing.

**Commit plan.**
1. `feat: add TreeLine type and ChangeTreeRenderError` — type and error class only, no parser, no callsites. Type-before-use hygiene.
2. `test: add parser fidelity and marker edge-case tests` — failing tests covering all cases above. Red-test-first.
3. `feat: add parseChangeTree` — parser implementation turning the tests green. One logical change.

**Done when.** All parser tests green; the four spec edge cases (343-346, 643, 642, 248) and both rejections (empty, control chars) are covered; round-trip fidelity holds.

---

## Phase 3 — Layout and geometry

**Behavior delivered.** Parsed lines plus options produce measured canvas dimensions using monospace character geometry. Lines wider than `maxLineWidth` (default 120) are rejected. No SVG is emitted yet; this is a pure measurement unit.

**Test cases.** (all unit, colocated `src/measure-layout.test.ts`)
- Per-line width counts the whole visible line including comment: a line's measured character width equals the character count of `indent + marker(+space) + body(+space) + comment` (spec 113-117). Box-drawing glyphs count as one cell each.
- Canvas width derives from the widest line and the legend: width = `max(widest line chars, legend chars) * advance + 2 * horizontalPadding`; asserts the legend participates so the canvas is at least legend-wide (spec 391, 472).
- Canvas height derives from line count plus legend plus padding: height = `lineCount * lineHeight + legendHeight + 2 * verticalPadding`.
- Over-wide rejection at default: a line exceeding 120 characters throws `Cannot render tree: line N exceeds maximum width of 120 characters.` where N is the 1-based line number (spec 113-118, 488).
- Over-wide threshold honors the option: with `maxLineWidth: 40`, a 50-char line rejects and the message interpolates `40`, not a hardcoded 120.
- Within-width passes: a tree whose widest line is under the limit measures without throwing and reports dimensions large enough to contain every line (spec 106-110).

**Components.**
```ts
export const FONT_SIZE_PX = 18;
export const CHAR_ADVANCE_PX = 10.8;        // 0.6em at 18px monospace (load-bearing constant)
export const HORIZONTAL_PADDING_PX = 21;
export const VERTICAL_PADDING_PX = 19;
export const CORNER_RADIUS_PX = 8;
export const DEFAULT_MAX_LINE_WIDTH = 120;  // OPEN QUESTION: spec pins no number; 120 chosen.
export const LEGEND_TEXT = "++ added   ** changed   ~~ moved   -- removed";

export interface LineMetrics {
  line: TreeLine;
  characterWidth: number;
}

export interface LayoutMetrics {
  lines: LineMetrics[];
  widthPx: number;
  heightPx: number;
  lineHeightPx: number;
}

export function measureLayout(lines: TreeLine[], maxLineWidth: number): LayoutMetrics;
```

Width/height are computed as integers from character counts and the fixed constants; no floating-point locale formatting reaches any output value. `measureLayout` performs the over-wide check and throws `ChangeTreeRenderError` before returning.

> **Open question (recorded here, resolves in this phase): `DEFAULT_MAX_LINE_WIDTH = 120`.** The spec names no maximum-width number (spec 113-118 only states over-wide rejects). 120 chosen as a reasonable monospace line budget. Revisit if real trees commonly exceed it; changing it is a one-constant edit.

**Commit plan.**
1. `feat: add layout constants and metric types` — constants + `LineMetrics`/`LayoutMetrics` types, no measurement logic, no callsites. Type/constant-before-use.
2. `test: add layout measurement and over-wide rejection tests` — failing tests for all cases above. Red-test-first.
3. `feat: add measureLayout with over-wide rejection` — measurement implementation; tests green. One logical change.

**Done when.** All layout tests green; whole-line (incl. comment) width measured; over-wide rejection interpolates the actual `maxLineWidth`; legend participates in canvas width.

---

## Phase 4 — Complete SVG renderer and end-to-end wiring

**Behavior delivered.** Measured lines render to one complete SVG document string: per-line `<text>` with per-segment `<tspan>`s carrying CSS classes; a single inline `<style>` with the light palette as default and `@media (prefers-color-scheme: dark)` overrides for path and container colors; rounded translucent borderless container; bottom legend; accessible `<desc>` and `role`/`aria-label`; XML-escaped user text. `renderChangeTree` is wired end-to-end (parser → layout → renderer) and replaces the Phase 1 stub.

**Test cases.** (all unit, colocated `src/render-svg.test.ts` and `src/index.test.ts`)
- Fidelity: every input tree line's exact text (indent, glyphs, marker, path, collapsed count, comment) appears in the SVG text content, in order (spec 21-25). Assert by extracting `<text>`/`<tspan>` content and comparing to input lines.
- Marker coloring: each marker carries its status class; the `<style>` maps `marker-added`→green, `marker-changed`→yellow, `marker-moved`→purple, `marker-removed`→red (spec 398-403). Assert class presence per marker and the color declarations.
- Muting: branch-glyph segments and comment segments carry the muted class; path segments carry the neutral-path class (spec 64-73).
- Legend present: the SVG contains `LEGEND_TEXT` at the bottom with the four marker colors (spec 391, 431).
- Both palettes: the `<style>` contains the light palette by default and a `@media (prefers-color-scheme: dark)` block overriding path and container colors; markers keep one color in both (spec 88-90, 94-95). Assert both palette blocks exist with the recorded hex values.
- Container: rounded (`rx`/corner radius 8), translucent fill, no `stroke`/border, no shadow/filter (spec 408-414).
- Accessibility: the SVG has `role="img"`, an `aria-label`, and a `<desc>` stating it is a colored Unicode repository tree, naming the four marker meanings, and stating that `...` groups are authored summaries not auto-verified counts (spec 446-451).
- XML escaping: a tree line whose path/comment contains `&` and `<` renders valid SVG with those characters visible (escaped as entities) in both the `<tspan>` text and the `<desc>`/`aria-label` (spec 357). Assert no raw `&`/`<` break the document and the characters survive.
- Determinism: `renderChangeTree(tree)` called twice with the same input/options returns byte-identical strings (spec 437-444).
- End-to-end via entry point: `renderChangeTree(sampleTree)` returns an SVG containing the sample's lines, the four marker colors, the muted classes, and the legend (spec 609-636). The Phase 1 smoke test is upgraded to these real assertions.
- Rejections surface through the entry point: empty tree, an over-wide line, and a control char each throw `ChangeTreeRenderError` with the corresponding `Cannot render tree: <reason>.` message when called via `renderChangeTree`.

**Components.**
```ts
export interface Palette {
  path: string;
  muted: string;
  container: string;       // translucent
  markerAdded: string;
  markerChanged: string;
  markerMoved: string;
  markerRemoved: string;
}

export const LIGHT_PALETTE: Palette;   // see recorded hex values below
export const DARK_PALETTE: Palette;     // path/muted/container overrides; markers shared

export function renderSvg(metrics: LayoutMetrics): string;

// src/index.ts — real implementation replacing the stub:
export function renderChangeTree(tree: string, options?: RenderOptions): string;
```

Recorded starting palette (centralized in one palette module so visual review is a one-file change):
- Light: `path #24292f`, `muted #6e7781`, `container rgba(175,184,193,0.12)`.
- Dark: `path #c9d1d9`, `muted #8b949e`, `container rgba(110,118,129,0.15)`.
- Markers (both themes): `added #1a7f37`, `changed #9a6700`, `moved #8250df`, `removed #cf222e`.

`renderSvg` emits a single `<style>` block (light palette as the default rules, a `@media (prefers-color-scheme: dark)` block overriding `path` and `container` only), the container `<rect>` (rounded, translucent fill, no stroke/filter), one `<text>` per line with `<tspan>` children classed per segment, the legend row, and `<desc>` + `role`/`aria-label`. All `body` and `comment` text plus the `<desc>`/`aria-label` content is XML-escaped. `renderChangeTree` composes `parseChangeTree` → `measureLayout(lines, options?.maxLineWidth ?? DEFAULT_MAX_LINE_WIDTH)` → `renderSvg`.

> **Open question (recorded here, resolves in this phase): exact palette hex values.** The spec names marker/neutral colors only qualitatively (green/yellow/purple/red; neutral path; muted glyphs/comments; translucent container) and the "C19" direction has no swatch table in the repo. The values above are a sound GitHub-derived starting point. Acceptance bar for any visual tweak: the four markers stay mutually distinguishable AND readable over a translucent container on both light and dark backgrounds. Centralizing the palette keeps the tweak a single-file change.

**Commit plan.**
1. `feat: add Palette type and light/dark palettes` — palette module: type + the two palette constants. Type-and-constant-before-use, no renderer yet.
2. `test: add SVG renderer fidelity, color, theming, a11y, escaping, determinism tests` — failing `renderSvg` tests covering every case above. Red-test-first.
3. `feat: add renderSvg` — renderer producing the complete SVG document; renderer tests green. One logical change.
4. `test: upgrade entry-point test to full end-to-end assertions` — replace the Phase 1 smoke assertions with real end-to-end + rejection-path assertions (still failing against the stub). Red-test-first for the wiring.
5. `feat: wire renderChangeTree through parser, layout, renderer` — replace the stub body with the composed pipeline; entry-point tests green. One logical change.

**Done when.** All Stage 1 tests green; `renderChangeTree` returns a faithful, marker-colored, muted, legended, themed, accessible, deterministic SVG; empty/over-wide/control-char inputs throw the correct `Cannot render tree:` messages; `pnpm test && pnpm lint && pnpm typecheck` is green.

---

## Out of scope (later stages)

- Legend show/hide toggle, copyable text fallback, file/pipe input modes, file output, multiple-input/missing-input validation — **Stage 2** ([`stages.md`](stages.md) §Stage 2). `RenderOptions` is designed to extend for these without reshaping `renderChangeTree`'s signature.
- npm publish metadata beyond the local `exports`/`main`/`types` map, and the README — **Stage 3** ([`stages.md`](stages.md) §Stage 3).
- PNG output, image hosting, PR posting, diff parsing, line wrapping/truncation, in-SVG horizontal scrolling, per-viewer manual theme switch — **never in scope** ([`stages.md`](stages.md) §Beyond Scope).

## Open questions

1. **Exact palette hex values** (Phase 4). Pinned starting values recorded; subject to visual review against the stated acceptance bar.
2. **`maxLineWidth` default = 120** (Phase 3). Spec pins no number; 120 chosen; one-constant change if revisited.
