# Stage 2 Phased Plan — Input/Output Surfaces and Fallback

Source of truth: [`stages.md`](stages.md) Stage 2 and [`change-tree-svg-functional-spec.md`](change-tree-svg-functional-spec.md).

Verification command (every phase must end green): `pnpm test && pnpm lint && pnpm typecheck`

---

## Goal

After this stage a caller can supply a Change Tree by direct text, pipe, or file and get the SVG back on stdout or written to a file, with a copyable plain-text fallback and a legend toggle. A new `change-tree-svg` CLI bin wraps the Stage 1 library; the library gains a `legend` option and a `renderFallback()` function. Colliding inputs, empty inputs, unreadable input files, and failed file writes each report their own message and exit non-zero.

## Context

Stage 1 (landed) is a pure library:

- `render(input, options?): string` ([`src/index.ts`](../../src/index.ts)) composes `parseLines` → `measure` → `renderSvg`.
- `parseLines` ([`src/parse.ts`](../../src/engine/parse.ts)) → `ParsedLine[]`, preserving `raw`.
- `measure` ([`src/layout.ts`](../../src/engine/layout.ts)) → `LayoutMetrics`; throws `RenderError` for empty tree / over-wide line. Canvas height is `(lines.length + 2) * LINE_HEIGHT + 2 * V_PADDING` — the `+2` reserves the gap row + legend row.
- `renderSvg` ([`src/render.ts`](../../src/engine/render.ts)) emits the SVG. `legendText` (render.ts:83) hardcodes the colored legend tspans; `legendY = vPadding + (lines.length + 1.5) * lineHeight` (render.ts:106).
- Constants in [`src/palette.ts`](../../src/engine/palette.ts); types in [`src/types.ts`](../../src/engine/types.ts); `RenderError` in [`src/error.ts`](../../src/engine/error.ts) — `message` is already `Cannot render tree: <reason>.`.
- Tests colocated as `*.test.ts`, run by vitest. No runtime dependencies. ESM, `NodeNext`, relative imports use `.js`. Build is `tsc` direct.

The legend currently always renders. There is no CLI, no fallback, no file I/O.

## Agreed Decisions

| # | Decision |
|---|----------|
| 1 | Surface = new CLI bin `change-tree-svg` (`src/cli.ts`, shebang, `package.json` `"bin"` → `dist/cli.js`, built by tsc) wrapping the library, plus thin library extensions. No new runtime deps; argv parsing is hand-rolled. |
| 2 | Stage 1 frozen: `render(input, options) -> string` signature and existing tests unchanged. |
| 3 | `legend?: boolean` (default `true`) added to `RenderOptions`. `legend:false` omits the SVG legend `<text>` and shrinks canvas height by the legend rows. |
| 4 | The resolved legend flag flows `RenderOptions` → `measure()` (height) → `renderSvg()` (omit text) via a new `legend: boolean` field on `LayoutMetrics`. |
| 5 | One shared legend definition (`LEGEND_ENTRIES` + `legendPlainText()` in `src/legend.ts`) feeds both the SVG colored legend and the fallback plain-text line. No drift. |
| 6 | New exported `renderFallback(input, options?): string` → `<tree>\n\n<legend line>`, **no trailing newline**. `legend:false` → just `<tree>`. Normalization strips a single final `\n` if present (not a whitespace trim); an authored trailing blank/spacer line survives. Does not call `render()`. |
| 7 | Input modes: `--text <tree>`/`-t`, `--file <path>`/`-f`, piped stdin. |
| 8 | Presence: `--text`/`--file` present iff flag present. stdin present iff non-TTY AND buffered content is non-whitespace. stdin is read+buffered once (gated on `!isTTY`); a TTY never blocks. |
| 9 | ≥2 modes present → `exactly one Change Tree input must be provided`. |
| 10 | Exactly one mode present but content empty/whitespace-only, or no mode present → `Change Tree input is required`. CLI-level, before `render()`; distinct from `RenderError('empty tree')`. |
| 11 | Empty `--text ""` / `--text "   "` is the empty-rule (one mode present, no content), not a collision. |
| 12 | File read failure (absent/unreadable) → `Change Tree file could not be read: <path>`. A readable-but-empty file is the empty-rule instead. |
| 13 | Output: default stdout; `--output <path>`/`-o` writes SVG to file. Fallback default on; `--no-fallback` off; `--no-legend` hides legend in both SVG and fallback. |
| 14 | Stdout contract (Option A, no `-o`): `<svg>...</svg>` + `\n\n` + `renderFallback()` + a single trailing `\n`. The `</svg>` split point is safe — `esc()` escapes `<`/`>`/`&` so no literal `</svg>` appears in tree text. The CLI owns the final `\n` on every path. |
| 15 | Routing: default → stdout `SVG\n\nfallback\n`. `--no-fallback` → stdout `SVG\n` (pure). `-o f` → SVG to file, stdout `fallback\n`. `-o f --no-fallback` → SVG to file, stdout empty. `--no-legend` drops legend in SVG and fallback line. |
| 16 | File write failure → `SVG file could not be created: <path>`. Direct output creates no file. SVG written to file is `render()`'s output verbatim (no CLI-added newline). |
| 17 | Fallback is raw plain text, no markdown fence. |
| 18 | CLI error channels, all exit 1, all stderr: input-mode + file errors use bare strings (no prefix); `RenderError` is printed as `err.message` (already prefixed). |
| 19 | Unknown/malformed flag (incl. `--text` with no value) → one-line usage to stderr, exit 1. |
| 20 | `--help`/`-h` → usage (flags + input/output modes) to stdout, exit 0. Intentional usability inclusion. |

