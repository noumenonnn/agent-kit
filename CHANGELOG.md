# Changelog

[Русский](CHANGELOG.ru.md)

## 2.3.0 — 2026-09-09

- English and Russian versions of all Markdown documentation and bundled instructions; pair catalog, change tracking, and CI completeness checks.
- `setup`, `init`, and `global` accept `--language en|ru`; the wizard offers language selection. Updates retain language; switching requires a backed-up update.
- One active language per skill/prompt; both translations available separately outside automatic discovery.
- SETUP guides and `agent-kit-setup` skill for user-requested setup of new or existing projects.
- Tests for Russian resources across all adapters, language switching, user-context preservation, and OpenCode argument conversion.

## 2.2.0 — 2026-09-08

### Added

- Universal project adapters for Pi, Codex, Claude Code, and OpenCode.
- A single `agent-kit` CLI with setup, interactive wizard, diagnostics, and restore.
- Lean task/context/handoff skills and an optional expanded skill set.
- Exact local context bundles with UTF-8 budgets, source hashes, and freshness verification.
- Native Pi package metadata and an optional SDK resource-loader smoke check.
- English/Russian publication documentation, contribution templates, and integrity tooling.

### Preserved

- Pi's legacy installers, seven prompts, global profiles, and optional context-tools.
- User settings, instruction text outside managed blocks, backups, and restore conflict protection.

### Validation

99 tests passed on Windows; 3 platform/policy checks were skipped. Native Pi 0.85.1 resource loading and the context-tools status handler passed without model calls. Full interactive sessions and provider behavior remain separate checks.

## 2.1.0 — 2026-09-08

- Added the optional Pi read guard and scoped one-shot model worker.
- Added worker usage receipts and evaluation accounting without double counting.
- Kept delegation disabled until interactive session-scoped consent.

Historical audit evidence is identified in [verification/README.md](verification/README.md).
