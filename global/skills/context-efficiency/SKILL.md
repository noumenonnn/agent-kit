---
name: context-efficiency
description: Keep context focused across long investigations, multiple phases or delegation. Use when context noise threatens the next correct decision.
---

# Context Efficiency

Keep the smallest context that supports the next correct decision, not the fewest tokens at any cost.

- Search → relevant files → sufficient read → expand only for an unresolved question.
- Reuse unchanged evidence; re-read after edits, resets or when exact current bytes matter.
- Keep instructions/tool catalogs stable during a phase. Appending changing status to AGENTS or repeatedly switching models harms cache reuse.
- For a small task use one agent/phase. Delegate only if isolation or specialization pays for the coordination cost.
- Give a child a bounded goal, owned paths, constraints, verification path, output contract and stop condition. Children in the same cwd share files; permit one writer at a time.
- Save canonical decisions, constraints, source pointers, dirty state, exact checks/outcomes, blockers and next action before a context cut. Do not save transcripts or secrets.
- Core Pi: keep auto-compaction on and use /compact when useful. Optional pi-agenticoding: deliberate /handoff only after a checkpoint and a smoke-tested setup. Handoff starts a new prefix; it does not preserve cache.
- Stop exploration once behavior, change surface and verification are known. Escalate when attempts yield no new evidence.

Measure end-to-end cost/time per accepted task and quality/failure rates, including subagents, retries, reviews and cold-cache effects. Do not claim savings without a controlled baseline.
