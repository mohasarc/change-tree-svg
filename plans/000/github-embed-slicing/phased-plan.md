# Phased plan — GitHub-embeddable scrollable Change Tree

Render Change Tree SVG so it embeds in a GitHub PR/comment as a horizontally-scrollable strip set, with a one-shot CLI that slices, uploads, and emits the embed markup.

Source design: grill session 2026-06-28 (see memory `slicing-upload-skill-design`). Findings: `/Users/moyaseen/projects/symnav/github-wide-svg-horizontal-scroll.md`.

## Goal

After all phases: `npx change-tree-svg embed -f tree.txt` turns authored notation into a `<pre>` block of vertical SVG strips hosted on an orphan `media` branch, which GitHub renders as a horizontally-scrollable, full-fidelity vector tree inside a PR or comment. The library gains a bare (no background, no padding) default render plus pure `slice` and `markup` functions; the CLI gains `render`/`slice`/`markup`/`upload`/`embed` subcommands. README shows the live scrollable embed; an installable agent skill drives the flow.

## Context

- **Engine** (`src/engine/`, pure): `parse.ts` → `ParsedLine[]`; `layout.ts` `measure()` → `LayoutMetrics` (uses `H_PADDING`/`V_PADDING` from `palette.ts`); `render.ts` `renderSvg()` builds the full `<svg>` (style, title, desc, a `<rect>` container fill, then `<text>` lines) and exports `djb2()`; `legend.ts`, `fallback.ts`. Public surface re-exported from `src/index.ts`: `render`, `renderFallback`, `RenderError`, `RenderOptions`.
- **CLI** (`src/cli/`): `cli-args.ts` parses a flat flag set into `CliOptions`; `cli-input.ts` `resolveTreeText()`; `cli.ts` `runCli(io)` with injectable `CliIO` (argv/stdin/stdout/stderr) — already test-friendly.
- **Tests**: vitest, co-located `*.test.ts`. `render.test.ts` asserts on output substrings (no coordinate/rect assertions). `layout.test.ts` asserts `canvasWidth`/`canvasHeight`/`hPadding`/`vPadding` against the padded formula with `measure(parsed, {})` — these break when the default flips to bare and must be updated.
- **Reused**: `djb2` (content hash), `LayoutMetrics`/`ParsedLine`, the `renderSvg` text-emission logic (windowed by `viewBox` for strips), `CliIO` injection pattern (extended to inject a `gh` runner for upload tests).
- **Repo**: `git remote origin` = `https://github.com/mohasarc/change-tree-svg.git`.

---

## Phase 1 — Spec & scope governance (docs)

**Behavior delivered.** The functional spec and contributor rules permit slicing + GitHub upload, so later phases don't violate the "narrow scope" rule. No code.

**Test cases.** None — documentation only.

**Components.**
- `plans/000/change-tree-svg-functional-spec.md`: new sections — *Bare vs container render*, *Slicing for GitHub embed*, *Publishing strips (orphan `media` branch)*, *Embed markup contract*. Document the light-mode-only embed limitation (`prefers-color-scheme` dead in `<img>`-SVG).
- `AGENTS.md`: relax the rule line *"Do not expand scope into git diff parsing, GitHub posting, …"* to carve out CLI-driven strip upload as in-scope; keep git-diff parsing / summary generation out.

**Commit plan.**
1. `docs: bring slicing and strip upload into the functional spec` — spec sections only.
2. `docs: allow CLI strip upload in contributor scope rule` — AGENTS.md rule edit only.

**Done when.** Spec describes bare default, slicing, orphan-branch publish, and embed markup; AGENTS.md no longer forbids the upload work.

---

## Phase 2 — Extract `djb2` to a shared module (refactor)

**Behavior delivered.** None observable — `djb2` moves so both render and the upload hash can import it without cycling through `render.ts`.

**Test cases.**
- `hash.test.ts` (unit): same string → same token; different strings → different tokens; output is `[0-9a-z]+`. Moved/duplicated from existing render-hash coverage if any; otherwise new.

**Components.**
```ts
// src/engine/hash.ts
export function djb2(input: string): string;
```
`render.ts` re-exports `djb2` from `./hash.js` (or imports and re-exports) so `index.ts`'s existing export path is unchanged.

**Commit plan.**
1. `test: cover djb2 hash in its own module` — failing test against `hash.ts` (not yet present).
2. `refactor: move djb2 into engine/hash.ts` — pure move, `render.ts` imports/re-exports it. No behavior change.

**Done when.** `djb2` lives in `hash.ts`; all existing tests and the new `hash.test.ts` green; public export unchanged.

