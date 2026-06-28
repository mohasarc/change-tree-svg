---
name: change-tree-svg
description: Render an authored Change Tree (high-level map of where changes live in a diff) as a horizontally-scrollable SVG embed for a GitHub PR or comment. Use when writing a PR description, summarizing a diff for a reviewer, or asked for a change tree / change map / review map. Triggers include "change tree", "change-tree-svg", "embed a change tree", "render a change map for this PR".
---

# change-tree-svg

Turn a hand-authored Change Tree into a horizontally-scrollable SVG embed for a GitHub PR or comment. Use it for a high-level review map at the top of a PR — which areas changed, what got added, moved, removed — before the reviewer reads the diff.

## Author the tree

Anchor at `.`, mark only entries that matter, fold low-signal files into `...`. Full rules in README.

| Token | Meaning |
|-------|---------|
| `++`  | added |
| `**`  | changed |
| `~~`  | moved |
| `--`  | removed |
| `...` | folded detail |
| `#`   | comment |

```text
.
├── ++ src/render.ts   # new renderer
├── ** src/parse.ts    # fix marker regex
└── ... 6 test files
```

## Embed

```sh
npx change-tree-svg embed -f tree.txt
```

Repo auto-detected from `git remote origin`; pass `--repo owner/name` to override. Needs `gh` authed — if not it errors telling you to run `gh auth login`. Paste the printed `<pre>` into the PR body.

Text fallback: `render`. Partial steps `slice` / `upload` / `markup` exist if you need them.
