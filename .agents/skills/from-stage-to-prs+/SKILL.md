---
name: from-stage-to-prs
description: Drive a single stage from a stages document all the way to a stack of reviewed PRs, autonomously. Loads one stage, runs a two-agent design dialogue to narrow it down, turns the agreed design into a committed phased plan, then implements each phase as a stacked draft PR gated by a strict per-phase review. Use when you want to hand off a whole stage and walk away. Triggers include "take stage N to PRs", "from stage to prs", "implement stage N end to end", "drive this stage to a stack".
---

# From stage to PRs (orchestrator)

You drive **one stage** from a stages document to a stack of reviewed draft PRs,
autonomously. You delegate every unit of real work to a fresh-context sub-agent and
only ever ingest compact reports back.

You run sub-agents as **headless `claude -p` subprocesses** — see
[`headless-agents.md`](headless-agents.md). Do NOT use the host's in-session
agent-spawn tool for any dialogue or review: its completions route to the top-level
conversation and leak the exchange into your context, which defeats the skill. A
headless child's answer comes back on stdout, to you, and nowhere else.

## Invocation

`/from-stage-to-prs <stages-file> <stage-id> [--checkpoint]`

- `<stages-file>` — path to the stages document (`## Stage N — <name>` sections).
- `<stage-id>` — the stage number to implement. One stage per run.
- `--checkpoint` — off by default. When set, you stop once after the plan PR is open and wait for the human's okay before phase 1.

## Why this exists

Two failure modes are being avoided at once.

1. **Shallow design.** A single agent that both designs and builds rushes the design — it implements its first instinct. A stage is too coarse to implement directly; it needs to be narrowed into a concrete phased plan first.
2. **Context dilution over long runs.** After hours of work, one agent loses fidelity to the plan and collapses structure (bundling commits, skipping review). The remedy is fresh context per unit of work, and an orchestrator that stays lean by ingesting only compact summaries — never transcripts, never dialogue.

The orchestrator's leanness is load-bearing. **You must never read a design dialogue or a review back-and-forth.** With headless sub-agents this is structural: you only ever read a child's final `.result`.

## Preflight (before any work)

1. **Graphite must work.** This skill stacks exclusively through Graphite. Verify
   `gt` is installed, authenticated, and can reach its API: run `gt sync` (or a
   cheap authenticated `gt` call). If it fails — auth error, or a proxy 403 on
   `api.graphite.com` — **abort and report**: the environment is not set up
   (allowlist `api.graphite.com`, set a valid `GRAPHITE_TOKEN`). Do NOT hand-build
   a stack with `git push` + the GitHub API as a fallback — that is forbidden (see
   *What you never do*).
2. **Headless agents must work.** Confirm `claude -p "ping" --output-format json`
   returns a result. If not, you cannot run this skill — report it.

## The run, end to end

1. **Load the stage.** Read `<stages-file>` and locate `## Stage <stage-id>`. Confirm it exists. You do not need its body beyond a one-line identity — the planning driver reads it fresh.
2. **Run the planning driver (A), headless.** Spawn A with a fresh `--session-id`; its prompt points it at `planning-driver.md` plus the stages-file path, stage-id, and verification command. A runs the design dialogue with its own headless answerer (B), reaches agreement, writes the phased plan, commits it, and opens it as the bottom draft PR of the stack. You never see the dialogue — only A's final `.result`: plan file path, branch, plan PR URL, open questions. Store A's session id in case you must resume it.
3. **Checkpoint (only if `--checkpoint`).** Surface the plan PR URL and open questions to the human and stop. Resume into step 4 when they okay it. Without `--checkpoint`, go straight to step 4.
4. **Enumerate phases.** Read the committed plan file from disk to list its phases (`## Phase N — <title>`). Re-read each phase's section fresh from disk immediately before delegating it — never paraphrase from memory.
5. **Implement each phase, in order, headless.** Spawn a fresh implementer per phase (fresh `--session-id`), prompt pointing at `implementer.md` plus the plan path, phase number, and verification command. The implementer implements, self-reviews via its own headless reviewer, and opens the stacked draft PR only after the review passes. Its `.result`: branch, commit titles, phase PR URL — or `phase-failed`.
6. **Verify each phase before advancing.** Re-run the verification command and confirm the stacked draft PR exists (and is stacked on the right base). If either is wrong, the phase failed regardless of what the implementer claimed.
7. **Stop cleanly.** When the last phase verifies, exit with the stack summary. On abort, surface why.

## Verification command

Default: `pnpm test && pnpm lint && pnpm typecheck`. If those fail or don't apply to this project, find the real commands for tests / lint / typecheck in `package.json` scripts, `AGENTS.md`, or other project config, and use those. Use the same command everywhere in the run.

## Bounded retry

Up to three attempts per phase, each a fresh-context implementer (new `--session-id`) handed a brief summary of the prior failure. A phase fails if the implementer reports `phase-failed` (its review loop didn't converge) or your verification doesn't pass. After three attempts, abort and surface where.

## Context discipline

- The only things you ingest are children's compact `.result` strings: from A (plan path, branch, PR URL, open questions) and from each implementer (branch, commit titles, PR URL, or `phase-failed`).
- **Never** read a child's full transcript, the A↔B design dialogue, or the implementer↔reviewer review exchange. Parse only `.result` from the JSON; redirect long output to a file you do not open.
- Re-read the plan section for the next phase from disk before delegating; don't rely on memory.

## What you never do

- Edit code, run tests outside the verification command, or make commits. Sub-agents do that.
- Read any dialogue or review exchange.
- Answer design questions yourself — that's B's job, inside A.
- **Stack by hand.** Never open or stack PRs with `git push` + the GitHub API / `gh`. Every branch and PR goes through Graphite (`gt`). If `gt` can't reach its API, abort — do not route around it.
- Squash, rebase, force-push, or mark PRs ready / merge them. The human decides what merges.
- Ask the human anything mid-run, except the single optional `--checkpoint` pause. Otherwise answer from the plan and repo state, or abort.
- Operate on `main`. The plan and every phase land via stacked draft PRs on feature branches.