---

## Phase 3 — Extract `renderInner` (refactor, no behavior change)

**Behavior delivered.** None observable. `renderSvg`'s drawable content (style block + `<text>` lines) is factored into a reusable `renderInner`, so slicing can window the same inner content under different `viewBox`es.

**Test cases.**
- `render.test.ts` (unit): existing assertions stay green unchanged (proves the refactor is behavior-preserving).
- Add: `renderInner` output contains the `<style>` block and one `<text` per non-empty line, and contains no `<svg`, no `<rect`, no `<title` (unit).

**Components.**
```ts
// src/engine/render.ts
export function renderInner(lines: ParsedLine[], metrics: LayoutMetrics): string; // <style> + <text>… only
export function renderSvg(lines: ParsedLine[], metrics: LayoutMetrics, inputHash: string): string; // unchanged signature; now composes renderInner
```
`renderSvg` keeps emitting the same bytes (svg wrapper + title/desc/role + rect + `renderInner(...)`). Text x/y still derived from `metrics.hPadding`/`vPadding`/`lineHeight` exactly as today.

**Commit plan.**
1. `test: assert renderInner emits style and text without svg wrapper` — failing (function absent).
2. `refactor: extract renderInner from renderSvg` — pure extraction; `renderSvg` output byte-identical for existing inputs.

**Done when.** `renderInner` exists and is used by `renderSvg`; full existing suite green; new `renderInner` tests green.

---

## Phase 4 — Bare default render + `container` opt-in

**Behavior delivered.** `render(input)` now returns a **bare** SVG: no `<rect>` background, content-tight `viewBox`, no decorative padding. `render(input, { container: true })` returns the previous padded, rounded, translucent-panel SVG for standalone use.

**Test cases.**
- `render.test.ts` (unit): default output contains **no** `<rect`; `{ container: true }` output **contains** `<rect` with `var(--ct-fill)` and `rx="8"`.
- `render.test.ts` (unit): default `viewBox`/`width` start at content origin (text x === 0), container mode insets text by `H_PADDING`.
- `layout.test.ts` (unit): **update** existing dim assertions — default (`measure(parsed, {})`) now uses bare padding (`hPadding === 0`, `vPadding` === the glyph-descent allowance, not `V_PADDING`); add a `{ container: true }` case asserting the original `H_PADDING`/`V_PADDING` formula.
- `layout.test.ts` (unit): bare `canvasHeight` still contains the last line's descenders (no glyph clipping) and bare `canvasWidth === ceil(maxChars * CHAR_WIDTH)`.

**Components.**
```ts
// src/engine/types.ts
export interface RenderOptions {
  maxLineWidth?: number;
  legend?: boolean;
  container?: boolean; // default false → bare
}
export interface LayoutMetrics {
  /* …existing… */
  container: boolean;
}
```
- `measure(lines, options)`: `container = options.container ?? false`. When bare, `hPadding = 0` and `vPadding` = a small descent allowance (≈ `0.3 * FONT_SIZE`, enough to keep descenders inside the box — *not* the 19px panel padding). When container, current `H_PADDING`/`V_PADDING`.
- `renderSvg`: draw the `<rect>` only when `metrics.container`; `viewBox`/`width`/`height` follow the (bare or padded) metrics. `renderInner` text coordinates already key off `metrics.hPadding`/`vPadding`, so no per-line change.
- `palette.ts`: add `DESCENT_ALLOWANCE` (or compute inline) — declarative constant for the bare bottom inset.

**Commit plan.**
1. `test: bare render drops rect and padding, container restores them` — update `render.test.ts` + `layout.test.ts` (failing).
2. `feat: add container option, default render to bare` — `types.ts` + `measure` + `renderSvg` honor `container`; bare is default.

**Done when.** Default `render` is bare; `{ container: true }` reproduces the prior panel; updated layout + render suites green.

---

## Phase 5 — `slice()` engine function

**Behavior delivered.** `slice(input, options?)` returns an array of strip SVG strings — the bare render windowed into ≤`stripWidth`-wide vertical slices, each at native height, ready to host.

**Test cases.**
- `slice.test.ts` (unit): a tree wider than `stripWidth` yields `ceil(totalWidth / stripWidth)` strips; a tree narrower yields exactly 1.
- (unit): every strip starts with `<svg`, declares `width` ≤ `stripWidth`, shares an identical `height`, and carries the `<style>` block (so CSS vars resolve standalone).
- (unit): strip `i` has `viewBox` x-offset `= i * windowWidth` and the inner content is byte-identical across strips (only the wrapper differs).
- (unit): no `<rect>` in any strip; determinism — same input+options → identical array.
- (unit): `height` option scales the rendered box uniformly (display width shrinks proportionally) while `viewBox` window is unchanged.

