---
name: efficient-handoff
description: Save a compact continuation brief when switching agents or approaching a session reset. Use for deliberate handoffs, not after every small task.
---

# Efficient Handoff

Write a brief to the user's chosen repository path or a new file in `.agent/handoffs/`. Preserve conflicting existing content by choosing a new filename. Include:

- Goal, acceptance criteria and user constraints.
- Decisions with source paths; current branch/commit when Git is available.
- Completed changes and relevant uncommitted paths.
- Exact verification commands and results, including failures, skipped checks and stale evidence.
- Remaining uncertainty and the concrete next action.

Keep the brief self-contained, with references instead of transcripts or raw logs. Exclude credentials. Saving a handoff does not reset the session or authorize another agent to run. The receiving agent must recheck current files and constraints before acting. If the project has a context bundle, verify its freshness before reusing its excerpts.
