# change-tree-svg Functional Spec

## Goal

Build `change-tree-svg`, a small reusable generator that turns Change Tree notation into a polished SVG image for PR descriptions and review notes. Change Tree notation is a lightweight, authored convention for summarizing where changes live in a diff at a high level. It uses a Unicode filesystem tree, status markers, collapsed groups, and short comments. The package exists as a practical way to embed a colorful Change Tree in GitHub PRs, where reviewers need to scan structure quickly before reading the full diff. It is distributed as an npm package so agents can use it consistently across repositories and machines. It is not a diff parser, PR writer, GitHub uploader, or layout designer. This spec defines product behavior only and avoids implementation choices.

## Primary User

The first-class user is a coding agent preparing a PR description after it has already authored a high-level Change Tree.

Default experience: the agent passes Change Tree text directly to `change-tree-svg` and receives one SVG image that preserves the tree's text, indentation, markers, notes, and scan shape. The agent does not need to create a separate input file for the common case.

Human PR authors are also supported. Alternative experiences exist only through explicit options, such as using a tree file as input, writing the SVG to a file, hiding the legend, changing visual density, or choosing whether to include fallback text.

## Core Guarantees

### Text Fidelity

The SVG preserves the user's tree text.

Functional rule:

```text
Every visible tree line in the input appears in the output with the same text order, indentation, branch glyphs, markers, paths, and notes.
```

Correct behavior:

Input:

```text
.
└── packages/
    └── core/
        └── src/
            ├── ++ context-result.ts      # ContextResult model
            └── ** refs-result-builder.ts # delegates kind counting
```

Output shows the same tree, with `++` and `**` colored and the notes visually muted.

Incorrect behavior:

```text
packages/core/src
+ context-result.ts
** refs-result-builder.ts
```

The generator must not flatten or rewrite the tree.

There is no option that allows the generator to reorder tree lines.

### Visual Scanability

The output makes changed areas easier to scan without changing the user's content.

Functional rule:

```text
Status markers are visually distinct from paths, paths are visually distinct from comments, and branch glyphs do not compete with either.
```

Correct behavior:

- `++` appears as added.
- `**` appears as changed.
- `~~` appears as moved.
- `--` appears as removed.
- `...` appears as collapsed content.
- Comments starting with `#` appear muted.
- Branch glyphs such as `├──`, `└──`, and `│` appear muted.

The generator does not infer new statuses, collapsed groups, or comments from file names.

### Background Compatibility

The SVG adapts to light and dark viewing contexts.

Functional rule:

```text
The output remains readable on light and dark PR backgrounds without the user choosing a separate image.
```

Correct behavior:

- In light viewing contexts, path text uses a darker neutral color.
- In dark viewing contexts, path text uses a lighter neutral color.
- Marker colors remain recognizable in both contexts.
- The container remains translucent, so the surrounding PR background still shows through.

Failure behavior:

If the viewing context does not signal light or dark mode, the SVG uses the light-context palette.

There is no per-viewer manual theme switch in the SVG.

### No Hidden Layout Changes

The generator does not silently crop content.

Functional rule:

```text
The SVG canvas is large enough to contain every visible line and note generated from the input.
```

Correct behavior:

- Long paths stay visible.
- Long comments stay visible when they fit inside the chosen canvas width.
- The output may be wider than the PR viewport.

Failure behavior:

If a line is too long for the configured maximum width, the generator reports that the tree is too wide to render under the current settings.

There is no automatic truncation override.

### Agent-Friendly Use

The generator is easy for agents to call after authoring the Change Tree.

Functional rule:

```text
A complete render request can be made with Change Tree text alone, without requiring a named input file or interactive prompts.
```

Correct behavior:

- An agent can pass the tree directly.
- An agent can pass the tree through a text pipeline.
- An agent can use an input file when a file already exists.
- An agent can receive SVG text directly.
- An agent can write the SVG to an output file.

Failure behavior:

If the user provides no tree through any accepted input mode, the generator reports that tree input is required.

There is no mode that requires interactive copy/paste confirmation.

## Scope

Included in this version:

