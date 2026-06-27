# change-tree-svg Staged Plan

This is a staged plan for building `change-tree-svg`. The goal lives in [`change-tree-svg-functional-spec.md`](change-tree-svg-functional-spec.md): turn authored Change Tree notation into a polished SVG for PR descriptions. No code or implementation detail appears here — only what each stage delivers and why it comes when it does.

Small project, so three stages. Stage 1 is the rendering engine, Stage 2 the I/O surfaces around it, Stage 3 the publish.

## Guiding Principles

Drawn from the project guide and spec. Where one conflicts with scope, the principle wins.

- **Text fidelity.** Output preserves the input tree's order, indentation, glyphs, markers, paths, and notes. Never flatten or rewrite.
- **Authored, not inferred.** The package renders what the user wrote. It does not infer status, counts, collapsed groups, or comments.
- **Determinism.** Same tree and same options produce the same SVG, every time.
- **TDD.** Failing test first, then make it pass. Every behavior has a test that would fail without it.
- **Narrow scope.** Change Tree text in, SVG out. No diff parsing, no GitHub posting, no summary generation.
- **Non-interactive.** A complete render needs text and options alone — no prompts.

## Context Recap

The package converts one Change Tree document (Unicode box-drawing tree, four status markers `++`/`**`/`~~`/`--`, `...` collapsed groups, `#` comments) into one SVG using the C19 visual style: monospace, rounded translucent container, neutral paths, muted glyphs and comments, colored markers, bottom legend, light/dark adaptation. It ships as a public npm package whose first-class caller is a coding agent writing a PR description. See the spec's *SVG Visual Format* and *Interaction Model* sections for the full behavior.

## Stage 1 — Rendering engine

**What we deliver.** A programmatic entry point that takes Change Tree text and returns one SVG string in the final C19 style. Markers are colored (green/yellow/purple/red), paths neutral, branch glyphs and comments muted, container rounded and translucent, legend at the bottom. The SVG adapts to light and dark viewing contexts and carries accessible descriptive text. The engine rejects input it cannot render faithfully — empty trees and lines too wide for the configured maximum — with a clear reason. After this stage you can import the package and render a faithful, scannable SVG from authored tree text.

**Why this stage.** This is the spine. It touches every concern the whole effort touches — parsing the four markers and comments, preserving glyphs and indentation, the full visual style, theming, accessibility, and faithful-or-reject error handling. Locking the render shape and the visual style first means the I/O surfaces in Stage 2 are thin wrappers over a settled core, not a moving target.

**In scope.**
- Recognize the four status markers in marker position, `...` collapsed groups, and `#` comments; treat marker-like strings inside comments or mid-path as plain text.
- Preserve line order, indentation, branch glyphs, paths, collapsed counts, and comments exactly.
- Apply the C19 style: monospace, sizing, padding, rounded corners, no border, translucent fill, marker colors, muted glyphs and comments, neutral paths, bottom legend.
- Adapt path and container colors to light and dark contexts; default to light when context is unsignaled.
- Embed accessible description naming the marker meanings and noting that `...` groups are authored summaries, not verified counts.
- Reject empty trees and over-wide lines with a `Cannot render tree: <reason>.` message; no truncation, no wrapping.
- Tests: fidelity (input lines survive intact), marker coloring, comment/glyph muting, light/dark palette selection, legend presence, accessibility text, and each rejection case.

**Out of scope.**
- Piped and file input modes (Stage 2).
- File output and the copyable fallback text block (Stage 2).
- Multiple-input and missing-input validation messages (Stage 2).
- npm packaging and user-facing docs (Stage 3).

**Done when.** Calling the render entry point with a Change Tree string returns an SVG that preserves the tree, colors the four markers, mutes glyphs and comments, shows the legend, and reads correctly on light and dark backgrounds; over-wide and empty inputs return the failure message instead of a clipped or blank image.

## Stage 2 — Input and output surfaces, fallback