**Components.**
```ts
// src/engine/types.ts
export interface SliceOptions {
  stripWidth?: number; // default 240
  height?: number;     // default native canvas height
}

// src/engine/slice.ts
export function slice(input: string, options?: Partial<RenderOptions & SliceOptions>): string[];
```
Algorithm (prose, no body): parse → `measure` forced to bare (`container: false`) → `renderInner` once → compute uniform scale `s = (height ?? H) / H`, original-unit window `= stripWidth / s`, strip count `= ceil(W / window)`; for each strip emit `<svg xmlns width=round(wOrig*s) height=round(H*s) viewBox="(xOrig) 0 (wOrig) H">{inner}</svg>`. Mirrors the findings' `slice.mjs`, but `W`/`H`/inner come from our own metrics — no regex/estimation.

`palette.ts`: add `DEFAULT_STRIP_WIDTH = 240`.

**Commit plan.**
1. `test: slice windows bare render into strip SVGs` — `slice.test.ts` failing.
2. `feat: add SliceOptions type` — type-only, no callsites.
3. `feat: add slice() engine function` — implementation + `index.ts` export.

**Done when.** `slice` returns correct strip counts/widths/viewBoxes; suite green; exported from `index.ts`.

---

## Phase 6 — `embedMarkup()` engine function

**Behavior delivered.** `embedMarkup(urls)` returns the exact `<pre>` block GitHub needs: each strip URL wrapped `<picture><img src=… alt=""></picture>`, concatenated with zero whitespace, inside one `<pre>`.

**Test cases.**
- `markup.test.ts` (unit): N urls → one `<pre>…</pre>`, N `<picture>` wrappers, N `<img`, each `alt=""`.
- (unit): **no** whitespace between adjacent `</picture><picture>` and between `<pre>` and first `<picture>` (regex asserts no `>` `whitespace` `<`).
- (unit): each `<img>` is inside a `<picture>` (GitHub-linkify avoidance); urls appear in order; output is a single line.
- (unit): empty array → throws / documented error (decide: throw `RenderError`).

**Components.**
```ts
// src/engine/markup.ts
export function embedMarkup(urls: string[]): string;
```

**Commit plan.**
1. `test: embedMarkup builds whitespace-free picture/pre block` — failing.
2. `feat: add embedMarkup engine function` — implementation + `index.ts` export.

**Done when.** Markup matches the findings' three rules (picture wrap, zero whitespace, single `<pre>`); suite green; exported.

---

## Phase 7 — Upload helpers + `gh` orchestration

**Behavior delivered.** Pure helpers resolve the repo slug, build content-addressed strip paths, and compute raw URLs; an orchestrator publishes strips to the orphan `media` branch as one atomic commit via the `gh` Git Data API, idempotently. Network code is isolated behind an injectable runner.

**Test cases.**
- `remote.test.ts` (unit): `parseRemoteUrl` handles `https://github.com/o/r.git`, `https://github.com/o/r`, `git@github.com:o/r.git` → `{owner:'o',repo:'r'}`; non-GitHub / garbage → `null`.
- `assets.test.ts` (unit): `stripFiles(strips, hash)` → paths `trees/<hash>/p0.svg…`; `rawUrl(slug, branch, path)` === `https://raw.githubusercontent.com/<o>/<r>/<branch>/<path>`.
- `upload.test.ts` (unit, fake `GhRunner`): first publish issues the branch-ensure → blobs → tree → commit → ref-update sequence (assert call order/args); when the contents probe for `trees/<hash>/` returns success, `uploadStrips` **skips** all write calls (idempotent); missing/unauthed `gh` (runner throws on `auth status`) → `assertGhAuthed` throws an error whose message says to run `gh auth login`.
- (unit): hash source — `contentHash(strips)` changes when any strip byte changes; stable otherwise.