- Publish the package under the name `change-tree-svg`.
- Make the package directly usable by agents from npm.
- Accept Change Tree notation as input.
- Accept tree input without requiring a file.
- Accept tree input from a file.
- Preserve indentation, branch glyphs, paths, markers, collapsed file counts, and comments.
- Render an SVG image.
- Return SVG output directly.
- Write SVG output to a file.
- Apply the final `Where it lives` visual style.
- Produce an optional copyable text fallback matching the rendered tree.
- Support light and dark viewing contexts.
- Report invalid or unsupported input clearly.
- Render a bare image by default and the container panel on request.
- Slice the bare render into fixed-width vertical strips.
- Publish strips to an orphan branch in the same GitHub repository.
- Emit embed markup that GitHub renders as a horizontally scrollable strip set.

Excluded from this version:

- Reading git diff output.
- Counting files automatically.
- Collapsing directories automatically.
- Inferring whether a path is added, changed, moved, or removed.
- Deciding which files are important enough to include.
- Verifying the Change Tree against the actual diff.
- Requiring a tree input file for the default path.
- Requiring an SVG output file for the default path.
- Editing PR descriptions.
- Posting PR comments.
- Generating PNG output.
- Interactive expand/collapse.
- Internal horizontal scrolling inside the SVG image.
- Wrapping long lines.
- Truncating long lines.
- Rendering arbitrary diagrams.

## Change Tree Notation

Change Tree is a lightweight notation for giving humans a high-level overview of where changes live in a diff.

It is authored by an agent or human. It is not generated by this package. The notation is a review aid, not a complete diff, not a changelog, and not a source of truth for the exact changed lines.

Functional rule:

```text
Change Tree describes the important changed areas of a diff using a tree shape, status markers, collapsed groups, and short comments.
```

### Tree Shape

The tree shape uses Unicode box-drawing branches to show repository-relative structure.

Example:

```text
.
├── apps/
│   └── cli/
└── packages/
    └── core/
```

The root is the source of the repository. Paths are written relative to that root.

The tree is a summary. It should show the important changed areas, not every changed file.

### Status Markers

Status markers appear after branch indentation and before the path or collapsed group.

```text
++ added
** changed
~~ moved
-- removed
```

Examples:

```text
├── ++ context-command.ts
├── ** program.ts
├── ~~ context/
└── -- old-context.ts
```

Marker meanings:

- `++` means the path or collapsed group was added.
- `**` means the path or collapsed group was changed.
- `~~` means the path or collapsed group moved to this location.
- `--` means the path or collapsed group was removed.

Moved paths should be shown at their new location.

Recommended moved-path comment:

```text
└── ~~ context/ # moved from apps/cli/context/
```

### Collapsed Groups

`...` marks omitted detail.

It is used when listing every changed file would make the tree harder to review.

Examples:

```text
└── ++ ... 12 files # generated fixtures
```

```text
└── ** ... config files # shared lint/typecheck wiring
```

Recommended use:

- Collapse repeated files that share the same purpose.
- Collapse large additions into a counted group.
- Keep files visible when their exact location is important for review.
- Prefer one collapsed line over dozens of low-signal leaf files.
- Do not use `...` to hide changes that need reviewer attention.

Collapsed groups are authored summaries. The package does not calculate or validate their counts.

### Comments

Comments start with `#`.

Comments explain why the path matters, what role the group plays, or where a moved path came from.

Examples:

```text
├── ** program.ts # wires context command
└── ~~ context/ # moved from apps/cli/context/
```

Comments should be short. They should help reviewers decide where to look first.

### Recommended Shape

The Change Tree should be concise enough to scan before reading the PR in detail.

Recommended authoring behavior:

- Anchor the tree at `.`.
- Show the main directories touched by the change.
- Show important leaf files.
- Fold repetitive or low-signal files into `...` groups.
- Include counts for large collapsed groups when the count helps review.
- Add comments only where they clarify ownership, purpose, or movement.
- Prefer high-level structure over exhaustive file listing.

Incorrect authoring behavior:

