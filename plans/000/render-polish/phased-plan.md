# Render polish — font size, comment alignment, tight width, second example

Final-touches plan: shrink the render to GitHub's code-block scale, align comments to a vertical column, make the bare canvas hug the longest rendered line, and add a deeper README example.

## Goal

After all phases: the default embed renders at GitHub markdown code-block scale (13.6px), comments line up on a shared vertical column with long-body lines overflowing past it, the bare canvas ends at the right edge of the longest *rendered* line (no ~16% trailing slack), and the README shows a second, deeper example. The library/CLI surface is unchanged; only geometry and docs move.

## Context

Engine pipeline: `parse.ts` → `ParsedLine[]` → `layout.ts measure()` → `LayoutMetrics` → `render.ts renderInner/renderSvg` → SVG. `slice.ts` windows the bare render into fixed-`viewBox` strips for the scrollable embed; `cli/commands/publish.ts` uploads strips to the `media` orphan branch and returns raw URLs.

Key current facts the plan changes:

- `palette.ts`: `FONT_SIZE = 18`, `CHAR_WIDTH = 0.6*FONT_SIZE`, `LINE_HEIGHT = 1.5*FONT_SIZE`, `H_PADDING = 21`, `V_PADDING = 19` (absolute). `DEFAULT_STRIP_WIDTH = 240`.
- `measure()` (`layout.ts:28-30`): `canvasWidth` derives from `raw.trimEnd().length` — counts the author's manual alignment spaces that `render` discards. Longest raw line = 56 chars; longest *rendered* line = 47 chars → canvas 9 chars (~97px, ~16%) too wide. This is the point-3 overshoot.
- `render.ts treeLineText()` (`render.ts:69-71`): a commented line emits `<tspan fill="var(--ct-muted)"> ${comment}</tspan>` — comment is glued one space after the body. No alignment.
- `parse.ts` already strips inter-token padding: `ParsedLine.body` is trimmed, `comment` starts at `#`. So the renderer owns all spacing; author padding never reaches output.
- Legend is rendered (`render.ts legendText`) but **not** counted in `canvasWidth`; on a tree narrower than the legend it gets clipped.
- `legend.ts legendPlainText()` returns the legend's visible string (`"++ added   ** changed   ~~ moved   -- removed"`), whose `.length` equals the rendered legend's char width — reuse for the width calc.
- Tests: `layout.test.ts` and `slice.test.ts` assert via the imported constants (robust to scalar changes). `render.test.ts` has hardcoded output strings for comment placement and bare `x="0"` (will change).

New shared module `engine/geometry.ts` is justified: body-end / comment-column math is needed by **both** `measure` (width + column) and `render` (per-line comment x). One source of truth prevents drift.

Char-geometry definitions used throughout (all in characters, prefix included so depth shifts a line right):

- `bodyEndChars(line)` — marker line: `prefix.length + marker.length + 1 + body.length`; non-marker line: `body.length`.
- comment column: over commented lines only, `aligned = { L : bodyEndChars(L) <= median(bodyEndChars) + DELTA }`; `columnChars = max(bodyEndChars(aligned)) + GAP`. `null` when no commented lines.
- `commentStartChars(line) = max(columnChars, bodyEndChars(line) + GAP)` — aligned lines land on the column, longer bodies overflow right.
- `lineEndChars(line)` — commented: `commentStartChars + comment.length`; else `bodyEndChars`.
- canvas width basis: `max(lineEndChars over non-empty lines, legend length if shown)`.

## Phase 1 — Resize to GitHub code-block scale

**Behavior delivered.** Default and container renders come out at 13.6px with 1.45 line-height; container padding scales down proportionally with the smaller font. No layout-model change — width is still raw-length based (overshoot still present, fixed in Phase 3).

