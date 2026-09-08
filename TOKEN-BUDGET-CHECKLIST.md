# Context and cost checklist

## Stable hot context
- [ ] AGENTS is a small router with essential safety constraints, not a handbook.
- [ ] Read the project commands/domain details only when needed.
- [ ] No changing timestamps/task history in the system prefix.
- [ ] No redundant skill descriptions or broad extension catalogs.
- [ ] Preserve upstream user-only skill metadata; Pi uses `/skill:name`.

## Evidence quality
- [ ] Search before broad reading, but expand enough to avoid a locally plausible mistake.
- [ ] Account for staged/unstaged/untracked files and the right review base.
- [ ] Bound output by bytes AND line length, stream logs, preserve failure context.
- [ ] A clipped/capped log is marked as incomplete.
- [ ] Test discovery/counts and acceptance criteria are checked; exit 0 alone is insufficient.

## Workflow overhead
- [ ] One worker is the default for a small task.
- [ ] Each delegation has an actual benefit, scope/ownership, result contract and stop condition.
- [ ] One writer per shared working directory; worktree isolation is explicit.
- [ ] Do not duplicate deep and lightweight reviews without a reason.
- [ ] A phase change/handoff pays for the new cache prefix rather than discarding useful context on autopilot.
- [ ] Core keeps auto-compaction; an alternative is opted into only after smoke tests.

## Evaluate, do not assert savings
- [ ] Compare equivalent tasks/acceptance checks and actual provider accounting.
- [ ] Include parent + children + retries + reviews + cache effects.
- [ ] Primary: total cost/time per accepted task, with success/regression rate as a quality gate.
- [ ] Secondary: uncached input, output, cache reads/writes, tool calls, turns, context size.
- [ ] Record failures and blocked tasks; do not make a setup look cheap by excluding failures.
- [ ] No unsupported percentage improvement or universal "optimal context" threshold.

See `EVALUATION.md` for a lightweight repeatable protocol.
