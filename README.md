# Agent Kit

**Focused context. Predictable setup. Pi, Codex, Claude Code, and OpenCode.**

[Русский](README.ru.md) · [Full guide](UNIVERSAL-RU.md) · [Contributing](CONTRIBUTING.md) · [Changelog](CHANGELOG.md)

[![Checks](https://github.com/noumenonnn/agent-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/noumenonnn/agent-kit/actions/workflows/ci.yml) [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Agent Kit prepares a new or existing repository for AI-assisted development. It installs focused skills, project instructions, and dependency-free Node.js helpers. Your existing instructions, settings, and model choices stay under your control.

Pi remains a first-class integration, including its prompt templates, optional read guard, scoped model worker, and native package format.

## Quick start

Requires **Node.js 22.19+** and a separately installed coding agent:

```sh
git clone https://github.com/noumenonnn/agent-kit.git
cd agent-kit
npm run wizard
```

For repeatable setup without prompts:

```sh
npm run setup -- --target ../my-project --agents all --dry-run
npm run setup -- --target ../my-project --agents all
npm run doctor -- --target ../my-project
```

The target can be new or existing and must be outside the kit directory. Select one agent with `--agents pi`, `codex`, `claude`, or `opencode`; comma-separated lists also work. New installations default to Pi. No dependency installation is required for the kit.

On Windows, use `npm.cmd` if PowerShell blocks `npm.ps1`, or run `node scripts/agent-kit.mjs wizard` directly.

Open your project in the selected agent and start a task:

| Agent | First request | Integration |
| --- | --- | --- |
| Pi | `/efficient-task Add X and verify Y` | Shared skills + 7 native prompts |
| Codex | `$efficient-task Add X and verify Y` | Shared skills + AGENTS.md |
| Claude Code | `/efficient-task Add X and verify Y` | Native project skills + CLAUDE.md |
| OpenCode | `/efficient-task Add X and verify Y` | Shared skills + 7 native commands |

The installer writes a project-specific `.agent/GETTING-STARTED.md` with next steps.

## What you get

- **Three focused skills:** implement a task, assemble exact context, and prepare a handoff. `--preset deep` adds six specialist skills.
- **Context on demand:** a small stable instruction block, scoped references, and explicit file/line selection.
- **Verifiable excerpts:** UTF-8 byte budgets, full-source SHA-256 hashes, and freshness checks. Oversized bundles fail rather than silently clip evidence.
- **Compact check output:** bounded terminal excerpts with local logs and real process exit codes.
- **Safe setup:** zero-write previews, preserved user settings, managed instruction blocks, installation receipts, and conflict-aware restore.
- **Offline operation:** setup makes no network or model calls and installs no third-party code.

## Exact context, without a model request

From a prepared project:

```sh
node .agent/scripts/context-pack.mjs --file src/main.ts --range 20:90 --max-bytes 16384 --out .agent/tmp/context.json
node .agent/scripts/context-pack.mjs --verify .agent/tmp/context.json
```

Repeat `--file` to include additional sources. Omit `--range` for a whole file. The budget covers the serialized JSON; the output path must be new. Verification establishes source/excerpt integrity, not the semantic correctness of an answer. Byte counts are not token counts.

## Optional Pi context-tools

```sh
npm run setup -- --target ../my-project --agents pi --with-context-tools
```

In a trusted interactive Pi session, run `/reload`, then `/context-tools status`. The guard starts in warning mode and the worker starts disabled. Delegation requires the user's interactive model and path selection. [Configuration and behavior](CONTEXT-TOOLS-RU.md).

Native guard/worker hooks are currently implemented **only for Pi**. Other adapters provide skills, instructions, and portable helpers; they do not intercept tool calls.

The repository also works as a local Pi package: `pi install /absolute/path/to/kit -l`. This is an alternative way to load skills/prompts, not an additional step after project setup. Use `setup` for complete project scaffolding.

## Updates and restore

Repeated setup is additive and idempotent. Preview updates with `--force --dry-run`, then apply with `--force`. Existing client settings and user-authored context/conventions remain preserved. Managed instruction updates keep surrounding text intact.

Each operation prints its backup manifest. To undo it:

```sh
node scripts/agent-kit.mjs restore --target ../my-project --manifest ../my-project/.pi-starter-backups/RUN/manifest.json --dry-run
```

Remove `--dry-run` to restore. Undo operations in reverse order; later user edits block conflicting restores. [Full lifecycle guide](UNIVERSAL-RU.md).

## Validation and limits

The recorded Windows run has **99 passing tests, 3 platform/policy skips, and no failures**. The real Pi 0.85.1 resource loader successfully loaded project resources, the optional extension, and the native package. Full interactive client/provider sessions were not exercised. CI is configured for Linux, macOS, and Windows on Node 22.19 and 24.

```sh
npm run check
npm test
```

[Verification report](verification/universal-v2.2.md) · [Evaluation protocol](EVALUATION.md) · [Portal and related-project research](RESEARCH-UNIVERSAL-RU.md).

No percentage savings are promised. Compare quality, total cost, and time on the same accepted tasks. OpenCode can discover both shared and Claude skill copies; `doctor` flags divergent copies.

## Documentation

- [Universal setup and compatibility](UNIVERSAL-RU.md)
- [Russian overview and legacy Pi commands](README.ru.md)
- [Migration](MIGRATION-RU.md)
- [Security reporting](SECURITY.md)
- [Sources and attribution](SOURCES.md)

The npm package name remains `pi-token-efficient-starter-kit`; the CLI is `agent-kit`. This project is distributed through GitHub and local archives; it has not been published to npm. It is independent of the agent vendors and Spotify.

## License

[MIT](LICENSE). Optional external packages retain their own licenses; their code is not bundled by the offline installer.