**Components.**
```ts
// src/cli/github/remote.ts
export interface RepoSlug { owner: string; repo: string }
export function parseRemoteUrl(url: string): RepoSlug | null;

// src/cli/github/assets.ts
export interface StripFile { path: string; svg: string }
export function contentHash(strips: string[]): string;            // djb2(strips.join(''))
export function stripFiles(strips: string[], hash: string): StripFile[]; // trees/<hash>/p<i>.svg
export function rawUrl(slug: RepoSlug, branch: string, path: string): string;

// src/cli/github/gh.ts
export type GhRunner = (args: string[]) => string;                 // returns stdout
export const ghRunner: GhRunner;                                   // execFileSync('gh', args)
export function assertGhAuthed(run: GhRunner): void;               // `gh auth status`; throws friendly error

// src/cli/github/upload.ts
export interface UploadTarget { slug: RepoSlug; branch: string }   // branch default 'media'
export function uploadStrips(run: GhRunner, target: UploadTarget, files: StripFile[]): string[]; // returns raw URLs
```
Orchestration (prose): ensure `media` ref exists (create orphan from default-branch tip if missing); probe `gh api repos/o/r/contents/trees/<hash>?ref=media` — on success, return `rawUrl`s without writing (idempotent skip, avoids the raw 404 cache); else POST a blob per strip, build a tree on the branch tip `base_tree`, create one commit, PATCH the ref. All writes through `gh api`. Returns deterministic raw URLs.

**Commit plan.**
1. `test: parse GitHub remote urls to owner/repo` — `remote.test.ts` failing.
2. `feat: add parseRemoteUrl` — implementation.
3. `test: content-addressed strip paths and raw urls` — `assets.test.ts` failing.
4. `feat: add StripFile type` — type-only.
5. `feat: add contentHash, stripFiles, rawUrl` — implementation (imports `djb2` from `engine/hash.js`).
6. `test: gh runner orchestration and idempotent skip` — `upload.test.ts` with fake runner, failing.
7. `feat: add GhRunner type and assertGhAuthed` — type + auth guard.
8. `feat: add uploadStrips atomic publish` — orchestration.

**Done when.** Pure helpers + orchestration unit-tested against a fake runner; idempotent skip and friendly auth error verified; real network run deferred to Phase 9 manual check.

---

## Phase 8 — CLI subcommand dispatch + pure commands (`render`/`slice`/`markup`)

**Behavior delivered.** The CLI dispatches on a leading subcommand. `render` (also the bare-invocation default) prints SVG as today; `slice` writes `p0.svg…pN.svg` to `--out-dir`; `markup` reads strip filenames + `--base-url` and prints the `<pre>`. No network.

**Test cases.**
- `cli-args.test.ts` (unit): leading token `render|slice|markup|upload|embed` sets `command`; absent → `render`; unknown subcommand → error; new flags parse (`--strip-width`, `--height`, `--out-dir`, `--base-url`, `--repo`, `--branch`); existing flags still parse.
- `cli.test.ts` (integration, injected `CliIO`): `slice` writes the expected number of files to a temp `--out-dir` and prints their names; `markup --base-url X` over a dir of `p*.svg` prints a `<pre>` whose `src`s are `X/p0.svg…`; `render` output unchanged from today.

**Components.**
```ts
// src/cli/cli-args.ts
export type Command = 'render' | 'slice' | 'markup' | 'upload' | 'embed';
export interface CliOptions {
  command: Command;
  text: string | null; file: string | null; output: string | null;
  legend: boolean; fallback: boolean; container: boolean;
  stripWidth: number; height: number | null;
  outDir: string | null;   // slice
  baseUrl: string | null;  // markup
  repo: string | null;     // upload/embed override
  branch: string;          // default 'media'
  help: boolean;
}
export const USAGE: string; // extended with subcommands
```
- `src/cli/commands/render.ts`, `slice.ts`, `markup.ts`: each `(io, options) => number`. `runCli` parses args, then dispatches by `options.command`. `render` command preserves today's exact behavior.

**Commit plan.**
1. `test: parse subcommands and new flags` — `cli-args.test.ts` failing.
2. `feat: add Command type and extended CliOptions` — type-only.
3. `refactor: dispatch runCli render path through a render command module` — pure move of existing render logic into `commands/render.ts`, no behavior change.
4. `test: slice and markup CLI commands` — `cli.test.ts` failing.
5. `feat: add slice and markup CLI commands` — implementation + dispatch.

**Done when.** Subcommand dispatch works; `render` byte-identical to before; `slice`/`markup` produce files/markup; suites green.

---

## Phase 9 — CLI `upload` + `embed` commands (network orchestration)

**Behavior delivered.** `upload` publishes strip files (from `--out-dir` or stdin-piped slice) and prints raw URLs. `embed` is the one-shot: notation in → slice → upload → `<pre>` with live links out. Both require authed `gh`.

**Test cases.**
- `cli.test.ts` (integration, injected `CliIO` + injected fake `GhRunner`): `embed` over a sample tree calls slice→upload→markup and prints a `<pre>` whose `src`s are the fake runner's raw URLs; unauthed runner → exit 1 with the `gh auth login` message; `--repo o/r` overrides remote detection; default uses `parseRemoteUrl(git remote)`.
- (integration): `upload` prints one raw URL per strip in order; idempotent second run prints identical URLs and issues no write calls (asserted on the fake runner).

