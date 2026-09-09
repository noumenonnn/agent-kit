# Agent Kit v2.3 verification

[Русский](universal-v2.3.ru.md)

Date: 2026-09-09. Host: Windows, Node 24.19.0. Results below describe this local run; GitHub Actions records platform results against their own commit.

## Checks

- `node --test`: 104 tests, 101 passed, 0 failures, 3 skips. Skips are two POSIX process/signal checks and the legacy PowerShell wrapper blocked by host execution policy. Direct Node setup remains tested.
- `node scripts/check-kit.mjs`: syntax/JSON, 20 skill files, 14 prompt files, and both languages' budgets passed.
- English: Pi policy 2407 bytes, portable policy 599, lean metadata 704. Russian: 3249, 800, 737 UTF-8 bytes respectively. These are byte counts, not tokenizer or cost measurements.
- `node scripts/check-docs.mjs`: complete paired-document coverage, reviewed hashes, and local human-document links. This is a structural check, not an automatic semantic translation evaluation.
- All four adapters were tested with Russian resources, including the setup skill, dormant English/Russian copies, language retention, backed-up language changes, and preservation of user-owned context.

## Native Pi 0.85.1

An official pinned SDK was installed in a temporary directory with `--ignore-scripts`. `node scripts/smoke-pi.mjs --sdk PATH` used Pi's real resource loader:

| Scenario | Skills | Prompts | Extensions |
| --- | ---: | ---: | ---: |
| English project | 4 | 7 | 0 |
| Russian project | 4 | 7 | 0 |
| English project with context-tools | 4 | 7 | 1 |
| Russian project with context-tools | 4 | 7 | 1 |
| Native package, English | 10 | 7 | 0 |

No resource diagnostics or duplicate translation discoveries occurred. Both context-tools status handlers reported warn/worker OFF via a captured UI callback. No agent session or model request was created.

## Distribution and limits

`npm pack --ignore-scripts` included Russian hidden template paths and the bilingual catalog. The extracted archive passed the documentation checker; its direct CLI was checked with all adapters and Russian instructions.

Paid provider calls, full Pi TUI, and live Codex/Claude Code/OpenCode sessions were not exercised. Wizard prompts were translated, but the full interactive TTY flow was not driven. Static doctor does not establish client authentication or runtime behavior. No measured quality, latency, or monetary savings are claimed.
