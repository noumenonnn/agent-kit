# Efficient Work

## Choose the smallest useful workflow

Use `efficient-task` for an implementation task, `efficient-context` for a bounded evidence bundle, and `efficient-handoff` when resuming in another session or agent. Ordinary questions need no ceremony. Native permissions remain authoritative; skills are guidance, not a sandbox.

## Gather context progressively

Find paths and symbols before reading bodies. Use `rg --files` and scoped `rg -n`; exclude generated output. Stop searching when the behavior, change surface and verification path are known. Read dependencies when correctness requires them; byte budgets must not hide an unresolved question.

From the project root, build an exact, local context bundle:

```sh
node .agent/scripts/context-pack.mjs --file src/example.ts --range 10:80 --max-bytes 16384 --out .agent/tmp/context.json
node .agent/scripts/context-pack.mjs --verify .agent/tmp/context.json
```

Repeat `--file` with an optional following `--range start:end`. Omit the range to include the whole file. Oversized bundles fail before emitting source text; narrow the range or deliberately raise the budget. SHA-256 covers full source bytes. Verification detects source drift and changed excerpts. This establishes byte provenance, not the semantic correctness of an agent's answer. Review selected files for secrets; filename exclusions cannot detect every embedded credential.

## Keep evidence accessible

Run a noisy finite check with `node .agent/scripts/compact-run.mjs -- <executable> [args...]`. Inspect its saved log when the bounded excerpt is insufficient. Use `node .agent/scripts/diff-summary.mjs --no-log` for changed paths. Exit zero means the process exited successfully; verify that the intended assertions actually ran. On Windows, choose an actual executable or invoke a reviewed shell command explicitly; the runner does not invent a shell.

## Preserve useful state

Keep stable rules out of changing status files. Save goal, constraints, decisions with sources, changed paths, exact checks/outcomes and the next action in a handoff. Recheck volatile state after compaction or a reset. Keep the host's automatic compaction unless a replacement is deliberately configured and tested.

Delegation is worthwhile only for a bounded independent question. Pass selected sources and an evidence contract, not the parent transcript. Reserve file ownership when agents share a checkout. The optional Pi worker uses separate interactive permission; another client's skills do not grant that capability.

## Measure improvements

Compare the same tasks by acceptance quality, wall time and total tokens/cost, including retries, workers and reviews. Keep unknown cost unknown. Byte counts are portable limits, not tokenizer measurements. This kit does not control provider caching or promise a savings percentage.