**Components.**
```ts
// src/cli/cli.ts  — extend CliIO with an injectable runner for tests
export interface CliIO {
  argv: string[]; stdin: string | null;
  stdout: (s: string) => void; stderr: (s: string) => void;
  gh?: GhRunner;          // defaults to ghRunner; tests inject a fake
  cwd?: string;           // for git remote detection; defaults to process.cwd()
}
// src/cli/commands/upload.ts, embed.ts
export function uploadCommand(io: CliIO, options: CliOptions): number;
export function embedCommand(io: CliIO, options: CliOptions): number;
```
Repo resolution: `options.repo` (`o/r`) if given, else `parseRemoteUrl` of `git remote get-url origin` (run via the injected runner or a small git helper). `embed` composes existing `slice` + `uploadStrips` + `embedMarkup`.

**Commit plan.**
1. `test: embed and upload CLI commands with fake gh runner` — `cli.test.ts` failing.
2. `feat: inject GhRunner into CliIO` — wiring + default `ghRunner`.
3. `feat: add upload and embed CLI commands` — implementation + dispatch + USAGE.

**Done when.** `embed`/`upload` work against a fake runner; auth + override + idempotency covered. **Manual real-network verification:** run `change-tree-svg embed` against this repo, confirm strips land on `media` (one commit), raw URLs serve `image/svg+xml`, and the printed `<pre>` scrolls in a throwaway PR comment. Record result in the PR.

---

## Phase 10 — README swap to scrollable embed (docs / manual)

**Behavior delivered.** README's worked example is the live scrollable `<pre>` embed instead of the broken PNG; the "SVG in PRs" note documents the embed flow and the light-mode-only caveat.

**Test cases.** None automated. Verification is visual on GitHub.

**Components.**
- Run `embed` on the README example tree → strips on `media` → paste the printed `<pre>` into `README.md`, replacing the `![…](examples/.../example.png)` line.
- Update the "A note on SVG in PRs" section: describe `embed` + the orphan-branch host; keep the `renderFallback` option; state embed renders light-mode only.
- Remove the stale `examples/stage-3-phase-3/example.png` (broken). Keep `.svg`/`.txt`.

**Commit plan.**
1. `docs: replace README PNG with live scrollable embed` — README edit + delete broken PNG.

**Done when.** README on GitHub shows the scrollable tree at full fidelity; no PNG reference remains; caveats documented. Verified by viewing the rendered README on GitHub.

---

## Phase 11 — Installable agent skill (docs)

**Behavior delivered.** `skills/change-tree-svg/SKILL.md` exists, installable via `npx skills add mohasarc/change-tree-svg`, and is wired for this repo's own agent. Ultra-short, engineer voice, drives the one-shot `embed`.

**Test cases.** None automated.

**Components.**
- `skills/change-tree-svg/SKILL.md` (~20–30 lines): when to use; author the tree (minimal marker table + 4-line example, link to README for full rules); one command `npx change-tree-svg embed -f tree.txt` (auto-detects repo; `--repo` override); precondition `gh` authed else it errors telling you to `gh auth login`; paste the printed `<pre>`; one-line mention of `render` text fallback and that `slice`/`upload`/`markup` exist for partial use.
- Symlink `.agents/skills/change-tree-svg → ../../skills/change-tree-svg`.
- `package.json` `files` unchanged (skill rides the GitHub/skills channel, not npm).

**Commit plan.**
1. `docs: add installable change-tree-svg agent skill` — SKILL.md.
2. `chore: symlink skill into .agents/skills` — local symlink only.

**Done when.** Skill installs cleanly via `npx skills` into another project; local agent here resolves it; content follows the writing-voice rule and stays under ~30 lines.

---

## Out of scope

- **Git-diff parsing / auto-authoring trees** — explicitly excluded by AGENTS.md; the package still renders only authored notation.
- **Posting the embed to a PR/comment automatically** — the CLI prints the `<pre>`; pasting/posting is the caller's (or skill's) job, not the package's.
- **Shipping the skill via npm `files`** — deferred; skill distribution stays on the `skills`/GitHub channel.
- **Non-GitHub hosts (gist, jsDelivr, Releases)** — rejected in design (Releases can't serve inline SVG; gist has the 300-file cap + delete-rot). Orphan branch only.
- **Dark-mode embeds** — impossible in `<img>`-SVG on GitHub; not pursued.
- **MP4 scrubber / animated-pan alternatives** from the findings — different goal, not this plan.