- Listing every changed file when a collapsed group would communicate the same structure.
- Flattening paths into a list.
- Using markers for exact diff hunks or line-level changes.
- Treating the Change Tree as automatically verified diff metadata.

## Interaction Model

The user supplies one tree document.

The tree document is Change Tree text. Each line is treated as display content. Empty lines are allowed only where the user wants visible vertical spacing.

Accepted tree input modes:

- Direct text input supplied by the caller.
- Piped text input supplied without a named file.
- File input when the tree already exists in a file.

Accepted SVG output modes:

- Direct SVG text output returned to the caller.
- File output when the caller wants a saved image.

The default input mode is direct or piped Change Tree text.

The default output mode is direct SVG text.

The generator recognizes four status markers when they appear after branch indentation:

```text
++ added
** changed
~~ moved
-- removed
```

Examples:

```text
├── ++ context-result.ts
├── ** refs-result-builder.ts
├── ~~ git/
└── -- old-context.ts
```

Comments are note text that starts with `#`.

Example:

```text
└── ++ ... 12 files # owns TS ref lookup
```

Directory paths are user-provided text. The generator does not decide whether a path is a directory. A trailing `/` is displayed exactly as supplied.

The user may request:

- SVG image only.
- SVG image plus copyable text fallback.
- direct SVG output.
- file SVG output.
- legend shown.
- legend hidden.

The default is direct SVG output plus copyable text fallback, with legend shown.

## SVG Visual Format

The default output is a single SVG image.

### Final Style

The final style is the C19 visual direction:

- Monospace text.
- Text size equivalent to 18 px.
- Normal text weight.
- Rounded container with 8 px corner radius.
- Horizontal padding equivalent to 21 px.
- Vertical padding equivalent to 19 px.
- No border.
- Slightly transparent container fill.
- Container responds to light and dark viewing context.
- Paths use neutral foreground color.
- Branch glyphs use muted neutral color.
- Comments use muted neutral color.
- Status markers use color.
- Legend appears at the bottom.
- No title inside the image.

### Marker Colors

The exact visual language:

```text
++ added    green
** changed  yellow
~~ moved    purple
-- removed  red
```

The legend uses the same colors as the markers in the tree.

### Container

The image has a code-block-like container.

The container is not solid. It is lightly translucent so it blends with the surrounding PR background.

There is no border. There is no shadow.

### Fallback Text

When fallback text is requested, it appears as a copyable plain text block below the image.

The fallback preserves the original tree exactly.

Example fallback:

```text
.
└── packages/
    └── core/
        └── src/
            ├── ++ context-result.ts      # ContextResult model
            └── ** refs-result-builder.ts # delegates kind counting

++ added   ** changed   ~~ moved   -- removed
```

## GitHub Embed

GitHub sanitizes inline raw SVG in PR and comment bodies, but renders `<img>`-hosted SVG at full vector fidelity. To embed a wide Change Tree, the package slices the render into fixed-width vertical strips, publishes them, and emits markup that GitHub renders as one horizontally scrollable strip set.

### Bare vs Container Render

The render has two forms.

Functional rule:

```text
The default render is bare: no container background, no decorative padding, canvas tight to the content. The container render is an opt-in that restores the rounded translucent panel and padding.
```

Correct behavior:

- The default render draws no container rectangle and adds no decorative padding. Its canvas is tight to the text, with only enough bottom inset to keep descenders inside the box.
- The container render reproduces the standalone style: rounded 8 px corners, translucent fill, horizontal and vertical padding.
- Both forms preserve the same tree text, markers, branch glyphs, and comments.

The bare render is the form that gets sliced and embedded. The container render is for standalone use where the panel reads as a code block.

### Slicing for GitHub Embed

Slicing windows the bare render into vertical strips.

Functional rule:

```text
Slicing splits the bare render into fixed-width vertical strips at one shared height. Strips placed side by side, in order, reconstruct the full tree with no gap and no overlap.
```

Correct behavior:

- A tree wider than the strip width yields multiple strips; a tree that fits yields exactly one.
- Every strip is a standalone SVG of identical height that shows its window of the tree.
- Strip order is left to right. Concatenating the windows reproduces the full render.
- Slicing is deterministic: same tree and options produce the same strips.