**What we deliver.** The ways agents and authors actually call the tool. Tree text can come in directly, piped without a file, or from a file. The SVG can be returned directly or written to a file. A copyable plain-text fallback block — matching the original tree exactly, with the legend line — can accompany the image, and the legend can be shown or hidden. Input problems report clearly: more than one input mode at once, or no tree text at all. After this stage an agent can pass a tree straight through, or an author can render a file to a saved SVG, with the default being direct text in, direct SVG plus fallback out, legend shown.

**Why this stage.** With the engine settled, these surfaces are thin and independently valuable. They turn a library into something an agent invokes the way it already works — text through a pipeline, no named files, no prompts. Putting them after the engine means each input and output mode wraps a stable render call rather than co-evolving with the visual style.

**In scope.**
- Accept direct text, piped text, and file input; default to direct or piped.
- Return SVG directly or write it to a file; default to direct.
- Produce the copyable text fallback (tree preserved exactly, plus legend line) and a toggle to enable or disable it; default enabled.
- Legend show/hide option; default shown.
- Report `exactly one Change Tree input must be provided` when modes collide, and that tree input is required when the chosen mode is empty.
- Report that the SVG file could not be created when file output fails; create no file when direct output is requested.
- Tests: each input mode, each output mode, fallback content matches input, legend toggle, and each input/output validation message.

**Out of scope.**
- Any change to the visual style or render fidelity (owned by Stage 1).
- npm packaging and README (Stage 3).
- PNG output, image hosting, PR posting — never in scope (see Beyond Scope).

**Done when.** A caller can supply a tree by direct text, pipe, or file and get SVG back directly or as a written file; the fallback block reproduces the input tree and legend; colliding or empty inputs and failed file writes each return their specific message.

## Stage 3 — Publish and documentation

**What we deliver.** The package published to npm under the name `change-tree-svg`, installable and callable by agents across repositories, with user-facing documentation that explains Change Tree notation before it explains rendering. Documentation teaches the markers, `...` folding, `#` comments, anchoring at the repo root, and showing important areas over every file — and is explicit that the package does not read diffs, decide what changed, or validate the tree against the diff.

**Why this stage.** Publishing is genuine end-of-effort work: it can only happen once the engine and surfaces are done and exercised. The notation-first README is the user's on-ramp and the spec requires it as a published artifact, so it lands with the publish rather than earlier against a surface that was still shifting.

**In scope.**
- Package metadata and build so `change-tree-svg` installs and runs from npm in an agent environment.
- README that explains Change Tree notation first, then rendering, matching the spec's documentation expectations and prohibitions.
- Verification that an installed copy renders a sample tree end-to-end.

**Out of scope.**
- Repository-specific wrappers, PR automation, hosted rendering — never in scope.
- Any new rendering or I/O behavior; Stage 3 publishes what Stages 1 and 2 built.

**Done when.** `change-tree-svg` can be installed from npm and used to render a tree, and the published docs let a reader author a useful Change Tree without reading source.

## Beyond Scope

Catalogued so they don't creep into a stage:

- Reading git diff output, counting files, collapsing directories, or inferring add/change/move/remove.
- Verifying the Change Tree against the actual diff.
- Uploading images to GitHub, editing PR descriptions, posting PR comments.
- PNG output.
- Interactive expand/collapse.
- Internal horizontal scrolling inside the SVG, line wrapping, or line truncation.
- Rendering arbitrary diagrams.
- Per-viewer manual theme switch in the SVG.
- Requiring a tree input file or an SVG output file on the default path.

## Sequencing Summary

| Stage | Delivers | Primary new capability |
| --- | --- | --- |
| 1 | Rendering engine | Faithful, themed, accessible SVG from tree text, with faithful-or-reject errors |
| 2 | I/O surfaces and fallback | Direct/piped/file input, direct/file output, copyable fallback, legend toggle, input validation |
| 3 | Publish and docs | Installable npm package and notation-first documentation |
