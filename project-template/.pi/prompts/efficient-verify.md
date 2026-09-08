---
description: Execute appropriate checks without editing source; checks may write artifacts
argument-hint: "[risk or changed surface]"
readonly: false
model-group: verifier
thinking: low
---
Verify the current changes. Focus:
${@:-the changed behavior and its integration boundaries}

Inspect staged, unstaged and untracked paths. Select commands from the actual repository configuration. Review unfamiliar scripts before execution. Run finite targeted checks first, then broader coverage proportionate to risk. Builds/tests may write caches/artifacts: this is not a read-only shell workflow. Do not enable autofix, update snapshots, install dependencies or edit source merely to obtain a green result.
Use compact-run when available; inspect failure context and final test counts. Confirm expected tests were discovered. A filtered summary or process exit 0 is not a test verdict. Do not run checks concurrently with a writer in the same tree.
Report PASS only when the relevant acceptance checks passed; FAIL for observed failures; BLOCKED/NOT RUN for missing capability or unavailable checks. Include commands, evidence paths, skipped checks and residual risk. Never convert an inability to execute into PASS.
