# Stage 2.5 Phase 2 — CLI folder move

CLI modules now live under `src/cli/`; built bin path is `dist/cli/cli.js`. Output is byte-identical to before the move.

| File | Command | Contents |
|------|---------|----------|
| `cli-default.txt` | `node dist/cli/cli.js --text '++ a.ts'` | SVG + plain-text fallback (default) |
| `cli-no-legend.txt` | `node dist/cli/cli.js --text '++ a.ts' --no-legend` | SVG + fallback, legend hidden |
| `cli-default.svg` / `.png` | `… --no-fallback` | rendered SVG only |
| `cli-no-legend.svg` / `.png` | `… --no-legend --no-fallback` | rendered SVG only, no legend |
| `cli-error.txt` | `node dist/cli/cli.js --bogus` | usage on stderr, exit 1 |
