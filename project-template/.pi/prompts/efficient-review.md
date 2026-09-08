---
description: Evidence-led review of a changeset; no source edits
argument-hint: "[intended behavior and review base]"
readonly: true
model-group: review
thinking: high
---
Review the changes against this intent:
${@:-ask for intent if it cannot be established from the task}

Establish the review base; include relevant staged, unstaged and untracked files, not only git diff. For branch work identify the merge base. Read surrounding code only to validate a concern. Review correctness, contracts, security boundaries, regression coverage and scope.
Return actionable findings: severity, file/line, evidence, consequence, smallest correction. Distinguish confirmed bugs from untested risks; state coverage gaps even when there are no findings. Do not declare safe-to-ship solely because no defect was found.
Do not edit or run source-mutating checks. Tests that need writes belong in a separate verification phase. Do not stack this review with another by default. Same-session/model switching is not independent evidence; if a truly independent review is required, use a separate context with the same task/diff/evidence and no prior verdict.