---

## Phase 1 — Legend toggle in the library

**Behavior delivered.** `render(input, { legend: false })` returns an SVG with no legend `<text>` and a canvas shorter by the legend rows. Default and `legend: true` are unchanged from Stage 1.

**Test cases** (extend `src/layout.test.ts`, `src/render.test.ts`, `src/index.test.ts`):
- `measure(lines, { legend: false })` → `canvasHeight` is smaller than `measure(lines, {})` by exactly the two reserved rows (`2 * LINE_HEIGHT`); `metrics.legend === false`. (unit)
- `measure(lines, {})` and `measure(lines, { legend: true })` → `metrics.legend === true`, height matches the Stage 1 formula. (unit)
- `renderSvg` with `metrics.legend === false` → output contains no `++ added` legend text. (unit)
- `render(tree, { legend: false })` → SVG omits `++ added` legend segment but still colors markers and preserves tree lines. (integration)
- `render(tree)` → legend still present (Stage 1 default regression). (integration)
- Determinism holds: `render(t, { legend: false }) === render(t, { legend: false })`. (integration)

**Components.**
```typescript
// src/types.ts — additions
export interface RenderOptions {
  maxLineWidth?: number;
  legend?: boolean;        // default true
}

export interface LayoutMetrics {
  lineHeight: number;
  charWidth: number;
  hPadding: number;
  vPadding: number;
  canvasWidth: number;
  canvasHeight: number;
  legendGap: number;
  legend: boolean;         // resolved flag (default true)
}
```
- `measure(lines, options)` resolves `legend = options.legend ?? true`, sets it on the returned metrics, and drops the legend's two rows from `canvasHeight` when `false`.
- `renderSvg(lines, metrics, inputHash)` reads `metrics.legend`; when `false`, emits no legend `<text>` (the `legendY`/legend block is skipped). Signature unchanged.
- `render()` passes `options` through to `measure` as today; no signature change.

**Commit plan.**
1. `test: cover legend toggle in measure, renderSvg, render` — failing tests for `legend:false` height delta and legend omission. (tests-first)
2. `feat: add legend option to RenderOptions and LayoutMetrics` — add the two type fields, resolve+set `legend` in `measure`, no consumer of it yet in `renderSvg`. (type + its producer; `renderSvg` still always renders legend, so tests 3–4 stay red)
3. `feat: honor legend flag in measure height and renderSvg output` — conditional height in `measure`, conditional legend block in `renderSvg`. (behavior; turns tests green)

**Done when.** Legend-toggle tests green; Stage 1 tests unchanged and green; `pnpm test && pnpm lint && pnpm typecheck` green.

---

## Phase 2 — Shared legend definition + `renderFallback`

**Behavior delivered.** `renderFallback(input, options?)` returns the copyable text block: the input tree verbatim, a blank line, then the plain-text legend line — with no trailing newline; `legend:false` returns just the tree. The SVG legend and the fallback legend draw from one definition.

**Test cases** (new `src/fallback.test.ts`; legend extraction guarded by existing `src/render.test.ts`):
- `renderFallback(".\n└── ++ a.ts")` → `".\n└── ++ a.ts\n\n++ added   ** changed   ~~ moved   -- removed"`, no trailing `\n`. (unit)
- Output legend line exactly equals the spec line `++ added   ** changed   ~~ moved   -- removed`. (unit)
- `renderFallback(input, { legend: false })` → just the normalized tree, no blank line, no legend. (unit)
- Trailing-newline normalization: `renderFallback("x\n")` strips the single final `\n`; `renderFallback("x\n\n")` (authored trailing blank line) keeps one trailing blank line in the tree portion. (unit)
- Verbatim fidelity: indentation, glyphs, markers, comments of the input survive unchanged in the tree portion. (unit)
- After extraction, the SVG colored legend output is byte-identical to before (existing render.test.ts legend assertions stay green). (unit, regression)

