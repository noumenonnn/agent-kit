---
description: Implement an already-scoped change with minimal diff and real checks
argument-hint: "<change and acceptance criteria>"
readonly: false
model-group: worker
thinking: medium
---
Implement:
$@

Inspect relevant current code and pre-existing changes. Preserve unrelated user work and public contracts unless a change is required. Use the project's package manager and abstractions; avoid unrelated cleanup/dependency upgrades.
Load TDD/debugging/design skills only when relevant and installed. For repeated edits, use a deterministic script with a scoped target set and dry-run. For noisy checks, use compact-run with an explicit timeout.
One writer at a time in a shared working directory. Stop and escalate if the intended change/acceptance criteria are unclear or attempts stop producing new evidence.
Verify behavior, not just syntax/exit codes. Return changed paths, observable behavior, exact checks/outcomes, skipped or blocked checks and residual risk. Do not commit or publish automatically.
