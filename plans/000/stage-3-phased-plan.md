# Stage 3 Phased Plan — Publish and documentation

Source of truth: [`stages.md`](stages.md) Stage 3 and [`change-tree-svg-functional-spec.md`](change-tree-svg-functional-spec.md) (§Documentation Expectations, §Package Access).

Verification command (every phase must end green): `npm test && npm run lint && npm run typecheck`

---

## Goal

After this stage `change-tree-svg` is a publishable npm package with a notation-first README and a verified publish path. Phase 1 adds publish metadata, an `exports` map, a LICENSE, and a build that keeps compiled tests out of the tarball. Phase 2 proves the shipped tarball renders end to end from a fresh install. Phase 3 documents Change Tree notation before rendering, per the spec. No render or I/O behavior changes — Stages 1 and 2 own that.

## Context

Stages 1, 2, and 2.5 (all landed) leave a working library + CLI:

- Public surface is exactly `render(input, options?)`, `renderFallback(input, options?)`, `RenderError`, type `RenderOptions` — all re-exported from [`src/index.ts`](../../src/index.ts). `RenderOptions` is `{ maxLineWidth?, legend? }` ([`src/engine/types.ts`](../../src/engine/types.ts)).
- Engine under `src/engine/`, CLI under `src/cli/`, façade `src/index.ts` at root (Stage 2.5).
- Bin `change-tree-svg` → `dist/cli/cli.js` (package.json `bin`). Shebang + process glue already in `src/cli/cli.ts`.
- 100 tests, colocated `*.test.ts`, run by vitest (`vitest.config.ts` include `src/**/*.test.ts`). No runtime deps. ESM, `type: module`, `NodeNext`, relative imports carry `.js`.
- `tsconfig.json`: `target ES2022`, `module/moduleResolution NodeNext`, `outDir dist`, `declaration` + `declarationMap`, `include ["src/**/*.ts"]`. No `rootDir`, so dist mirrors the src tree.
- Build is plain `tsc` — today it emits `dist/**/*.test.js` (and `.test.d.ts`) because tests are in `include`.

Today's `package.json` is minimal: `name`, `version 0.1.0`, `type module`, `main dist/index.js`, `types dist/index.d.ts`, `bin`, scripts (`build`/`test`/`lint`/`typecheck`), devDeps only. Missing every publish field: no `description`, `license`, `author`, `repository`, `homepage`, `bugs`, `keywords`, `engines`, `files`, `exports`, `publishConfig`, lifecycle scripts. No LICENSE file. `dist/` is gitignored. git remote: `https://github.com/mohasarc/change-tree-svg.git`. Author: Mohammed S. Yaseen <moha.98.1900@gmail.com>.

There is no README.

## Agreed Decisions

| # | Decision |
|---|----------|
| 1 | `package.json` gains publish metadata: `description`; `license: "MIT"`; `author` "Mohammed S. Yaseen <moha.98.1900@gmail.com>"; `repository` `{type:"git", url:"git+https://github.com/mohasarc/change-tree-svg.git"}`; `homepage` (repo `#readme`); `bugs` (repo `/issues`); `keywords ["change-tree","svg","pr","code-review","diagram"]` (no `"diff"` — contradicts the no-diff-parsing scope rule); `engines.node ">=20"` (Node 18 is EOL); `files: ["dist"]`; `publishConfig.access: "public"` (no-op for the unscoped name, kept explicit). |
| 2 | `exports` map: `"." → { "types": "./dist/index.d.ts", "import": "./dist/index.js" }`, `types` first, no `require` (ESM-only). Keep `main`/`types` as fallback for pre-`exports` resolvers. `bin` unchanged; no `./cli` subpath export. The map blocks deep imports into `dist/engine/*`. |
| 3 | Add `LICENSE` (MIT, author as above) — `license: "MIT"` without the file is incomplete. |
| 4 | `tsconfig.build.json` extends `tsconfig.json`, adds `"exclude": ["src/**/*.test.ts"]`. `build` script → `tsc -p tsconfig.build.json`. Base `tsconfig.json` stays the `typecheck` target (`tsc --noEmit`, tests still checked). `prepack` → `"npm run build"` (fires on `npm pack` and `npm publish`; `dist` is gitignored so the tarball must self-build). No `prepublishOnly`/`prepare` test gate. |
| 5 | Version stays `0.1.0` for the first publish (pre-1.0; option surface unproven by real consumers). |
| 6 | Packaged-install verification is a standalone Node script under `examples/stage-3-phase-2/` (precedent: [`examples/phase-4/generate.mjs`](../../examples/phase-4/generate.mjs)), NOT a vitest test — `npm pack` + tarball install is slow and filesystem-heavy; the unit suite stays pure. Its captured output is committed as `verification-output.txt` (existing convention: [`examples/phase-1/verification-output.txt`](../../examples/phase-1/verification-output.txt)). |
| 7 | The verification script is this stage's executable publish-path test. P1 (config) and P3 (docs) add no runtime behavior, so they carry no red vitest test — verified by build/pack/suite-green and doc review. The plan states this per phase so review does not reject P1/P3 for "missing a test." |
| 8 | README is notation-first per spec §Documentation Expectations: Change Tree notation explained before rendering; the four must-explain points covered; none of the four must-not-imply claims made (no diff reading, no deciding what changed, no validating against the diff, not a replacement for reviewing the diff). |
| 9 | README worked example is a representative tree (all four markers + `...` + `#` + nesting, anchored at `.`), rendered as a committed PNG+SVG docs asset under `examples/stage-3-phase-3/`, with the exact input shown verbatim next to the image. Uses existing unchanged render behavior — a docs asset, not new scope. GitHub strips raw SVG in markdown, so the embedded image is the PNG. |
| 10 | Live `npm publish` is OUT of automated scope (needs registry auth + OTP/2FA, a human action). The plan stops at metadata + build + docs + local tarball verification + `npm publish --dry-run`. The real publish and the post-publish "install from the live registry" check are an explicit Open Question / manual release step. |

