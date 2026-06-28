# Phase 2 output preview — geometry char-math

Phase 2 ships pure functions only (`src/engine/geometry.ts`); no rendered SVG
changes yet. Output preview is the computed char-geometry for a representative
input. All values are in characters.

## Input

```text
.
├── ++ users.controller.ts   # new CRUD endpoints
├── ** auth.controller.ts     # add refresh-token flow
├── ++ events.controller.ts   # batched ingest with dedupe + retry backoff
└── -- legacy-session.controller.ts
```

## Computed values

`commentColumnChars(lines, COMMENT_OUTLIER_DELTA=8, COMMENT_GAP=2)` = **29**
`legendLengthChars()` = **45**

| body | comment | bodyEndChars | commentStartChars | lineEndChars |
|---|---|---:|---:|---:|
| `.` | — | 1 | — | 1 |
| `users.controller.ts` | `# new CRUD endpoints` | 26 | 29 | 49 |
| `auth.controller.ts` | `# add refresh-token flow` | 25 | 29 | 53 |
| `events.controller.ts` | `# batched ingest with dedupe + retry backoff` | 27 | 29 | 73 |
| `legacy-session.controller.ts` | — | 35 | — | 35 |

Three commented bodies (25, 26, 27) all fall within median + delta, so they
share one column at 29. The `events` comment is long, so its `lineEndChars`
(73) sets the horizontal extent. The uncommented `legacy-session` line ends at
its `bodyEndChars` (35).
