# Stage 2.5 Phased Plan — Source Tree Reorganization

Source: [`stage-2.5-refactor.md`](stage-2.5-refactor.md). Behavior source of truth unchanged: [`change-tree-svg-functional-spec.md`](change-tree-svg-functional-spec.md).

Verification command (every phase must end green): `pnpm test && pnpm lint && pnpm typecheck`

---

## Goal

`src/` stops being 21 files at one level. Engine modules move under `src/engine/`, CLI modules under `src/cli/`, and the public façade `index.ts` stays at `src/` root. Output is byte-identical — pure file relocation, no logic touched. The public `import` entry (`change-tree-svg` → `dist/index.js`) and the `change-tree-svg` bin still work; the bin path becomes `dist/cli/cli.js`. After this stage a reader can tell engine from CLI by location, before Stage 3 publishes the package.

## Context

Current `src/` (flat) and the dependency graph that drives the move order:

- **Façade** — `index.ts` (+ `index.test.ts`). Package `main`/`types`. Imports `parse`, `layout`, `render`, `types`, `error`, `fallback`. Re-exports `render()`, `RenderError`, `renderFallback`, `RenderOptions`.
- **Engine** — `parse`, `layout`, `render`, `palette`, `types`, `error`, `legend`, `fallback` (+ tests `parse`, `layout`, `render`, `fallback`). Internal edges: `parse`→`types`; `legend`→`types`; `fallback`→`types`,`legend`; `layout`→`error`,`types`,`palette`; `render`→`types`,`palette`,`legend`. No engine module imports any CLI module.
- **CLI** — `cli`, `cli-args`, `cli-input`, `cli-error` (+ tests `cli`, `cli-args`, `cli-input`). `cli`→`cli-args`,`cli-input`,`cli-error`,`error`,`fallback`,`index`(façade). `cli-args`→`cli-error`; `cli-input`→`cli-error`. CLI depends on engine + façade; nothing depends on CLI.

Build/config facts the plan leans on:

- `tsconfig.json` — no `rootDir`; inferred root = common ancestor of inputs = `src/`, `outDir: dist`. dist mirrors the src tree. `include: ["src/**/*.ts"]` (TS globstar) matches nested → no change. Façade stays at `src/index.ts` → stays `dist/index.js`, so `main`/`types` are untouched.
- `package.json` — `main: dist/index.js`, `types: dist/index.d.ts`, `bin.change-tree-svg: dist/cli.js`, `lint: eslint src/**/*.ts`. No `files` field.
- `vitest.config.ts` `include: ['src/**/*.test.ts']` and `eslint.config.js` `files: ['src/**/*.ts']` both use globstar → match nested → no change.
- ESM `NodeNext`, relative imports carry `.js` suffixes. Tests colocated, run by vitest.

**Byte-identity is guaranteed by construction.** A pure file move touches no logic, so output cannot change. The existing suite asserts structure (`toContain`), not bytes, so it is not the byte guard — construction is. Confirm once with an uncommitted scratch diff (below); add no committed snapshot test (out of scope — the project deliberately left output unpinned).

**Scratch byte guard (uncommitted, run during execution).** Before Phase 1, from the pre-refactor `HEAD`: build, capture `node dist/cli.js --text '++ a.ts'` (SVG + fallback) and `node dist/cli.js --text '++ a.ts' --no-legend` to a scratch file outside the repo (e.g. `/tmp/ct-ref.txt`). After Phase 1, re-run `render()` paths via the suite. After Phase 2, rebuild and diff `node dist/cli/cli.js …` against the scratch reference — must be identical. Delete the scratch file when done; nothing committed.

## Agreed Decisions