Slicing does not change the rendered content. It only chooses which horizontal window each strip shows.

### Publishing Strips (orphan `media` branch)

Strips are hosted in the same repository on an orphan branch.

Functional rule:

```text
Strip files are published to an orphan branch (default `media`) in the same GitHub repository, content-addressed by a hash of the strips, as one atomic commit per publish.
```

Correct behavior:

- The first publish creates the `media` branch if it is absent.
- Strips for one tree land under a content-addressed path, so re-publishing identical strips is idempotent — it reuses the existing files and writes nothing.
- Publishing requires an authenticated `gh`. If `gh` is missing or unauthenticated, the package reports that the user must run `gh auth login`.

Publishing uploads strip images to GitHub. It does not edit PR descriptions, post comments, or read the diff.

### Embed Markup Contract

The embed output is a single block GitHub can render.

Functional rule:

```text
Embed markup is one `<pre>` block containing one `<picture><img></picture>` wrapper per strip URL, in order, with no whitespace between adjacent wrappers.
```

Correct behavior:

- Each strip URL is wrapped in `<picture><img src=… alt=""></picture>`.
- Wrappers are concatenated with no whitespace, inside one `<pre>`, so GitHub lays the strips out as one continuous horizontally scrollable row.
- The `<picture>` wrapper keeps GitHub from turning each image into a separate linkified block.

Failure behavior:

- Empty strip input produces no markup; the package reports that there is nothing to embed.

Embed limitation — light mode only:

```text
GitHub hosts the strips as <img>-referenced SVG, which cannot respond to prefers-color-scheme. The embed always uses the light-context palette. Dark-mode embeds are not possible through this path.
```

The container render and the copyable fallback text remain the dark-context backstops.

## Cross-Cutting Concerns

### Determinism

Same input and same options produce the same visible SVG.

Functional rule:

```text
Rendering is deterministic for the same tree and options.
```

### Accessibility

The SVG has accessible descriptive text.

The description states that the image is a colored Unicode repository tree and names the meaning of the status markers.
The description also states that collapsed `...` groups are authored summaries, not automatically verified diff counts.

The fallback text is the accessibility and copy/paste backstop for reviewers who cannot or do not want to inspect the image.

### Horizontal Overflow

The SVG does not provide internal horizontal scrolling.

Functional rule:

```text
The SVG is a static image. Horizontal scrolling belongs to the fallback text block or the viewer's image surface, not inside the SVG.
```

Correct behavior:

- The rendered image fits its own canvas.
- The copyable fallback can be horizontally scrolled by the host when needed.

Incorrect behavior:

- The SVG clips a long line without reporting a width problem.
- The SVG inserts its own scrollbar.

### Invalid Input

The generator rejects input it cannot render faithfully.

Examples of invalid input:

- Empty tree.
- Lines too wide for the configured maximum width.
- Unsupported control characters.

Failure message:

```text
Cannot render tree: <reason>.
```

### Documentation Expectations

Published project documentation explains Change Tree notation before explaining rendering.

Functional rule:

```text
Readers can understand and author a useful Change Tree without reading source code or inspecting implementation details.
```

Documentation must explain:

- Change Tree is a lightweight, authored overview of where changes live in a diff.
- Change Tree is mainly for agents to communicate high-level structure to human reviewers.
- `++`, `--`, `~~`, and `**` are status markers.
- `...` marks folded detail.
- `#` starts a short comment.
- The tree should be anchored at the repository root.
- The tree should show important changed areas, not every changed file.
- `change-tree-svg` renders the notation as a colorful SVG for GitHub PRs.

Documentation must not imply:

- The package reads git diffs.
- The package decides what changed.
- The package validates that the Change Tree matches the diff.
- The package replaces reviewing the actual PR diff.

## Package Access

Purpose: make the generator easy for agents to use wherever they prepare PR descriptions.

Produces:

- a public npm package named `change-tree-svg`
- one narrow package focused on Change Tree to SVG rendering

