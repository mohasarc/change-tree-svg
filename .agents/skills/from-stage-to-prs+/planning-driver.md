# Planning driver (agent A) — runbook

You turn **one stage** into a committed phased plan, then open it as the bottom PR of
a stack. You do this by drilling into the stage and resolving every design decision
with a second agent (B) you run yourself. The orchestrator that started you stays out
of this entirely — it sees only your final report.

The orchestrator gives you: the stages-file path, the stage-id, and the verification command.

You run B as a **headless `claude -p` subprocess** — read
[`headless-agents.md`](headless-agents.md) first. B is long-lived: you spawn it once
with a fresh `--session-id` and `--resume` it for every turn, so it keeps the whole
thread. Its answers come back to you on stdout (`.result`) — never to anyone else.

## What you read

- The target stage in full (`## Stage <stage-id>` in the stages file).
- The stages doc's **Beyond Scope** and sequencing summary, for boundary awareness only.
- Do not read other stages' bodies. They are not your unit of work.

## The design dialogue

1. **Load `/drill-down`.** Drill into the target stage: scope, site of change, collaborators, new shapes, behavior and contracts, testing, constraints, risks. One question at a time, each with a concrete recommended answer — same as drill-down normally works.
2. **B is your counterpart, not the human.** Spawn B once (fresh `--session-id`); its prompt points it at `answerer.md`, the stages-file path, and the stage-id. Put each question to B by `--resume`-ing its session; read its answer from `.result`. Every question you'd put to a human, you put to B. Explore the codebase yourself first — never ask B what the code already answers. Store B's session id so you can resume it.
3. **Walk the dependency tree.** Earlier answers narrow later questions. Stop inventing questions once no load-bearing unknown remains.

## Reaching agreement

The dialogue ends only on a two-sided, deterministic handshake keyed to a decision summary — not on you running out of questions.

1. When you believe the design is concrete enough to build, send B a **consolidated decisions list**: every resolved point, terse, one line each, followed by a sentinel line on its own: `READY-FOR-PLAN`.
2. B replies (in `.result`) with either the exact token `AGREED`, or a list of specific objections / still-open points.
3. Only the exact `AGREED` lets you proceed. Anything else re-opens the loop — address the points and re-summarize (resume B again).
4. **Soft cap ~40 exchanges.** If you hit it without `AGREED`, do not hang and do not abort: finalize with the decisions you have, record everything still unresolved as explicit open questions, and proceed to the plan.

## Writing and landing the plan

1. **Load `/to-phased-plan`.** Produce the phased plan from the agreed decisions in your context. Record any open questions in the plan where the relevant phase would resolve them.
2. **Branch and commit, through Graphite.** `gt sync` first. Create the plan branch off `main` with `gt create` (or `gt track --parent main` an existing branch). Commit the plan file as `docs: add phased plan for stage <stage-id>`. Never commit to `main`. No `Co-Authored-By` trailer; short title.
3. **Open the bottom PR via Graphite.** `gt submit --no-interactive --draft`. This is the root of the stack; phases stack on top. Write the PR description per the repo's `PULL_REQUEST_TEMPLATE.md` — including the mandatory **Where it lives** (change tree) and **Output preview** sections. If `gt submit` fails because it can't reach its API, **abort and report** — do not hand-build the PR with `git push` + the GitHub API.

## Report back

Return one compact report as your final `.result`: plan file path, branch name, plan PR URL, and any open questions you recorded. Nothing else — not the dialogue, not B's answers.

## What you never do

- Surface the dialogue to the orchestrator or the human.
- Stack by hand. `gt` only; if it can't reach its API, abort — never `git push` + GitHub API / `gh`.
- Commit to `main`, mark the PR ready, or merge it. Drafts only.
- Ask the human anything — B is your only counterpart, and B never escalates to a human either.
- Add a `Co-Authored-By` trailer.
