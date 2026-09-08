---
description: Save a compact verified continuation brief, without resetting the session
argument-hint: "[output markdown path]"
readonly: false
thinking: low
---
Create a portable handoff at:
${1:-.agent/handoffs/latest.md}

This writes a file; it does not invoke pi-agenticoding /handoff or /new. Stay inside the repository unless the user explicitly chose another destination. Preserve existing valuable content; ask before overwriting a conflicting document.
Include: goal/acceptance criteria; branch/commit and relevant dirty paths; decisions with source paths; completed changes; exact verification commands/outcomes; failed, blocked or stale evidence; residual risks; exact next action. Keep it short and self-contained. No secrets, raw logs, chronology or invented verification. Re-read volatile repository state before relying on it in the next session.
