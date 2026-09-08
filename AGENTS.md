# Repository Guidelines

## Project Structure & Module Organization

- `scripts/agent-kit.mjs` is the universal CLI; `scripts/lib/` plans adapters. `kit.mjs` retains Pi installation and restore.
- `portable/` contains shared skills and context instructions for Pi, Codex, Claude Code, and OpenCode.
- `project-template/` supplies `.agent/` helpers, `.pi/` prompts, and ADRs. Its `AGENTS.md` is a distributed template; this guide governs kit contributions.
- `global/` contains shared skills, settings, and the global instruction fragment; `profiles/` holds optional settings profiles.
- `optional/context-tools/` contains the opt-in extension and evaluation logic.
- `tests/` contains tests; `verification/` stores evidence. Root Markdown documents setup and migration.

## Build, Test, and Development Commands

Use Node.js >=22.19.0; no required dependencies or build step. Run from the repository root:

- `npm run check`: validate JavaScript/TypeScript syntax, JSON, skill/prompt metadata, and policy budgets.
- `npm test`: run the complete built-in Node.js test suite.
- `node --test tests/context-tools.test.mjs`: run the context-tools tests alone.
- `npm run setup -- --target "C:/work/sample-project" --agents all --dry-run`: preview universal installation outside this kit.
- `npm run doctor -- --target "C:/work/sample-project"`: inspect installed adapters. Legacy Pi diagnostics remain in `scripts/doctor.mjs`.
- `npm run context:summary -- path/to/evaluation.json`: validate and summarize evaluation data.

## Coding Style & Naming Conventions

Follow existing ES module patterns: `.mjs`, `node:` imports, two-space indentation, single-quoted strings, and semicolons. Use camelCase identifiers and descriptive kebab-case filenames. Keep shared implementation in Node.js and shell wrappers thin. Write UTF-8 without BOM and preserve LF endings specified by `.gitattributes`. No dedicated formatter or linter is configured.

## Testing Guidelines

Use `node:test` with `node:assert/strict`; name files `*.test.mjs` and describe behavior in test titles. Use temporary fixtures with cleanup and mocked provider calls. Cover changed behavior, especially path validation, backups, restore conflicts, and consent boundaries. No numeric coverage threshold is configured. Run both checks before submitting; CI targets Linux, Windows, and macOS on Node 22.19.0 and 24. Report skipped checks and distinguish offline tests from live Pi/provider smoke tests.

## Commit & Pull Request Guidelines

Use concise imperative subjects, such as `Fix restore conflict detection`. PRs explain the problem, changed behavior, and verification; link issues and update affected documentation. Follow `CONTRIBUTING.md` for release preparation and integrity checks.

## Configuration Invariants

Preserve offline setup, Pi compatibility, explicit extension opt-in, and backup/restore protections. Keep native settings and user instructions intact. `npm run check` enforces separate Pi and portable instruction budgets. Skills guide behavior; only native adapters provide runtime hooks.