**Test cases.**
- `palette` constant relationships (unit, new `palette.test.ts`): `FONT_SIZE === 13.6`; `CHAR_WIDTH === 0.6 * FONT_SIZE`; `LINE_HEIGHT === 1.45 * FONT_SIZE`; `H_PADDING` and `V_PADDING` derive from `FONT_SIZE` (assert the chosen expressions, ~16 and ~14). Assertion: each constant equals its formula.
- Existing `layout.test.ts` height/width formula tests (unit): already compute expected from imported `LINE_HEIGHT`/`CHAR_WIDTH`/`H_PADDING`/`V_PADDING` — must stay green unchanged after the constants move. No edits expected; confirm.

**Components.**

```ts
// palette.ts — revised scalars
export const FONT_SIZE = 13.6;                 // GitHub markdown fenced code block (85% of 16px)
export const CHAR_WIDTH = 0.6 * FONT_SIZE;     // 8.16
export const LINE_HEIGHT = 1.45 * FONT_SIZE;   // 19.72
export const H_PADDING = Math.round(1.2 * FONT_SIZE);   // 16  (was 21 @ 18px)
export const V_PADDING = Math.round(1.05 * FONT_SIZE);  // 14  (was 19 @ 18px)
export const DESCENT_ALLOWANCE = 0.3 * FONT_SIZE;       // unchanged ratio
```

`DEFAULT_STRIP_WIDTH`, `LEGEND_GAP`, `DEFAULT_MAX_LINE_WIDTH` unchanged.

**Commit plan.**
1. `test: pin font/line-height/padding constant relationships` — add `palette.test.ts` asserting the new scalar relationships (red against current 18px). Tests only.
2. `feat: shrink render to GitHub code-block scale` — set the new constants in `palette.ts`. Scalar-only; all formula-based layout/slice tests stay green, `palette.test.ts` goes green.

**Done when.** `palette.test.ts` green; `layout.test.ts`/`slice.test.ts` green unchanged; rendered SVG visibly smaller (manual check of one sample). Comment placement and overshoot unchanged (deferred).

## Phase 2 — Geometry module (pure functions)

**Behavior delivered.** A tested `engine/geometry.ts` exposing the char-geometry contract. Not yet wired into `measure`/`render` — no output change.

**Test cases.** All unit, new `geometry.test.ts`, fixtures are `ParsedLine[]` built inline:
- `bodyEndChars`: marker line counts `prefix + marker + 1 + body`; non-marker line counts `body.length`. Assertion: exact char counts for a sample of each.
- `commentColumnChars` with no commented lines → `null`.
- `commentColumnChars` with uniform body lengths → `max(bodyEnd) + GAP` (all aligned, no overflow).
- `commentColumnChars` with one long outlier (`bodies 12,13,14,41`, `DELTA=8`) → `14 + GAP` (outlier excluded). Assertion: equals `14 + GAP`.
- `commentStartChars`: aligned line (body ≤ column) → `columnChars`; overflow line (body > column) → `bodyEnd + GAP`.
- `lineEndChars`: commented aligned line → `column + comment.length`; commented overflow line → `bodyEnd + GAP + comment.length`; uncommented line → `bodyEnd`.
- `legendLengthChars` equals `legendPlainText().length` (guards the legend/width coupling).

**Components.**

```ts
// engine/geometry.ts
import type { ParsedLine } from './types.js';

export function bodyEndChars(line: ParsedLine): number;
export function commentColumnChars(lines: ParsedLine[], delta: number, gap: number): number | null;
export function commentStartChars(line: ParsedLine, columnChars: number, gap: number): number;
export function lineEndChars(line: ParsedLine, columnChars: number | null, gap: number): number;
export function legendLengthChars(): number;   // wraps legendPlainText().length
```

```ts
// palette.ts — new geometry constants
export const COMMENT_GAP = 2;          // char-widths between column and comment
export const COMMENT_OUTLIER_DELTA = 8; // chars past median before a body overflows
export const ORIGIN_NUDGE = -1;        // px left shift in bare mode to cancel glyph side-bearing
```

Median: sort `bodyEndChars` of commented lines ascending; even count → mean of the two middle values. Deterministic; no RNG.