| # | Decision |
|---|----------|
| 1 | Two subdomain folders: `src/engine/` (parse, layout, render, palette, types, error, legend, fallback + their tests) and `src/cli/` (cli, cli-args, cli-input, cli-error + their tests). |
| 2 | `index.ts` and `index.test.ts` stay at `src/` root as the package façade. `types.ts` goes in `src/engine/` — no CLI module imports it. |
| 3 | `package.json`: `bin.change-tree-svg` `dist/cli.js` → `dist/cli/cli.js`. `main`/`types` unchanged. No `files` field exists; none added (Stage 3). |
| 4 | `tsconfig.json`: no `rootDir` added; `include` unchanged. `vitest.config.ts` and `eslint.config.js` globs unchanged. |
| 5 | `lint` script `eslint src/**/*.ts` → `eslint src` (shell-independent; flat-config `files` filter still applies). |
| 6 | Intra-engine and intra-CLI imports unchanged — each folder's members move together, preserving relative paths between them. |
| 7 | Engine moves before CLI (CLI depends on engine + façade). |
| 8 | Doc refs: rewrite only the 6 markdown link targets in `stage-2-phased-plan.md` lines 18-21 (parse, layout, render, palette, types, error → `../../src/engine/…`); line 17 `index.ts` stays root. Leave examples notation content, all bin-path prose (incl. line 230), inline anchors (`render.ts:83`/`:106`), and all stage-1/stage-2 historical prose untouched. |

## Note on commit hygiene

The standard "move in one commit, change contents in the next" rule is **inverted here by the stage constraint that every commit stay green**. A file move forces its importers' path specifiers to change in the same commit — splitting them produces a broken (red) intermediate. So each move commit relocates files *and* retargets the import specifiers the move necessitates, and nothing else. No logic changes; these stay pure relocations. Genuinely independent changes (the lint-glob flip) are split into their own commits.

---

## Phase 1 — Engine folder

**Behavior delivered.** Engine modules live under `src/engine/`; the façade and CLI import them from there. Public `render()` output and the suite are unchanged. `lint` no longer depends on shell globstar.

**Test cases.** No new tests — this is a relocation, and adding a byte-pinning snapshot is out of scope. The drivers are:
- Existing suite stays green: `parse`, `layout`, `render`, `fallback`, `index` tests resolve their (moved) imports and pass. Level: unit/integration, existing.
- `pnpm lint` covers nested files after the glob flip. Level: tooling.
- Scratch byte guard: `render()`-path output (via `index`/`render` tests) matches the pre-refactor reference. Level: manual, uncommitted.

**Components.** No new abstractions, types, or signatures. Structural moves only:
- `src/{parse,layout,render,palette,types,error,legend,fallback}.ts` → `src/engine/…`
- `src/{parse,layout,render,fallback}.test.ts` → `src/engine/…`
- Import specifier retargets, exhaustive:
  - `src/index.ts`: `./parse.js`→`./engine/parse.js`, `./layout.js`→`./engine/layout.js`, `./render.js`→`./engine/render.js`, `./types.js`→`./engine/types.js`, `./error.js`→`./engine/error.js`, `./fallback.js`→`./engine/fallback.js` (6 specifiers).
  - `src/cli.ts`: `./error.js`→`./engine/error.js`, `./fallback.js`→`./engine/fallback.js` (2 specifiers). `./index.js` stays (façade still at root).
  - Intra-engine imports: unchanged (members moved together).

**Commit plan.**
1. `chore: lint src directory not glob` — `package.json` `lint` `eslint src/**/*.ts` → `eslint src`. Independent of the move; green before and after. (No move, single-line tooling change.)
2. `refactor: move engine modules into src/engine/` — `git mv` the 8 engine modules + 4 tests; retarget the 6 specifiers in `index.ts` and 2 in `cli.ts`. (Pure relocation; only move-forced path edits, no logic.)

**Done when.** `pnpm test && pnpm lint && pnpm typecheck` green. `src/engine/` holds the 8 modules + 4 tests; `index.ts`, `index.test.ts`, and all 4 CLI files remain at root. Scratch byte guard matches.

## Phase 2 — CLI folder

