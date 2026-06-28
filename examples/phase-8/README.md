# Phase 8 — CLI subcommands (`render` / `slice` / `markup`)

Real output from the built CLI. No network.

## Input

`tree.txt`:

```
.
├── ++ src/cli/commands/slice.ts   # writes p0.svg…pN.svg
├── ++ src/cli/commands/markup.ts  # prints the <pre> embed block
└── ** src/cli/cli.ts              # subcommand dispatch
```

## `slice`

```
$ change-tree-svg slice -f tree.txt --out-dir strips
p0.svg
p1.svg
p2.svg
```

Writes `strips/p0.svg`, `p1.svg`, `p2.svg` — bare SVG strips, identical height, 240px-wide windows.

## `markup`

```
$ change-tree-svg markup --out-dir strips --base-url https://raw.githubusercontent.com/mohasarc/change-tree-svg/media/trees/demo
<pre><picture><img src=".../p0.svg" alt=""></picture><picture><img src=".../p1.svg" alt=""></picture><picture><img src=".../p2.svg" alt=""></picture></pre>
```

Full block in `embed.html`.

## `render`

Unchanged. Byte-identical to before this phase — bare invocation and `render` subcommand both print the SVG + fallback as today.

## Errors

```
$ change-tree-svg slice -f tree.txt
--out-dir is required for slice
$ change-tree-svg markup --out-dir strips
--base-url is required for markup
$ change-tree-svg bogus
Unknown command: bogus
```
