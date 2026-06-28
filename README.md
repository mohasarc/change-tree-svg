# change-tree-svg

Render authored Change Tree notation as a colorful SVG for GitHub PR descriptions.

## Change Tree notation

Change Tree is a lightweight, authored overview of where changes live in a diff. You
write it by hand (or have an agent write it) to give a human reviewer a high-level map
of a change before they read the diff. It is mainly a way for agents to communicate the
high-level structure of a change to human reviewers.

A tree is a Unicode filesystem tree anchored at the repository root (`.`), with a status
marker on the entries that matter and short comments where they help.

### Markers

| Token | Meaning |
|-------|---------|
| `++`  | added |
| `**`  | changed |
| `~~`  | moved |
| `--`  | removed |
| `...` | folded detail — a collapsed group, optionally with a count |
| `#`   | starts a short comment to the end of the line |

### Authoring rules

- Anchor the tree at the repository root, `.`.
- Show the important changed areas, not every changed file.
- Fold repetitive or low-signal files into a `...` group; add a count when it helps
  review (`... 6 test files`).
- Put a `~~` moved entry at its new path and note the old path in a `#` comment.
- Keep comments short.

### Worked example

Input:

```text
.
├── src/
│   ├── ++ render.ts          # new SVG renderer
│   ├── ** parse.ts           # fix marker regex
│   ├── ~~ layout.ts          # moved from lib/layout.ts
│   └── -- legacy-draw.ts
└── ... 6 test files
```

Rendered (scrollable — drag sideways):

<pre><picture><img src="https://raw.githubusercontent.com/mohasarc/change-tree-svg/media/trees/mnp2g5/p0.svg" alt=""></picture><picture><img src="https://raw.githubusercontent.com/mohasarc/change-tree-svg/media/trees/mnp2g5/p1.svg" alt=""></picture></pre>

### Deeper example

A larger tree: more depth, collapsed groups with counts, a moved entry, and one long
line whose body and comment overflow past the shared comment column.

Input:

```text
.
├── src/
│   ├── api/
│   │   ├── routes/
│   │   │   ├── ++ users.controller.ts   # new CRUD endpoints
│   │   │   ├── ** auth.controller.ts     # add refresh-token flow
│   │   │   ├── ++ v2/analytics/events.controller.ts   # batched ingest with dedupe + retry backoff
│   │   │   └── -- legacy-session.controller.ts
│   │   ├── ++ middleware/rate-limit.ts   # token bucket per IP
│   │   └── ** server.ts                  # wire new routes
│   ├── domain/
│   │   ├── ~~ user.entity.ts             # moved from models/user.ts
│   │   ├── ++ subscription.entity.ts     # billing states
│   │   └── ** invoice.entity.ts          # add proration
│   ├── infra/
│   │   ├── db/
│   │   │   ├── ++ migrations/0007_add_subscriptions.sql
│   │   │   └── ** connection-pool.ts     # raise max to 20
│   │   └── ... 4 cache adapters
│   └── ... 12 barrel files
├── test/
│   ├── ++ subscription.e2e.spec.ts       # billing happy path
│   └── ... 23 unit specs
└── ** README.md                          # document billing setup
```

Rendered (scrollable — drag sideways):

<pre><picture><img src="https://raw.githubusercontent.com/mohasarc/change-tree-svg/media/trees/3p46wk/p0.svg" alt=""></picture><picture><img src="https://raw.githubusercontent.com/mohasarc/change-tree-svg/media/trees/3p46wk/p1.svg" alt=""></picture><picture><img src="https://raw.githubusercontent.com/mohasarc/change-tree-svg/media/trees/3p46wk/p2.svg" alt=""></picture><picture><img src="https://raw.githubusercontent.com/mohasarc/change-tree-svg/media/trees/3p46wk/p3.svg" alt=""></picture></pre>

Plain-text fallback (`renderFallback`):

```text
.
├── src/
│   ├── api/
│   │   ├── routes/
│   │   │   ├── ++ users.controller.ts   # new CRUD endpoints
│   │   │   ├── ** auth.controller.ts     # add refresh-token flow
│   │   │   ├── ++ v2/analytics/events.controller.ts   # batched ingest with dedupe + retry backoff
│   │   │   └── -- legacy-session.controller.ts
│   │   ├── ++ middleware/rate-limit.ts   # token bucket per IP
│   │   └── ** server.ts                  # wire new routes
│   ├── domain/
│   │   ├── ~~ user.entity.ts             # moved from models/user.ts
│   │   ├── ++ subscription.entity.ts     # billing states
│   │   └── ** invoice.entity.ts          # add proration
│   ├── infra/
│   │   ├── db/
│   │   │   ├── ++ migrations/0007_add_subscriptions.sql
│   │   │   └── ** connection-pool.ts     # raise max to 20
│   │   └── ... 4 cache adapters
│   └── ... 12 barrel files
├── test/
│   ├── ++ subscription.e2e.spec.ts       # billing happy path
│   └── ... 23 unit specs
└── ** README.md                          # document billing setup

++ added   ** changed   ~~ moved   -- removed
```

### What this is not

`change-tree-svg` renders notation you authored. It does not read git diffs, does not
decide what changed, and does not validate that the tree matches the diff. A Change Tree
is a review aid, not a replacement for reading the actual PR diff — the markers and
collapsed groups say only what the author wrote.

## Rendering

```sh
npm i change-tree-svg
```

### Library

```js
import { render, renderFallback, RenderError } from 'change-tree-svg';

const tree = '.\n└── ++ src/render.ts # new renderer';

render(tree);          // -> SVG string
renderFallback(tree);  // -> plain-text tree + legend line
```

- `render(input, options?)` returns the SVG string.
- `renderFallback(input, options?)` returns a copyable plain-text block — the tree plus a
  legend line — for places where the image can't render. Output for the tree above:

  ```text
  .
  └── ++ src/render.ts # new renderer

  ++ added   ** changed   ~~ moved   -- removed
  ```

- `RenderError` is thrown on invalid input.

Options (`RenderOptions`, both optional):

| Option | Default | Effect |
|--------|---------|--------|
| `maxLineWidth` | unset | wrap long lines at this character width |
| `legend` | `true` | include the marker legend in the SVG and fallback |

### CLI

```sh
change-tree-svg --text '.
└── ++ src/render.ts # new renderer'
```

Input (exactly one):

- `-t, --text <tree>` — notation as a string
- `-f, --file <path>` — read notation from a file
- pipe notation on stdin

Output:

- writes SVG plus plain-text fallback to stdout
- `-o, --output <path>` — write the SVG to a file instead of stdout
- `--no-fallback` — omit the plain-text fallback
- `--no-legend` — hide the legend in SVG and fallback
- `-h, --help` — show usage

### A note on SVG in PRs

GitHub strips raw inline SVG from Markdown, so you can't paste the SVG string straight
into a PR body. The `embed` command works around this: it slices the render into vertical
strips, publishes them to an orphan `media` branch in your repo, and prints a `<pre>` of
`<picture><img>` tags pointing at the raw strip URLs. GitHub renders that as a
horizontally-scrollable, full-fidelity vector tree inside a PR or comment.

```sh
change-tree-svg embed -f tree.txt   # prints the <pre> to paste
```

Repo is auto-detected from `git remote origin`; pass `--repo owner/name` to override.
Requires `gh` authed (`gh auth login`). The scrollable example above is a live embed
produced this way.

Embeds render in light mode only — `prefers-color-scheme` is dead inside `<img>`-hosted
SVG on GitHub. For places that can't show images, paste the `renderFallback` plain-text
block instead.

## License

MIT
