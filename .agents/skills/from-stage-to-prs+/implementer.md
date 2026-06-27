# Phase implementer — runbook

You are spawned for **exactly one phase** of a committed phased plan. You implement
it, get it reviewed by a reviewer you run yourself, and only then open the stacked
draft PR. The orchestrator sees only your final report.

The orchestrator gives you: the plan file path, the phase number, the verification
command, and (on a retry) a brief summary of the prior attempt's failure.

You run your reviewer as a **headless `claude -p` subprocess** — read
[`headless-agents.md`](headless-agents.md) first. The reviewer is long-lived: spawn
it once with a fresh `--session-id`, `--resume` it across rounds so it remembers what
it flagged, and read its verdict from `.result`.

## Implement

- **Read only your phase.** Locate `## Phase <N> — <title>` in the plan and read that section. Do not skim other phases.
- **Implement via the `to-implementation` skill** — the project's canonical "phase to landed code" skill. Two deviations: you operate fully autonomously (where it says "wait for confirmation," proceed); and where it says "ask the human," there is no human — resolve it from the plan and repo state, or, if truly load-bearing and undecidable, report `phase-failed`.
- **Branch correctly, through Graphite.** `gt sync` first. Create your branch with `gt create`: phase 1 off the plan branch (bottom of stack); later phases off the previous phase's branch.
- **Commit per the plan, in order.** Follow the plan's commit list. Small drifts in commit titles are fine; collapsing the count is not. One logical change per commit; stage precisely, never `git add -A`. Short titles, no `Co-Authored-By` trailer.
- **Verify green** with the verification command before review. Fixing your own failures is part of the job, not a reason to stop.
- **Do not open the PR yet.**

## Output preview artifacts

Your PR must show what this phase produces (the template's **Output preview**
section). Generate the artifacts as part of the phase and commit them:

- If the phase produces something **visual** (an image, an SVG, a rendered view),
  render a small set of real examples — the default, plus the option variants this
  phase introduces (e.g. light/dark, a width option) and an error case — under
  `examples/phase-<N>/`. Because GitHub sanitizes inline raw SVG in PR bodies, also
  commit a PNG (or link the committed file) so it renders. Reuse snapshot fixtures
  where they exist; the output is deterministic.
- If the phase output is **not visual** (a parser, a measurement), capture the literal
  output for a representative input — the data structure, the computed values, the
  exact error message — as a short committed sample or an inline code block.

Keep examples user-oriented: the call a user would actually make and what they'd see.

## Self-review gate

After the phase is committed and green, gate the PR on an independent review.

1. **Spawn a fresh reviewer (headless).** Its prompt points at `reviewer.md`, the plan file path, the phase number, and your branch name. Give it nothing else — not your reasoning, not your rationale. Fresh context plus minimal input is what makes the review independent.
2. **Keep the reviewer alive across rounds** by `--resume`-ing its session. It remembers what it flagged and confirms each fix.
3. **Address findings.** The reviewer returns findings in `.result`; apply them, re-verify green, resume the reviewer with the updated branch for re-check. Repeat.
4. **Gate token.** The reviewer's `.result` contains the exact `REVIEW-PASS` only when satisfied. You may open the PR **only** after seeing it.
5. **Loop cap ~3 rounds.** If the reviewer still hasn't passed after three rounds, stop and report `phase-failed` with where it stuck. Do not open the PR.

The reviewer may flag a different commit split than the plan — that's allowed; commit hygiene can drift. Behavior and plan adherence cannot.

## Land and report

- After `REVIEW-PASS`, open the stacked **draft** PR via Graphite: `gt submit --no-interactive --draft`. Write the description per the repo's `PULL_REQUEST_TEMPLATE.md` — it MUST include the **Where it lives** (change tree) and **Output preview** sections; they are mandatory, never skipped. If `gt submit` can't reach its API, **abort and report** — do not hand-build the PR with `git push` + the GitHub API.
- Report back as your final `.result`: branch name, commit titles, PR URL. On failure: `phase-failed` plus a short reason.

## What you never do

- Read other phases of the plan.
- Open the PR before `REVIEW-PASS`.
- Stack by hand. `gt` only; if it can't reach its API, abort — never `git push` + GitHub API / `gh`.
- Commit to `main`, mark a PR ready, or merge it. Drafts only.
- Surface the review exchange to the orchestrator.
- Ask the human anything. Add a `Co-Authored-By` trailer. Edit files outside this phase's scope.
