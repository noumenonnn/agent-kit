# Universal Agent Kit

[Русский](UNIVERSAL-RU.md)

## Installed resources

Agent Kit v2.3 is a portable core of skills and Node.js tools with Pi, Codex, Claude Code, and OpenCode adapters. `setup` scaffolds a project; it does not install clients or providers.

| Capability | Pi | Codex | Claude Code | OpenCode |
| --- | --- | --- | --- | --- |
| Project instructions | AGENTS.md / active AGENTS.override.md | AGENTS.md / active override | CLAUDE.md | AGENTS.md |
| On-demand skills | .agents/skills | .agents/skills | .claude/skills | .agents/skills |
| First request | /efficient-task | $efficient-task | /efficient-task | /efficient-task |
| Context bundles, compact logs, handoff | Yes | Yes | Yes | Yes |
| Native prompts/commands | All 7 previous Pi prompts | Through skills | Through skills | 7 commands |
| Native read guard and separate model worker | Optional context-tools | Not installed | Not installed | Not installed |
| Global Pi settings and profiles | Legacy CLI preserved | Unchanged | Unchanged | Unchanged |

File contracts are checked automatically. Only Pi has a native guard/worker implementation; skills in other clients do not intercept tool calls. Live client compatibility is checked separately from offline tests.

## New or existing project

From the kit directory:

```sh
node scripts/agent-kit.mjs setup ../my-project --agents all --language en --dry-run
node scripts/agent-kit.mjs setup ../my-project --agents all --language en
node scripts/agent-kit.mjs doctor --target ../my-project
```

Use `--agents pi,codex` for those clients only. New installations default to Pi; subsequent runs reuse previous agents. An explicit list adds adapters without removing others. `--preset deep` adds six skills; selecting lean does not automatically remove them.

`npm run wizard` asks for language, project, agents, and optional Pi tools, previews the plan, and applies after `y` or `да`. In CI use `setup` arguments; without a terminal the wizard exits with guidance rather than hanging. Direct Node execution on Windows does not depend on `.ps1` execution policy.

New projects get `.agent/GETTING-STARTED.md`, references, `CONTEXT.md`, an ADR template, and helpers. Existing `package.json` scripts suggest `dev/build/test/check/typecheck/lint` commands using the lockfile's package manager. Setup **does not execute** them. For other stacks, populate conventions from actual configuration.

## Languages and agent-led setup

Use `--language en|ru`; a new noninteractive setup defaults to English, while updates retain the recorded language. All bundled instructions have both versions; `.agent/translations/en/` and `ru/` hold dormant copies outside client discovery. Only the chosen language is installed into native skill/prompt roots. The npm Pi package uses English originals; use project `setup --language ru` for Russian resources.

For setup by an agent, give it [SETUP.md](SETUP.md), or invoke the installed `agent-kit-setup` skill. It covers inspection, preview, authorized application, project commands, doctor, and a completion report. Change language using `--language ru --force --dry-run`, then the same command without `--dry-run`. User-authored CONTEXT, conventions, and other preserved references are not automatically translated or overwritten. CLI flags, diagnostic codes, JSON keys, and third-party source content retain their original identifiers/language.

## Predictable updates and restore

- Client settings remain byte-identical, including models, providers, permissions, and compaction.
- AGENTS/CLAUDE get an `AGENT-KIT` block. Updating it requires `--force`; surrounding text is retained. Pi/Codex honor a nonempty active `AGENTS.override.md`. User CONTEXT, ADRs, and conventions remain even with `--force`.
- Existing same-name skill directories are preserved entirely. `--force` updates kit files with backups while retaining unrelated files.
- `--dry-run` does not even create the target directory. One installation, including its optional Pi addon, has one manifest.
- `.agent/kit.json` records adapters, language, and installed-file hashes. `doctor --json` supports scripts; errors return 1 and warnings return 0.

Preview an update with `--force --dry-run`, then apply `--force`. Undo using the manifest printed by installation:

```sh
node scripts/agent-kit.mjs restore --target ../my-project --manifest ../my-project/.pi-starter-backups/RUN/manifest.json --dry-run
node scripts/agent-kit.mjs restore --target ../my-project --manifest ../my-project/.pi-starter-backups/RUN/manifest.json
```

Undo sequential installations in reverse order. Later user edits block restore rather than being erased. Empty directories and backups remain. Migrate from v2.1 with `setup`, not `init --force`. Previous global Pi skills may overlap with deep; check with legacy `scripts/doctor.mjs`.

## Multiple clients

Pi/Codex/OpenCode share `.agents/skills`; Claude gets ordinary copies from the same source. No symlinks are required. OpenCode may warn about duplicate names from `.agents` and `.claude`: identical content is equivalent, but precedence for differing copies depends on the version. Doctor treats divergent copies as errors; synchronize intentional changes before switching clients. Alternatively, install adapters in separate working copies.

Nested instructions, global rules, and user-disabled skills can change client behavior. Restart a client if it does not discover new resources. Doctor checks project files, not actual client loading or every global setting.

## Complete Pi scaffolding

Legacy `global`, `init`, `matt`, `context-tools`, `restore`, `/efficient-*`, and `/portable-handoff` remain. The optional agenticoding profile still requires explicit selection and testing; core retains automatic compaction.

```sh
node scripts/agent-kit.mjs setup ../my-project --agents pi --with-context-tools
```

In trusted interactive Pi: `/reload`, then `/context-tools status`. Guard starts advisory and delegation disabled. The user enables it with `/context-tools enable`, selecting a model and allowed paths. Details and limits: [CONTEXT-TOOLS.md](CONTEXT-TOOLS.md).

The kit also has native Pi package metadata. Instead of project skill/prompt copies, attach the local directory:

```sh
pi install /absolute/path/to/kit -l
```

This is an alternative resource installation, not another mandatory step after setup: using both creates duplicates. It includes portable and deep skills and every prompt, but not context-tools or project helpers. Prefer setup for full scaffolding. Keep the local package directory available. [Pi packages contract](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/packages.md).

The npm package name is retained for compatibility; the bin is `agent-kit`. Build a local archive with `npm pack --ignore-scripts`. It is not published to the registry; fetching `npx agent-kit` from the internet does not install this version.

## Context optimization

Defaults use exact ranges, bounded logs, a small stable policy, and four specific skills instead of automatic source summarization. English portable policy and lean metadata each have a 1 KiB budget; Russian UTF-8 budgets are checked separately. Changing status belongs in handoff files, not permanent instructions.

From a prepared project:

```sh
node .agent/scripts/context-pack.mjs --file src/main.ts --range 20:90 --file tests/main.test.ts --max-bytes 16384 --out .agent/tmp/context.json
node .agent/scripts/context-pack.mjs --verify .agent/tmp/context.json
```

Omit `--range` for the whole file. The budget includes serialized UTF-8 JSON; exceeding it fails without partial output. Up to 16 files and 2 MiB local scanning per file are allowed. Hashes cover entire sources, so changes outside selected lines also make a bundle stale. A new `--out` refuses to overwrite existing files. Bundles are not automatically sent to models.

Known credential/config paths are excluded; this does not detect all embedded secrets. Verification establishes provenance and excerpt text, not answer meaning. Bytes are not tokens. Evaluate quality, cost, and latency using [EVALUATION.md](EVALUATION.md); no savings percentage is promised.

## Live client checks

The real Pi 0.85.1 SDK was checked: project skill/prompt loading, optional context-tools registration, its status handler with a captured UI callback, and separate local-package loading. Model calls: 0. This verifies loading/registration, not full TUI/provider sessions. Repeat with `node scripts/smoke-pi.mjs --sdk /path/to/@earendil-works/pi-coding-agent`; a preinstalled local SDK is required and the script downloads nothing. [Historical v2.2 results](verification/universal-v2.2.md).

For each selected client in a test project, check instruction and four-skill discovery; a first request reading the right file and running the expected test; context verification passing initially and failing after a source change; and handoff preserving the precise next task. For Pi also check status/warn, one-time full-read, consent revocation, and the chosen provider. Missing authentication means unverified, not success.