**Commit plan.**
1. `test: cover geometry char-math helpers` — add `geometry.test.ts` (red; module absent).
2. `feat: add geometry constants` — add `COMMENT_GAP`, `COMMENT_OUTLIER_DELTA`, `ORIGIN_NUDGE` to `palette.ts`. Constants only, no callsites.
3. `feat: add geometry char-math module` — implement `engine/geometry.ts`. Pure functions; no existing module imports it yet. `geometry.test.ts` green.

**Done when.** `geometry.test.ts` green. No change to any rendered SVG (module unused). Full suite green.

## Phase 3 — Align comments and hug the rendered width

**Behavior delivered.** Comments render on a shared vertical column (majority aligned, long-body lines overflow past it). Bare `canvasWidth` ends at the longest *rendered* line — the ~97px overshoot is gone. Legend is counted in width (no more clipping on narrow trees). Bare text origin shifts left by 1px (`ORIGIN_NUDGE`) to cancel glyph side-bearing.

**Test cases.**
- Width hugs rendered geometry (unit, `layout.test.ts`, replaces the raw-length expectation): for a tree whose longest raw line carries padding the author would have typed, `canvasWidth === ceil(maxLineEndChars * CHAR_WIDTH)` where `maxLineEndChars` comes from `geometry.lineEndChars`, strictly less than `ceil(maxRawChars * CHAR_WIDTH)`. Assertion: equals the rendered-geometry value and is `<` the old raw value.
- Legend counted (unit): a tree whose longest tree line is shorter than the legend → `canvasWidth === ceil(legendLengthChars * CHAR_WIDTH)`; with `legend:false` the same tree is narrower. Assertion: width tracks the legend when legend is the widest line.
- `commentColumnChars` exposed on metrics (unit): a multi-comment tree → `metrics.commentColumnChars` equals `geometry.commentColumnChars(lines, DELTA, GAP)`.
- Bare text origin (unit, `render.test.ts`, replaces `x="0"` test): bare render contains `<text x="-1"` (`ORIGIN_NUDGE`); container render still `<text x="${H_PADDING}"`.
- Aligned comment x (unit, `render.test.ts`, replaces the glued-comment test): in a tree with several short bodies and one long body, every aligned comment `<tspan ... x="...">` shares one x value; the long-body line's comment tspan has a strictly larger x. Comment tspan text no longer has a leading space (`>#`, not `> #`).
- Uncommented tree unaffected (unit): tree with no comments renders no comment tspans; width = `ceil(max bodyEndChars * CHAR_WIDTH)`.
- Determinism (unit, existing) stays green.
- Strip total = canvas (integration, `slice.test.ts`): sum of strip `viewBox` widths equals `canvasWidth`; last strip width = `canvasWidth - (n-1)*stripWidth`. Confirms no trailing blank strip.

**Components.**

```ts
// types.ts — LayoutMetrics gains the column
export interface LayoutMetrics {
  // ...existing fields...
  commentColumnChars: number | null;
}
```

```ts
// layout.ts — measure() new responsibilities (signature unchanged)
export function measure(lines: ParsedLine[], options: RenderOptions): LayoutMetrics;
//  - columnChars = geometry.commentColumnChars(nonEmpty, COMMENT_OUTLIER_DELTA, COMMENT_GAP)
//  - widthChars  = max( geometry.lineEndChars(l, columnChars, COMMENT_GAP) over nonEmpty,
//                       legend ? geometry.legendLengthChars() : 0 )
//  - canvasWidth = ceil( widthChars * CHAR_WIDTH + (container ? 2*H_PADDING : 0) )
//  - hPadding (text origin) = container ? H_PADDING : ORIGIN_NUDGE
```

```ts
// render.ts — treeLineText places the comment at the computed column
//  comment tspan: <tspan fill="var(--ct-muted)" x="${commentX}">${esc(comment)}</tspan>
//  commentX = hPadding + geometry.commentStartChars(line, columnChars, COMMENT_GAP) * charWidth
//  (no leading space in the comment tspan; column owns the gap)
```

The `maxLineWidth` guard, empty-tree guard, height calc, container `vPadding`, and `slice.ts` are unchanged. `slice` keeps consuming `metrics.canvasWidth` and already trims the last window.

