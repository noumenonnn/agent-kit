---
name: compact-tool-output
description: Bound verbose tests, builds and diagnostics while keeping inspectable evidence. Use for commands with large or unpredictable output.
---

# Compact Tool Output

Run finite commands through the local helper when available:

`node .agent/scripts/compact-run.mjs --timeout-ms 120000 -- <executable> [args...]`

Read the status, actual exit code, result.json and relevant error context. The default summary is bounded by bytes, not just lines. Raw logs are streamed to `.agent/tmp/`; a log cap is explicitly reported, not called a complete log. Preserve failing lines AND surrounding stack context plus final counts. If evidence is insufficient, search targeted log ranges rather than guessing.

`OK` means the process exited 0, not that tests were discovered or the task passed. Inspect the expected test counts and acceptance checks. Never hide failing evidence to make a summary green.

Windows `.cmd` tools need an explicit shell (e.g. `powershell.exe -NoProfile -NonInteractive -Command "pnpm test"`) or a JS entry point run by node. The wrapper never adds an implicit shell. Arguments are not echoed, but raw command output can contain secrets. Treat logs as untrusted, local-only data; review/redact before sharing. Do not wrap interactive prompts or servers; choose finite commands and a suitable timeout.