Does not produce:

- repository-specific wrappers
- PR automation
- hosted rendering service
- broad diagram rendering package

Default package name:

```text
change-tree-svg
```

Edge cases:

- If the package is unavailable in an agent environment, the agent reports that `change-tree-svg` is not available.
- If a different package name is used later, the generated SVG behavior remains the same.

## Supply Tree Input

Purpose: let agents and authors provide the tree in the form that is already easiest for them.

Accepted input modes:

- direct Change Tree text
- piped Change Tree text
- Change Tree file

Produces:

- one Change Tree document ready to render

Does not produce:

- inferred tree structure
- generated file counts
- normalized paths
- reordered tree lines

Default:

```text
direct or piped Change Tree text
```

Examples:

```text
The agent authors a Change Tree and passes the text directly.
```

```text
The author already has a Change Tree in a file and uses that file as input.
```

Edge cases:

- If multiple input modes are supplied at once, the generator reports that exactly one Change Tree input must be provided.
- If the selected input mode contains no Change Tree text, the generator reports that Change Tree input is required.

## Render Tree

Purpose: turn user-provided Change Tree text into one SVG image.

Produces:

- one SVG image using the default visual style
- optional copyable text fallback

Does not produce:

- PR descriptions
- uploaded image URLs
- screenshots
- input files
- required output files
- rewritten tree content
- inferred status markers
- inferred collapsed groups
- inferred comments

Example input:

```text
.
├── apps/
│   └── cli/
│       ├── src/
│       │   ├── ** program.ts # registers context command
│       │   └── ++ commands/context/
│       │       └── ++ ... 2 files # command compute + registration
└── packages/
    └── core/src/
        ├── ++ intermediate-representation/context-result.ts # result model
        └── ** index.ts # exports context surface
```

Observed output:

```text
An SVG image showing the same tree.
The container is rounded and translucent.
Paths are neutral.
Branch glyphs are muted.
++ is green.
** is yellow.
Comments are muted.
The legend appears at the bottom.
```

Edge cases:

- If the input contains no status markers, the output still renders the tree and legend.
- If the input contains comments but no status markers, comments are still muted.
- If the input contains a marker-like string inside a comment, it is treated as comment text.
- If the input contains a marker in the middle of a path name, it is treated as path text unless it appears in marker position.

## Receive SVG Output

Purpose: let callers use the rendered SVG immediately or save it for later use.

Accepted output modes:

- direct SVG text output
- SVG file output

Produces:

- one SVG image

Does not produce:

- image hosting
- markdown upload links
- screenshots
- PNG files

Default:

```text
direct SVG text output
```

Examples:

```text
The agent receives SVG text directly and decides how to attach or store it.
```

```text
The author requests a saved SVG file for manual PR editing.
```

Edge cases:

- If file output cannot be written, the generator reports that the SVG file could not be created.
- If direct output is requested, no output file is created.

## Render Fallback

Purpose: provide a copyable text companion to the SVG.

Produces:

- one plain text block matching the user's original tree
- the same legend text shown in the SVG when legend is enabled

Does not produce:

- colored text
- reformatted paths
- inferred comments

Default:

```text
enabled
```

Example:

```text
.
└── packages/
    └── core/
        └── src/
            ├── ++ context-result.ts      # ContextResult model
            └── ** refs-result-builder.ts # delegates kind counting

++ added   ** changed   ~~ moved   -- removed
```

## Summary

- Package access: publishes the focused `change-tree-svg` package for agent use.
- Change Tree notation: defines the authored high-level diff overview using branches, markers, `...`, and comments.
- Supply tree input: accepts direct, piped, or file-backed Change Tree text.
- Render tree: converts Change Tree text into a styled SVG image.
- Receive SVG output: returns SVG directly or writes it to a file.
- Render fallback: provides copyable text matching the rendered tree.
- Status markers: colors `++`, `**`, `~~`, and `--` without changing content.
- Theme behavior: keeps the SVG readable in light and dark viewing contexts.
- Overflow behavior: never clips silently; scrolling belongs to the fallback text or host viewer.
