# change-tree-svg — Ad-hoc Stage 2.5 (refactor)

Source of truth for behavior: [`change-tree-svg-functional-spec.md`](change-tree-svg-functional-spec.md). This stage adds **no behavior**; the spec is unchanged.

## Stage 2.5 — Source tree reorganization

**What we deliver.** The flat `src/` directory (21 files, all at one level) reorganized into meaningful folders by subdomain, with colocated tests moving alongside their modules. Public package entry (`index.ts`) and the `change-tree-svg` bin keep working unchanged. Pure structural refactor: no runtime behavior change, no new feature, no API change.

**Why now.** Stage 2 left every module at the top of `src/`: engine modules (parse, layout, render, palette, types, error, legend, fallback) and CLI modules (cli, cli-args, cli-input, cli-error) are indistinguishable by location. Before Stage 3 publishes the package, give it a structure a reader can navigate.

**In scope.**
- Group `src/` into folders by subdomain. Candidate split: a rendering-engine folder and a CLI folder, with the public `index.ts` entry where the package resolves it. Exact folder names and where `index.ts` / shared types live are design decisions for the drill.
- Move each module's colocated `*.test.ts` with its module.
- Update all relative import specifiers (ESM `NodeNext`, `.js` suffixes) for the new paths.
- Update `package.json` (`main`, `types`, `bin`, `files`) and `tsconfig` outputs so the built `dist/` still exposes the same entry and a working `dist` bin path.
- Update the `lint` script glob if it stops covering nested files.
- Update any doc/example/path references in the repo that point at moved files (including `examples/` and the Stage 2 plan/PR docs only where a path is now wrong).

**Out of scope.**
- Any change to rendering output, CLI behavior, public API surface, option names, or error messages. Byte-identical SVG and fallback for the same input.
- Renaming modules or splitting/merging their contents. Files move; their code does not change except import specifiers.
- New abstractions, new dependencies, barrel files beyond what's needed to keep the public entry stable.
- Stage 3 packaging/publish/README work.

**Constraints.**
- Determinism preserved: same input → same SVG/fallback bytes as before the refactor.
- `pnpm test && pnpm lint && pnpm typecheck` green; `pnpm build` emits a runnable bin (`node dist/<binpath> --text '++ a.ts'` prints SVG + fallback).
- Imports must be updated atomically with each move so every commit is green (no broken intermediate state).

**Done when.** `src/` is organized into subdomain folders, tests sit beside their modules, the public `import` entry and the built bin work exactly as before, output is byte-identical, and the full verification command plus a bin smoke test pass.
