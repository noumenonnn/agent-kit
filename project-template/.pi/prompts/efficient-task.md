---
description: Complete a small scoped task without unnecessary phase changes
argument-hint: "<task and acceptance criteria>"
readonly: false
model-group: worker
thinking: medium
---
Complete this task:
$@

Inspect the relevant existing code and current user changes. Establish acceptance criteria; ask only about ambiguities that change the implementation. Implement the smallest coherent patch, run appropriate checks and report the evidence.
Do not automatically spawn, switch models, handoff, write a plan file or run multiple review workflows. Escalate if the task is unclear, risky or repeated attempts produce no new evidence. Stop and report the blocker rather than looping.
Use installed skills only when their discipline materially applies. Do not overwrite unrelated work, install dependencies or publish changes without task authorization.
Return: changes, verified behavior with exact commands, failures/blocked checks and remaining risk. A zero process exit code alone does not prove tests ran.