**Components.**
```typescript
// src/legend.ts (new) — single source of legend content
export interface LegendEntry { marker: Marker; label: string; }
export const LEGEND_ENTRIES: readonly LegendEntry[];   // ++ added, ** changed, ~~ moved, -- removed
export function legendPlainText(): string;             // "++ added   ** changed   ~~ moved   -- removed"

// src/fallback.ts (new)
export function renderFallback(input: string, options?: Partial<RenderOptions>): string;

// src/index.ts — additional export
export { renderFallback } from './fallback.js';
```
- `legendText` in `render.ts` is rewritten to map `LEGEND_ENTRIES` to colored/muted tspans, producing the same bytes as today.
- `renderFallback` normalizes the input (strip one trailing `\n`), then appends `\n\n` + `legendPlainText()` when `legend ?? true`, else returns the normalized tree alone. It does not call `render()`/`measure()`.

**Commit plan.**
1. `test: add renderFallback specs` — failing `src/fallback.test.ts`. (tests-first)
2. `refactor: extract shared legend definition into legend.ts` — introduce `LEGEND_ENTRIES` + `legendPlainText`, rewire `render.ts`'s `legendText` to consume them; SVG output unchanged, existing tests green. (refactor only, no behavior change)
3. `feat: add renderFallback and export it` — implement `src/fallback.ts` on top of `legendPlainText`, export from `index.ts`. (turns fallback tests green)

**Done when.** Fallback tests green; SVG legend regression green; `pnpm test && pnpm lint && pnpm typecheck` green.

---

## Phase 3 — CLI argument parsing and input resolution

**Behavior delivered.** Two pure, unit-tested modules: argv → options, and (options + buffered stdin) → resolved tree text with all input-mode errors. No process wiring yet.

**Test cases** (new `src/cli-args.test.ts`, `src/cli-input.test.ts`):

`parseArgs`:
- `--text x` / `-t x`, `--file p` / `-f p`, `--output p` / `-o p` populate the matching fields. (unit)
- `--no-legend` → `legend:false`; `--no-fallback` → `fallback:false`; defaults are `legend:true`, `fallback:true`. (unit)
- `--help` / `-h` → `help:true`. (unit)
- Unknown flag `--bogus` → throws `CliError`. (unit)
- `--text` with no following value → throws `CliError`. (unit)

`resolveTreeText`:
- only `--text "a\nb"` → returns `"a\nb"`. (unit)
- only stdin present → returns the stdin content. (unit)
- only `--file p` (temp file with a tree) → returns the file content. (unit)
- two modes present (e.g. text + stdin) → `CliError('exactly one Change Tree input must be provided')`. (unit)
- no mode present → `CliError('Change Tree input is required')`. (unit)
- `--text "   "` (whitespace only), single mode → `CliError('Change Tree input is required')`. (unit)
- `--file p` where `p` is absent/unreadable → `CliError('Change Tree file could not be read: ' + p)`. (unit; temp dir)
- `--file p` where `p` is an empty file → `CliError('Change Tree input is required')`. (unit; temp dir)

**Components.**
```typescript
// src/cli-error.ts (new)
export class CliError extends Error {}   // message is the bare user-facing string

// src/cli-args.ts (new)
export interface CliOptions {
  text: string | null;
  file: string | null;
  output: string | null;
  legend: boolean;     // default true
  fallback: boolean;   // default true
  help: boolean;
}
export const USAGE: string;              // one-line-per-flag usage, lists the three input + two output modes
export function parseArgs(argv: string[]): CliOptions;   // argv excludes node + script; throws CliError on bad flag/missing value

// src/cli-input.ts (new)
export interface TreeInputSources {
  text: string | null;     // from --text (flag present even if "")
  file: string | null;     // path from --file
  stdin: string | null;    // buffered stdin, or null when TTY / whitespace-only
}
export function resolveTreeText(sources: TreeInputSources): string;   // throws CliError per decisions 9–12
```
Resolution rule (prose): count present modes — `text !== null`, `file !== null`, `stdin !== null`. ≥2 → collision error. 0 → required error. Otherwise take the single present mode: `text` used as-is, `file` read via `fs.readFileSync` (read failure → file-read error), `stdin` used as-is; then if the chosen content is whitespace-only → required error; else return it.

**Commit plan.**
1. `test: add CLI argument parsing specs` — failing `cli-args.test.ts`. (tests-first)
2. `feat: add CliError and parseArgs` — `src/cli-error.ts`, `src/cli-args.ts` with `CliOptions`, `USAGE`, `parseArgs`. (green for args tests)
3. `test: add CLI input resolution specs` — failing `cli-input.test.ts`. (tests-first)
4. `feat: add resolveTreeText` — `src/cli-input.ts` with `TreeInputSources` and resolution rules. (green for input tests)

**Done when.** Args + input-resolution tests green; library and Stage 1 tests unaffected; `pnpm test && pnpm lint && pnpm typecheck` green.

