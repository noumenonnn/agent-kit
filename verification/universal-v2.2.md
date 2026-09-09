# Agent Kit v2.2: verification

[Русский](universal-v2.2.ru.md)

Date: 2026-09-08. Host: Windows. These results describe the local run, not a claim that CI ran on every platform.

## Automated checks

- `node --test`: 102 tests, 99 passed, 0 failed, 3 skipped.
- Skips: two POSIX signal/process-group tests on Windows; the legacy PowerShell wrapper test blocked by the host's execution policy. Direct Node installer/CLI tests passed. No execution policy was changed.
- `node scripts/check-kit.mjs`: passed. Pi policy 2,407 bytes; portable policy 599 bytes; lean skill metadata 569 bytes.
- Added coverage: all four adapters, additive setup, zero-write previews, settings/instruction preservation, override precedence, repeatability, one-transaction Pi addon restore, doctor drift/missing-file detection, exact UTF-8 excerpts, serialized byte budgets, staleness, invalid paths, binary files, hardlinks and output conflicts.

The initial baseline had one PowerShell policy failure. The test now records that specific host restriction as a skip and still fails on other launcher errors.

## Native Pi 0.85.1

Installed the official pinned SDK into a temporary development directory using `--ignore-scripts`; it is not a runtime dependency of Agent Kit. Ran:

```sh
node scripts/smoke-pi.mjs --sdk /temporary/path/to/@earendil-works/pi-coding-agent
```

The real Pi resource loader discovered:

| Scenario | Skills | Prompts | Extensions |
| --- | ---: | ---: | ---: |
| Universal project | 3 | 7 | 0 |
| Project with context-tools | 3 | 7 | 1 |
| Local Pi package | 9 | 7 | 0 |

The registered `context-tools status` handler reported `Guard: warn; bulk-reader: OFF` through a captured UI callback. No agent session or provider request was created. Resource/extension diagnostics were empty for kit resources. Machine-readable results: [pi-v2.2-smoke.json](pi-v2.2-smoke.json).

## Distribution

`npm pack --ignore-scripts` produced a local npm archive with the required hidden template directories. Extracted the archive and ran its CLI to set up all four adapters with optional Pi context-tools in a separate fixture. Installation and JSON doctor passed; the empty fixture correctly warned about missing project-specific commands. The package has not been published.

## Limits

Full Pi TUI interaction and real provider calls were not run. Claude Code and OpenCode clients were unavailable; their generated resource contracts were checked against primary documentation and tests. The installed Codex CLI reported 0.153.4, but an authenticated Codex session was not exercised. Interactive wizard happy-path behavior was not driven through a real TTY; noninteractive rejection and the shared setup path were tested. Cross-platform CI remains configured, not locally executed here.

Context bytes and integrity checks are measured; improvements in accepted-task cost, latency or quality have not been established by a controlled model evaluation. See [EVALUATION.md](../EVALUATION.md).