---

## Phase 1 — Publish-ready package config

**Behavior delivered.** `npm run build` produces a `dist/` with no compiled test files; `npm pack --dry-run` lists only the intended tarball contents; the package carries full publish metadata, an `exports` map that hides internals, a MIT LICENSE, and a `prepack` build so the tarball self-builds from a gitignored `dist`. No runtime behavior changes.

**Verification** (config + packaging, no runtime behavior — no red vitest test per decision 7):
- `npm run build` then `find dist -name '*.test.*'` is empty (no `*.test.js` / `*.test.d.ts` shipped).
- `npm pack --dry-run` file list contains `dist/index.js`, `dist/index.d.ts`, `dist/cli/cli.js`, `dist/engine/*.js`, `LICENSE`, `README.md` (once Phase 3 lands), `package.json` — and no `*.test.*`, no `src/`, no `examples/`, no `plans/`.
- `npm test && npm run lint && npm run typecheck` green; base `tsconfig.json` still typechecks `src/**/*.test.ts` (tests not excluded from the typecheck target).
- Existing 100 tests unchanged.

**Components.**
```jsonc
// package.json — additions / changes
{
  "description": "Render authored Change Tree notation as a colorful SVG for PR descriptions.",
  "license": "MIT",
  "author": "Mohammed S. Yaseen <moha.98.1900@gmail.com>",
  "repository": { "type": "git", "url": "git+https://github.com/mohasarc/change-tree-svg.git" },
  "homepage": "https://github.com/mohasarc/change-tree-svg#readme",
  "bugs": "https://github.com/mohasarc/change-tree-svg/issues",
  "keywords": ["change-tree", "svg", "pr", "code-review", "diagram"],
  "engines": { "node": ">=20" },
  "files": ["dist"],
  "publishConfig": { "access": "public" },
  "exports": { ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" } },
  "scripts": { "build": "tsc -p tsconfig.build.json", "prepack": "npm run build" }
}
```
```jsonc
// tsconfig.build.json (new)
{ "extends": "./tsconfig.json", "exclude": ["src/**/*.test.ts"] }
```
- `LICENSE` (new): MIT text, copyright holder "Mohammed S. Yaseen".
- `main`/`types`/`bin` unchanged. `typecheck` (`tsc --noEmit`) keeps using base `tsconfig.json`.

**Commit plan.**
1. `build: split publish build into tsconfig.build.json` — add `tsconfig.build.json` excluding tests, point `build` at it, add `prepack`. Confirm `find dist -name '*.test.*'` empty after build.
2. `chore: add publish metadata, exports map, and engines` — the package.json fields and `exports`.
3. `docs: add MIT LICENSE` — the LICENSE file matching `license: "MIT"`.

**Done when.** `npm run build` emits no test files; `npm pack --dry-run` is clean; metadata, `exports`, LICENSE present; verification command green.

---

## Phase 2 — Packaged-install verification

**Behavior delivered.** A committed script packs the real tarball, installs it into a throwaway directory, and proves the published artifact works: the public API renders, the bin runs, internals are not deep-importable, and no test files ship. Its output is captured for review. `npm publish --dry-run` passes. Depends on Phase 1.

**Verification** (this script is the publish-path test — decision 7):
- `node examples/stage-3-phase-2/verify-packaged-install.mjs` exits 0 with all four assertions passing:
  - (a) `import { render, renderFallback, RenderError }` from the installed package; `render('.\n└── ++ a.ts')` returns a string containing `"<svg"`; `renderFallback(...)` returns the tree + legend line; `RenderError` is a constructor.
  - (b) the installed bin `change-tree-svg --text '++ a.ts'` writes SVG + fallback to stdout, exit 0.
  - (c) `import('change-tree-svg/dist/engine/render.js')` rejects with `ERR_PACKAGE_PATH_NOT_EXPORTED`.
  - (d) `npm pack --dry-run` (parsed) lists no `*.test.*` entry.
- `npm publish --dry-run` succeeds.
- `npm test && npm run lint && npm run typecheck` green (script is not in the vitest suite).

