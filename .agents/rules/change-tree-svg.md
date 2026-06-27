---
description: This rule tells agents to read the change-tree-svg functional spec before changing package behavior.
alwaysApply: true
---

Before changing behavior in this repository, read `plans/000/change-tree-svg-functional-spec.md`.

The package is intentionally narrow: authored Change Tree text in, SVG out. Do not expand scope into git diff parsing, GitHub posting, automatic summary generation, or validation against real diffs unless the functional spec is updated first.
