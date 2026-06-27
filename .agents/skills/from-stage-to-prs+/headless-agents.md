# Headless sub-agents — how this skill runs nested agents

Every nested agent in this skill is invoked as a **headless `claude -p` subprocess**,
not via the host's in-session agent-spawn tool. This applies at every level: the
orchestrator runs the planning driver and the implementers headlessly; the planning
driver runs its answerer headlessly; the implementer runs its reviewer headlessly.

## Why headless, not the in-session spawn tool

The host's nested-agent spawn/messaging routes a child's turn-completion to the
TOP-LEVEL conversation ("main"), not to the parent that spawned it. Confirmed
empirically: a parent could feed a child and the child kept its context, but the
parent never received the child's replies — every reply surfaced at main. That
leaks the whole design dialogue and review exchange into the orchestrator's
context, destroying the leanness the skill depends on.

A headless subprocess has none of that coupling. The parent runs the child, the
child writes its answer to stdout, the parent reads it directly. Nothing routes
anywhere else. It is also portable: the same shape works in any harness exposing a
headless agent CLI or an SDK session — "create session → send → read → resume".

## The primitives

Spawn a child in a fresh, isolated session:

```bash
SID=$(python3 -c "import uuid;print(uuid.uuid4())")
OUT=$(claude -p "$PROMPT" --session-id "$SID" --output-format json --dangerously-skip-permissions)
RESULT=$(printf '%s' "$OUT" | python3 -c "import sys,json;print(json.load(sys.stdin)['result'])")
# store $SID — it is this child's handle
```

Continue the SAME child, context intact:

```bash
OUT=$(claude -p "$NEXT_PROMPT" --resume "$SID" --output-format json --dangerously-skip-permissions)
RESULT=$(printf '%s' "$OUT" | python3 -c "import sys,json;print(json.load(sys.stdin)['result'])")
```

Rules that matter:

- **Always pass an explicit `--session-id <uuid>` on the first turn.** A bare
  `claude -p` can attach to the ambient session; an explicit uuid isolates the child.
- **Continuity is `--resume <uuid>`.** It reloads the child's full context — this is
  what makes the conversation continuous. Never re-spawn a fresh session mid-dialogue;
  you would throw the context away (and re-derive, contradict earlier turns).
- **`--output-format json`** so you can parse `.result` (the answer) and
  `.session_id`. For long output, redirect to a file and parse it; ingest only
  `.result`, never the child's full transcript.
- **`--dangerously-skip-permissions`** keeps the child non-interactive. It runs in
  the same isolated container; use the narrowest mode that does not block (in this
  sandbox that flag is the pragmatic default). `--allowedTools`/`--permission-mode`
  if you want it tighter.
- **`--model <id>`** to pin a role's model; **`--append-system-prompt`** to inject
  extra role rules without bloating the prompt.

## Handing a child its runbook

Children share the filesystem. Put the runbook path in the prompt and tell the child
to read it first. Example:

> "Read `<skill-dir>/answerer.md` — that is your runbook. Inputs: stages-file
> `<path>`, stage-id `<N>`. Question: `<...>`. Return only your answer as your final
> message."

## Session-ID ownership (the handle tree)

Each parent stores the session UUIDs of ITS DIRECT children only — a small map in the
parent's working notes or a scratch file (e.g. `{"answerer": "<uuid>"}`). A child that
is itself an orchestrator keeps the same kind of map for its own children. The handles
form a tree; there is no global registry and no shared bus. This is the portable,
leak-free substitute for nested in-session spawning.

## Contract for any child

- Do your work; return your answer as your FINAL stdout (`.result`). Do not try to
  message a parent or peer — you can't, and you don't need to.
- You are long-lived: the parent will `--resume` you each turn. Hold your thread.
- Keep the final message tight — it is the only thing the parent ingests.