---

## Phase 4 — CLI entry, output routing, and bin

**Behavior delivered.** `change-tree-svg` runs end to end: reads a tree from text/file/stdin, renders SVG + optional fallback, routes them to stdout or a file per the routing table, handles `--help` and all errors with correct exit codes. Installable as a bin.

**Test cases** (new `src/cli.test.ts`, driving the in-process `runCli` with injected streams + temp dirs):
- default (`--text tree`) → stdout is `SVG\n\nfallback\n`; SVG contains `<svg`, ends `</svg>` before the `\n\n`; return 0. (integration)
- `--text tree --no-fallback` → stdout is `SVG\n` (no `\n\n`, no legend-less fallback); return 0. (integration)
- `--text tree -o out.svg` → `out.svg` contains pure SVG (`render()` output, no trailing CLI newline); stdout is `fallback\n`; return 0. (integration; temp dir)
- `--text tree -o out.svg --no-fallback` → `out.svg` written; stdout empty; return 0. (integration; temp dir)
- `--text tree --no-legend` → SVG has no legend; fallback (when present) has no legend line. (integration)
- stdin mode (inject `stdin`, `stdinIsTTY:false`) → renders from stdin. (integration)
- `-o` into an unwritable path → stderr `SVG file could not be created: <path>`; no stdout SVG; return 1. (integration; temp dir)
- collision (text + stdin) → stderr `exactly one Change Tree input must be provided`; return 1. (integration)
- no input → stderr `Change Tree input is required`; return 1. (integration)
- over-wide tree → stderr starts `Cannot render tree:`; return 1 (RenderError path). (integration)
- `--help` → stdout contains `USAGE`; return 0. (integration)
- unknown flag → stderr contains usage; return 1. (integration)

**Components.**
```typescript
// src/cli.ts (new)
export interface CliIO {
  argv: string[];          // args after node + script
  stdin: string | null;    // pre-buffered stdin content, or null when TTY
  stdout: (s: string) => void;
  stderr: (s: string) => void;
}
export function runCli(io: CliIO): number;   // returns exit code; never calls process.exit

// bin bottom of src/cli.ts (not unit-tested; process glue):
//   #!/usr/bin/env node
//   const stdin = process.stdin.isTTY ? null : readFileSync(0, 'utf8');
//   process.exit(runCli({ argv: process.argv.slice(2), stdin, stdout: s => process.stdout.write(s), stderr: s => process.stderr.write(s) }));
```
```jsonc
// package.json — addition
"bin": { "change-tree-svg": "dist/cli.js" }
```
`runCli` flow (prose): `parseArgs(argv)`; if `help` → `stdout(USAGE)`, return 0; build `TreeInputSources` (stdin coerced to `null` when whitespace-only); `resolveTreeText` → tree; `render(tree, { legend })` and, when `fallback`, `renderFallback(tree, { legend })`; route per decision 15 (with `-o`: write SVG to file, on write failure emit the file-create error and return 1, else emit fallback to stdout; without `-o`: emit `SVG` + optional `\n\n` + fallback + trailing `\n`). Any `CliError` → `stderr(message)`, return 1. Any `RenderError` → `stderr(err.message)`, return 1.

**Commit plan.**
1. `test: add CLI runCli integration specs` — failing `cli.test.ts`. (tests-first)
2. `feat: add runCli orchestration and output routing` — `src/cli.ts` `runCli` + `CliIO`. (turns integration tests green)
3. `feat: wire change-tree-svg bin` — shebang + process bottom in `cli.ts`, `package.json` `"bin"`. (process glue; verified by typecheck + manual `node dist/cli.js`)

**Done when.** All CLI integration tests green; `pnpm test && pnpm lint && pnpm typecheck` green; `pnpm build` emits `dist/cli.js` and `node dist/cli.js --text '++ a.ts'` prints SVG + fallback.

---

## Phase Order and Dependencies

```
Phase 1 (legend toggle)
  └── Phase 2 (shared legend + renderFallback)
        └── Phase 3 (CLI args + input resolution)
              └── Phase 4 (CLI entry + output routing + bin)
```
Each phase ends with the verification command green. Phase 4 depends on Phases 1–3 (legend option, `renderFallback`, `parseArgs`/`resolveTreeText`).

## Out of scope

- Visual style / render fidelity changes — owned by Stage 1.
- npm packaging metadata beyond `"bin"`, `files`/publish config, and the README — owned by Stage 3.
- PNG output, image hosting, PR posting — Beyond Scope (never).
- Any input/output flag beyond those in the decisions table (e.g. `--max-width` exposure).
- A spawn-based end-to-end test of the built bin; the bin bottom is thin process glue verified by typecheck and one manual run.

## Open Questions

None. All load-bearing decisions were resolved in the planning dialogue and confirmed (`AGREED`).