**Commit plan.**
1. `test: drive comment alignment and rendered-width hugging` — add the new assertions and update the existing raw-width / `x="0"` / glued-comment tests to the new contract (red).
2. `feat: align comments and size canvas to rendered text` — add `commentColumnChars` to `LayoutMetrics`; rewrite `measure` width + column + origin via `geometry`; place comment tspans at the column in `render`. One feature spanning `types`/`layout`/`render`; no unrelated refactor. Suite green.

**Done when.** New + existing engine tests green. On the worked example: `canvasWidth` drops from 605 to ~508 (47 chars × 8.16 + ceil); comments share a column; last strip carries no trailing blank. Manual: render the deep example, confirm aligned column, the long line overflows, and the left edge isn't clipped (drop `ORIGIN_NUDGE` if the first glyph clips).

## Phase 4 — Second README example + republish both embeds

**Behavior delivered.** README gains a deeper worked example (more depth, more branches, one long overflowing line). Both the original and new embeds point at strips re-rendered at the new scale/layout on the `media` branch.

**Test cases.** Docs + operational; no unit tests. Verification is observational:
- `renderFallback` of both example trees produces the plain-text block embedded in the README (manual parity check — README fallback must match actual output).
- Published strip URLs resolve (HTTP 200) and the last strip width equals `canvasWidth - (n-1)*240`.

**Components.** New example notation (ships in README, also used as the publish input):

```text
.
├── src/
│   ├── api/
│   │   ├── routes/
│   │   │   ├── ++ users.controller.ts   # new CRUD endpoints
│   │   │   ├── ** auth.controller.ts     # add refresh-token flow
│   │   │   ├── ++ v2/analytics/events.controller.ts   # batched ingest with dedupe + retry backoff
│   │   │   └── -- legacy-session.controller.ts
│   │   ├── ++ middleware/rate-limit.ts   # token bucket per IP
│   │   └── ** server.ts                  # wire new routes
│   ├── domain/
│   │   ├── ~~ user.entity.ts             # moved from models/user.ts
│   │   ├── ++ subscription.entity.ts     # billing states
│   │   └── ** invoice.entity.ts          # add proration
│   ├── infra/
│   │   ├── db/
│   │   │   ├── ++ migrations/0007_add_subscriptions.sql
│   │   │   └── ** connection-pool.ts     # raise max to 20
│   │   └── ... 4 cache adapters
│   └── ... 12 barrel files
├── test/
│   ├── ++ subscription.e2e.spec.ts       # billing happy path
│   └── ... 23 unit specs
└── ** README.md                          # document billing setup
```

The `v2/analytics/events.controller.ts` line is the intended overflow case (long body + long comment), and it sets the horizontal extent.

Publish (run after Phases 1-3 land; pushes to `media`, authorize when prompted):

```sh
# original worked example → new hash/URLs
change-tree-svg publish --file plans/000/render-polish/example-original.txt --branch media
# deep example → new hash/URLs
change-tree-svg publish --file plans/000/render-polish/example-deep.txt --branch media
```

**Commit plan.**
1. `docs: add deeper change-tree example to README` — add the new example's notation + `renderFallback` block + a `<pre>…</pre>` embed (URLs filled from the publish run); refresh the original example's embed URLs to the re-rendered strips. Single README change.

**Done when.** Both embeds load at the new scale; the deep example scrolls horizontally and shows the aligned column with one overflowing line; README fallback blocks match `renderFallback` output. No source code touched in this phase.

## Out of scope

- Configurable alignment knobs (`GAP`/`DELTA`/column as CLI/`RenderOptions`) — hardcoded by decision; revisit only if a real tree needs tuning.
- Per-subtree / per-depth comment columns — single global column by decision.
- Font-advance accuracy across non-`ui-monospace` viewers (e.g. Consolas 0.55em) — `CHAR_WIDTH` stays a 0.6em estimate; residual cross-platform slack is out of scope.
- Changing `DEFAULT_STRIP_WIDTH` or the slice windowing model — strip width is a display choice, unaffected.
- Any change to git-diff parsing, summary generation, or PR posting — still out of project scope per CLAUDE.md.
