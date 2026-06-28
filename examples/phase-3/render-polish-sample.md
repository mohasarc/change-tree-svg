# Phase 3 — align comments, hug rendered width

Render-polish phase 3 output preview. Bare mode unless noted.

## Aligned comment column + overflow

Input (`render-polish-aligned.svg`):

```text
.
├── ++ src/api/users.controller.ts        # new CRUD endpoints
├── ** src/api/auth.controller.ts         # add refresh-token flow
├── ++ src/api/v2/analytics/events.controller.ts   # batched ingest with dedupe + retry backoff
├── ** src/api/server.ts                  # wire new routes
├── ~~ src/domain/user.entity.ts          # moved from models/user.ts
└── -- src/api/legacy-session.controller.ts
```

Comment tspan x values in the rendered SVG:

```
ct-muted)" x="292.76"   # users.controller   (aligned)
ct-muted)" x="292.76"   # auth.controller    (aligned)
ct-muted)" x="398.84"   # events.controller  (overflow, long body)
ct-muted)" x="292.76"   # server.ts          (aligned)
ct-muted)" x="292.76"   # user.entity        (aligned)
```

Four comments land on the shared column (x=292.76). The long `events.controller.ts`
body overflows past it (x=398.84), one char past its body — tighter than the column gap.
`legacy-session.controller.ts` has no comment, no tspan.

## Width hugs rendered text (point-3 overshoot removed)

Author pads comments out by hand; the old layout counted those raw spaces, the new one
sizes to the rendered column instead (`render-polish-width-hug.svg`, legend off so the
tree drives width):

```text
.
├── ++ src/a.ts                                  # add adapter
├── ** src/b.ts                                  # tweak
└── -- src/c.ts                                  # drop
```

```
rendered canvasWidth : 245 px
old raw-based width  : 506 px
trailing slack cut   : 261 px (52%)
commentColumnChars   : 17
```

## Origin nudge

Bare text origin shifts left by `ORIGIN_NUDGE` (-1px) to cancel glyph side-bearing:
`<text x="-1" ...>`. Container mode still insets by `H_PADDING`.

## Files

- `render-polish-default.{svg,png}` — small default tree at 13.6px with aligned comments
- `render-polish-aligned.{svg,png}` — aligned column + one overflow line
- `render-polish-aligned-container.{svg,png}` — same, container panel
- `render-polish-width-hug.{svg,png}` — author over-padding hugged to rendered width
