---
name: efficient-context
description: Prepare exact source excerpts with a byte budget and freshness checks for a focused investigation or handoff. Use when broad reads would crowd out relevant evidence.
---

# Efficient Context

1. State the question and find the relevant files/symbols. Select explicit paths and sufficient line ranges; expand if the answer requires more context.
2. When `.agent/scripts/context-pack.mjs` exists, run it from the project root with repeated `--file PATH` and optional `--range START:END`, followed by `--max-bytes 16384`. Add `--out .agent/tmp/context.json` to retain a bundle locally. Output paths must be new files.
3. If the budget is exceeded, narrow the selection or explain why a larger budget is necessary. The tool fails instead of silently clipping evidence.
4. Before reusing a saved bundle, run `node .agent/scripts/context-pack.mjs --verify .agent/tmp/context.json`. Regenerate after source changes. Cite path, line range and source hash in downstream findings.

The bundle contains local source text and makes no model requests. Inspect selected content for secrets. Hash/excerpt verification proves provenance only; assess semantic claims separately. Where scaffolding is absent, use native targeted reads and record source paths explicitly. Read `.agent/references/workflow.md` for command-output reduction or measurement details only when needed.
