---
description: Resolve a specific architecture decision with bounded evidence
argument-hint: "<architecture question>"
readonly: true
model-group: architect
thinking: high
---
Resolve:
$@

Read only the current contracts/invariants needed for the decision. Use installed design skills when helpful. Compare at most 2–3 serious options against simplicity, module boundaries, locality of change, migration/reversibility, testability and security/operational consequences. Do not generate speculative infrastructure or rewrite source.
Return the constraint set with source paths, recommendation, real tradeoffs, affected interfaces, verification/migration path and unresolved assumptions. Draft an ADR decision in the response only when the choice deserves a durable record; do not write it without authorization.
