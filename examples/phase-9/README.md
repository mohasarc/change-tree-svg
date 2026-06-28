# Phase 9 — `upload` / `embed` CLI commands

`upload` publishes strip SVGs to the orphan `media` branch and prints their raw
URLs. `embed` is the one-shot: notation in → slice → upload → `<pre>` out. Both
need an authed `gh`.

The URLs below are computed exactly as the CLI computes them (content-addressed
path is pure). The actual push to `media` is network and is verified manually —
see the PR.

## Input

`tree.txt`:

```
.
├── ++ src/cli/commands/upload.ts   # publish strips, print raw urls
├── ++ src/cli/commands/embed.ts    # one-shot: slice → upload → <pre>
└── ** src/cli/cli.ts               # dispatch upload/embed
```

## `upload`

```
$ change-tree-svg upload -f tree.txt
https://raw.githubusercontent.com/mohasarc/change-tree-svg/media/trees/1x83iye/p0.svg
https://raw.githubusercontent.com/mohasarc/change-tree-svg/media/trees/1x83iye/p1.svg
https://raw.githubusercontent.com/mohasarc/change-tree-svg/media/trees/1x83iye/p2.svg
https://raw.githubusercontent.com/mohasarc/change-tree-svg/media/trees/1x83iye/p3.svg
```

Second run on the same notation prints the identical URLs and issues no writes
(idempotent: the `media` tree for that hash already exists).

## `embed`

```
$ change-tree-svg embed -f tree.txt
```

Prints `embed.html` — one `<pre>`, four whitespace-free `<picture><img>` strips,
ready to paste into a PR or comment:

```html
<pre><picture><img src="https://raw.githubusercontent.com/mohasarc/change-tree-svg/media/trees/1x83iye/p0.svg" alt=""></picture>…</pre>
```

## Errors

```
$ change-tree-svg embed -f tree.txt   # gh not logged in
GitHub CLI is not authenticated. Run `gh auth login`, then re-run.
```

`--repo owner/repo` overrides remote detection; default reads `git remote
get-url origin`.
