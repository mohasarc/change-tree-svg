---
name: symnav
description: Navigate a TypeScript codebase by symbol from the CLI — a file's symbol tree (overview), find a symbol by name (resolve), where it's defined (def), every reference to it (refs), and the full picture around it (context — definition + callers + callees + reference counts + git history in one block). Each call returns only what you asked for, structured, at a fraction of the tokens Read/grep burn. One `context` call replaces a dozen Read/grep round-trips and hands you a symbol's blast radius instantly. Read this skill once and every `.ts`/`.tsx` question you face afterward gets cheaper and sharper; skip it and you'll burn thousands of tokens doing by hand what one command does. Reach for it first, before any Read or grep on TypeScript.
---

**Stop opening files to find things.** `Read` dumps whole files into your context — most of it noise you'll never use. `grep` floods you with line matches and no structure. Both rot your context and burn tokens. `symnav` answers the actual question — "what's in this file", "where is this defined", "who calls it" — and returns _only that_, structured. Use it first; fall back to Read/grep only when symnav can't answer.

Run from inside a git workspace. `--cwd <dir>` to point elsewhere; `--json` on any command for machine output.

## Which command, when

| Instead of…                               | Use                | Gives you                                                                      |
| ----------------------------------------- | ------------------ | ------------------------------------------------------------------------------ |
| `Read`-ing a file to see what it contains | `overview <file>`  | Symbol tree — classes, functions, methods, line ranges, signatures. No bodies. |
| `grep`-ing for a name across the repo     | `resolve <query>`  | Every symbol/file matching the name, with its id. Your entry point.            |
| `Read` + scrolling to find a declaration  | `def <symbol-id>`  | Exact file, line range, and signature where it's defined.                      |
| `grep`-ing a name to find call sites      | `refs <symbol-id>` | Every reference workspace-wide, grouped by file, tagged by kind, paginated.    |
| Stitching `def` + `refs` + blame by hand  | `context <symbol-id>` | One block: definition, direct callers, direct callees, reference summary, recent git history. |

`context` is workspace-only and certain-edges-only: callers/callees count just statically-resolved calls to non-ignored workspace files, capped at 20 per direction. Possible/dynamic edges and multi-hop traversal are out of scope here — reach for `graph` when it lands. An ambiguous target (interface method with multiple implementations) is refused; query one implementation directly.

## Exploring with `context`

When you land on an unfamiliar symbol, `context` is the one call that orients you: what it is, who depends on it (blast radius before you change it), what it leans on, how heavily it's referenced, and how it's changed lately. That's the work of `def` + `refs` + reading caller files + `git log` — collapsed into one block.

```
$ symnav context apps/cli/src/command.ts::runCommand

Context: runCommand
File: apps/cli/src/command.ts
Lines: 37-85

Definition
└── 37-85: runCommand  [implementation]
    export async function runCommand<Result, Args>(...): Promise<void>

Callers                          # who breaks if you change this — 5 register-*-command.ts sites
├── …/def/register-def-command.ts
│   └── 8-27: registerDefCommand  [call]
│             await runCommand(defCommand, {
└── …/refs/register-refs-command.ts
    └── 16-45: registerRefsCommand  [call]

Callees                          # what this leans on — its signature shown inline
├── 87-136: recordTelemetry  [call ×2]
└── 144-153: handleError  [call]

References
Total: 27
Kinds: usage 21, import 6
Run: symnav refs apps/cli/src/command.ts::runCommand

Recent History                   # is this hot or stable? who last touched it?
1. 3c53915 2026-06-23 Mohammed S. Yaseen
   feat(cli): thread GitHistory through dependencies and context
```

Read it top-down: **Callers = blast radius** (every site you must check before editing), **Callees = dependencies** (what to read next to understand the body), **References + History** = how load-bearing and how active it is. `[call ×N]` means one caller hits it N times; overflow past 20 points you at `graph`. Start a change here, not with `Read`.

## How to drive it

`def`/`refs` need a **symbol-id**, not a bare name:

```
<relative-file-path>::<Segment>[::<Segment>...]      e.g. src/payments/PaymentProcessor.ts::PaymentProcessor::charge
```

Don't guess it — `resolve` (or `overview`) hands you the exact id. Bare names are rejected.

Normal flow: **`resolve` a name → take the id → `def` to read it / `refs` to see who uses it.** Or `overview <file>` to get every id in a file at once.

## Reading output

Tree glyphs show nesting; `start-end: QualifiedName` then the signature line:

```
├── 1-9: PaymentProcessor
│   1 export class PaymentProcessor
│   └── 2-4: PaymentProcessor::charge
│       2 charge(amount: number): string
```

`refs` adds a header (`Total`, `Kinds: usage 7, import 5, …`, `Page`) then references as `<line>: <preview>  [<kind>]`, grouped by file. Long lines trimmed to a preview (`…`).

## Options

- `resolve` — `--fuzzy` (subsequence match, not exact)
- `refs` — `--page <n>`, `--page-size <n>`, `--all` (one page), `--full-lines` (untrimmed source)
- all — `--json`
