# change-tree-svg contributor guide

## Orientation

`change-tree-svg` renders Change Tree notation as an SVG image. Change Tree notation is an authored, high-level overview of where changes live in a diff, using a Unicode filesystem tree, status markers, collapsed groups, and short comments.

Read [`plans/000/change-tree-svg-functional-spec.md`](plans/000/change-tree-svg-functional-spec.md) before changing behavior. That spec is the source of truth for behavior.

## Change Tree notation

Change Tree is a lightweight convention for giving humans a high-level review map of a diff.

Core notation:

- `++` added
- `**` changed
- `~~` moved
- `--` removed
- `...` collapsed detail
- `#` short comment

Authoring rules:

- Anchor the tree at `.`.
- Show important changed areas, not every touched file.
- Fold repetitive or low-signal files into `...` groups.
- Include counts for large collapsed groups when the count helps review.
- Place `~~` moved entries at their new path and note the old path in a short comment.
- Keep comments short and useful for review.

## TDD

Write the failing test first, then make it pass. Every behavior the package performs should have a test that would fail without it. Commit the red test as its own commit when the failure is informative; otherwise pair it with the implementation.

## Project rules

- Avoid comments unless a short comment saves a reader from tedious parsing of a genuinely complex block.
- Favor readable names, early returns, and simple control flow.
- Name what a value is, not the generic role it plays.
- Spell out abbreviations in directory and file names.
- Break large functions into smaller named functions.
- Prefer clear, small modules with explicit types at public boundaries.
- Reuse existing utilities before adding dependencies or new abstractions.
- Keep behavior deterministic and non-interactive by default.
- Keep scope narrow: authored Change Tree text in, SVG out.
- Do not expand scope into git diff parsing, GitHub posting, automatic summary generation, or validation against real diffs unless the functional spec changes first.
- Update docs and examples whenever user-visible behavior changes.

## PR descriptions

Use `.github/PULL_REQUEST_TEMPLATE.md` when opening PRs.

Writing rules:

- Conciseness is non-negotiable.
- One concrete fact per sentence or bullet.
- Prefer concrete nouns over hand-waving.
- Cut filler.
- Skip any section that would be empty or restate the title.
- Do not add a "Summary" / "What changed" section.

## Agent setup

Shared agent rules live in `.agents/rules/`.

Shared agent skills live in `.agents/skills/`.

Codex startup hooks live in `.codex/`.

Claude compatibility symlinks live in `.claude/`.