**Components.**
```javascript
// examples/stage-3-phase-2/verify-packaged-install.mjs (new) — standalone, run by node
// 1. npm pack --json -> tarball name
// 2. mkdtemp a temp dir; npm init -y; npm install <abs tarball>
// 3. assert (a) ESM import + render/renderFallback/RenderError
//    assert (b) spawn the installed bin, check SVG + fallback in stdout
//    assert (c) deep import throws ERR_PACKAGE_PATH_NOT_EXPORTED
//    assert (d) `npm pack --dry-run --json` file list has no *.test.*
// 4. print a PASS/FAIL summary; exit non-zero on any failure; clean up temp dir
```
- `examples/stage-3-phase-2/verification-output.txt` (new): captured stdout of a passing run, for the PR's Output preview.

**Commit plan.**
1. `test: add packaged-install verification script` — `verify-packaged-install.mjs` with the four assertions (this is the stage's executable test).
2. `docs: capture packaged-install verification output` — committed `verification-output.txt` from a passing run.

**Done when.** The script passes all four assertions; `npm publish --dry-run` succeeds; verification command green.

---

## Phase 3 — Notation-first README and example asset

**Behavior delivered.** A README that teaches Change Tree notation before rendering, lets a reader author a useful tree without reading source, documents the library and CLI surfaces, and embeds a rendered example — without implying the package reads or validates diffs. Independent of Phases 1–2; lands last as the user on-ramp.

**Verification** (docs — no red vitest test per decision 7):
- README covers all must-explain points (functional-spec.md:501-510): notation is an authored high-level diff overview; mainly agent→human reviewer; `++ -- ~~ **` markers; `...` folded detail; `#` comment; anchor at repo root; show important areas not every file; `change-tree-svg` renders it as a colorful SVG for GitHub PRs.
- README makes none of the must-not-imply claims (functional-spec.md:512-517): does not say the package reads diffs, decides what changed, validates the tree against the diff, or replaces reviewing the diff — and states the "what this is not" note explicitly.
- Notation section precedes the rendering section.
- Embedded image renders on GitHub (PNG, not raw SVG); the worked-example input shown matches the image.
- `npm test && npm run lint && npm run typecheck` green.

**Components.**
- `README.md` (new), section order:
  1. Title + one-line: renders authored Change Tree notation as a colorful SVG.
  2. **Change Tree notation** (first): what it is, agent→human-reviewer audience, marker / `...` / `#` table, authoring rules (anchor at `.`, important areas only), one worked example, explicit "what this is not" note (not a diff parser/validator; does not replace reading the diff).
  3. **Rendering**: install (`npm i change-tree-svg`); library usage — `render(input, options?)`, `renderFallback(input, options?)` (state its purpose: a copyable plain-text block + legend line for when the image can't render), `RenderError`, options `maxLineWidth` and `legend`; CLI usage — input modes (`--text`/`--file`/stdin), output (stdout / `-o`), `--no-legend`, `--no-fallback`, `--help`; embedded PNG; one line reconciling "render SVG for PRs" with GitHub stripping raw SVG (use the PNG / fallback path).
  4. Options reference folded into the rendering section; license line. No standalone duplicate API section.
- `examples/stage-3-phase-3/` (new): the README example tree input (`.txt`), its rendered `.svg`, and the committed `.png` embedded in the README. Generated with the existing CLI; no render-behavior change.

**Commit plan.**
1. `docs: add README example tree and rendered image` — `examples/stage-3-phase-3/` input + svg + png.
2. `docs: add notation-first README` — `README.md` embedding the Phase 3 image.

**Done when.** README teaches the notation first, documents both surfaces, embeds a rendering, makes none of the prohibited claims; verification command green.

---

## Phase Order and Dependencies

```
Phase 1 (publish-ready package config)
  └── Phase 2 (packaged-install verification)   # asserts against Phase 1's tarball/exports/files
Phase 3 (notation-first README + example)        # independent; lands last
```
Phase 2 depends on Phase 1 (it verifies the configured tarball). Phase 3 is independent of both but stacks last as the user on-ramp. Each phase ends with the verification command green.

## Out of scope

- Any render or I/O behavior change — owned by Stages 1, 2, 2.5.
- Repository-specific wrappers, PR automation, hosted rendering, PNG output as a package feature — Beyond Scope (never). The Phase 3 PNG is a committed docs asset, not a package output mode.
- A CJS build / `require` export condition — package is ESM-only.
- Bumping to `1.0.0` — deferred until the surface holds across real consumers.

## Open Questions

1. **Live publish + post-publish registry check are a manual release step, unverifiable here.** `npm publish` to the registry needs auth + OTP/2FA — a human action this plan cannot perform or verify. The plan ships everything publishable and proves it with a local tarball install + `npm publish --dry-run`. The literal stages.md:82 "Done when" ("installed from npm") is met only after a maintainer runs `npm publish` and confirms `npm i change-tree-svg` in a fresh environment. Resolve at release time, outside this stack.