**Behavior delivered.** CLI modules live under `src/cli/`. Built bin path is `dist/cli/cli.js`; `node dist/cli/cli.js --text '++ a.ts'` prints byte-identical SVG + fallback. `main`/`types` unchanged.

**Test cases.**
- Existing CLI suite stays green: `cli`, `cli-args`, `cli-input` tests resolve moved imports and pass. Level: integration/unit, existing.
- `pnpm build` emits `dist/cli/cli.js`. Bin smoke: `node dist/cli/cli.js --text '++ a.ts'` exits 0, prints SVG + fallback. Level: e2e/manual.
- Scratch byte guard: rebuilt-bin output matches the pre-refactor reference for both `--text '++ a.ts'` and `--no-legend`. Level: manual, uncommitted.

**Components.** No new abstractions. Structural moves only:
- `src/{cli,cli-args,cli-input,cli-error}.ts` → `src/cli/…`
- `src/{cli,cli-args,cli-input}.test.ts` → `src/cli/…`
- Import specifier retargets, exhaustive (in moved `src/cli/cli.ts`):
  - `./index.js`→`../index.js` (façade)
  - `./engine/error.js`→`../engine/error.js`, `./engine/fallback.js`→`../engine/fallback.js`
  - `./cli-args.js`, `./cli-input.js`, `./cli-error.js`: unchanged (members moved together).
- `package.json`: `bin.change-tree-svg` `dist/cli.js` → `dist/cli/cli.js`.

**Commit plan.**
1. `refactor: move CLI modules into src/cli/` — `git mv` the 4 CLI modules + 3 tests; retarget `cli.ts` façade/engine specifiers; update `package.json` `bin` to `dist/cli/cli.js`. The bin path change is the move's dist consequence, same logical change. (Pure relocation; move-forced path + bin edits, no logic.)

**Done when.** Full verification green. `pnpm build` emits `dist/cli/cli.js`; bin smoke prints SVG + fallback; scratch byte guard matches. `src/cli/` holds the 4 modules + 3 tests; only `index.ts` + `index.test.ts` remain at `src/` root alongside `engine/` and `cli/`.

## Phase 3 — Fix moved-file doc links

**Behavior delivered.** The 6 now-broken markdown link targets in the Stage 2 plan resolve to the relocated engine files. No code touched.

**Test cases.** None (docs-only). Verification: `pnpm test && pnpm lint && pnpm typecheck` still green (trivially); each rewritten link target points at an existing file.

**Components.** `plans/000/stage-2-phased-plan.md`, lines 18-21 link targets only:
- `](../../src/parse.ts)` → `](../../src/engine/parse.ts)`
- `](../../src/layout.ts)` → `](../../src/engine/layout.ts)`
- `](../../src/render.ts)` → `](../../src/engine/render.ts)`
- `](../../src/palette.ts)` → `](../../src/engine/palette.ts)`
- `](../../src/types.ts)` → `](../../src/engine/types.ts)`
- `](../../src/error.ts)` → `](../../src/engine/error.ts)`
- Line 17 `](../../src/index.ts)` stays. Inline anchors `render.ts:83`/`:106`, the `dist/cli.js` bin prose (line 230), and all other historical prose stay.

**Commit plan.**
1. `docs: fix moved-file link targets in stage-2 plan` — rewrite the 6 link targets above. (Docs-only, no behavior.)

**Done when.** Verification green; the 6 link targets resolve to `src/engine/…`; no other line in the Stage 2 doc changed.

## Out of scope

- Any rendering-output, CLI-behavior, public-API, option-name, or error-message change. Byte-identical SVG and fallback. (Frozen by spec.)
- Renaming modules or splitting/merging their contents. (Stage 2.5 moves files only.)
- New abstractions, dependencies, barrel files, or a committed output-snapshot test. (Byte-identity rests on construction.)
- `files` field, README, packaging/publish. (Stage 3.)
- Rewriting historical plan/PR prose or example notation content. (Decision 8.)
