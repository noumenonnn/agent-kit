# Legacy Pi commands

[Русский](PI-LEGACY.ru.md)

The v2.1 interface remains available. Prefer `setup` for new projects; its merging is safer than `init --force`. Versions and results below belong to the original guide.

Since v2.3, `global` and `init` also accept `--language en|ru` for bundled instructions. Add `--language ru` to install Russian resources. Imported Matt skills keep the reviewed upstream content; the installer does not translate third-party code or instructions.

## New in v2.1

- Optional context guard: requested-read byte budgets, warn/enforce modes, one-time exact full-read permission.
- Bulk-reader: one tool-less Pi model call after interactive model/path consent. Paths, lines, quotes, and source freshness are checked; this is not a semantic verifier.
- Worker usage receipts and three-variant evaluation: unknown costs remain unknown; the validator prevents adding worker again to Pi total.

The module **is not installed by init or enabled automatically**. Core still works independently, with unchanged permanent AGENTS context. No Portal/AiKA or code-writer. This independently implements Spotify shunt ideas without copying its code.

```bash
node scripts/kit.mjs context-tools --target /path/to/project --dry-run
node scripts/kit.mjs context-tools --target /path/to/project
```

Then in trusted interactive Pi: `/reload` → `/context-tools status` → `/context-tools enable`. Enablement requires provider/model and allowed-path confirmation. Default guard only warns, with no model dispatch. v2 migration does not need `init --force`.

Details including Windows, limits, and disabling: [CONTEXT-TOOLS.md](CONTEXT-TOOLS.md). Original checks were offline; real Pi/provider integration and native Windows/macOS require smoke tests. No savings percentage is claimed.

## Previous Pi quick start

Requirements: Node.js **≥22.19.0**, Git; ripgrep is useful. Recommended Pi **0.85.1**, official release of 5 September 2026. Settings compatibility was checked against documentation; executed-test limits are in [AUDIT.md](AUDIT.md).

Install Pi separately if needed, deliberately authorizing network installation:

```bash
npm install -g --ignore-scripts @earendil-works/pi-coding-agent@0.85.1
pi --version
```

From the unpacked kit, in Bash or PowerShell:

```bash
node scripts/check-kit.mjs
node --test
node scripts/kit.mjs global --dry-run
node scripts/kit.mjs global
node scripts/kit.mjs init --target /path/to/your-repository --dry-run
node scripts/kit.mjs init --target /path/to/your-repository
node scripts/doctor.mjs --project /path/to/your-repository
```

On Windows use paths such as `"C:/work/my project"`. The target must be **outside the kit directory**. Thin .sh/.ps1 wrappers remain; Node contains shared logic.

Fill test/typecheck/build commands in `.agent/references/conventions.md` and clarify CONTEXT.md. Open Pi at project root, review proposed resources before trusting, and `/login` if necessary. Restart after changing `/trust`; `/reload` rereads already available resources.

```text
/efficient-task Add validation X; acceptance: test Y passes
```

## Installation preserving your work

- Global runs no Pi/npm/npx and installs no extensions. It respects `PI_CODING_AGENT_DIR`; `--pi-home DIR` wins.
- Existing files and entire same-name skill directories stay by default.
- Force updates kit files with backups without removing extra files. Project AGENTS.md is replaced entirely by `init --force`; merge personal rules manually.
- Global AGENTS updates only its marked block, preserving surrounding text. Without force an old block remains.
- Existing settings.json changes **only with --apply-settings**. Deep merge preserves unknown fields but explicitly sets five template preferences: thinking, cache notices, project trust, skill commands, compaction. Review the template first.
- Log/handoff/backup ignore rules are added to the real .gitignore without erasing content. Already tracked files stay tracked.
- Paths are checked before writing. Target symlinks/junctions are rejected. This is local installation protection, not defense against hostile concurrent filesystem changes.
- Dry-run creates nothing, including the target. Real changes record SHA-256 and original bytes under `.pi-starter-backups/`.

Restore using the printed manifest:

```bash
node scripts/kit.mjs restore --target /path/to/repo --manifest /path/to/repo/.pi-starter-backups/RUN/manifest.json --dry-run
node scripts/kit.mjs restore --target /path/to/repo --manifest /path/to/repo/.pi-starter-backups/RUN/manifest.json
```

Restore refuses later-edited files. After an interrupted install, first ensure the process stopped, then inspect remaining lock/manifest; do not delete a live process's lock. Empty directories and backups remain.

## Core and agenticoding are different modes

| | Core default | Optional agenticoding |
| --- | --- | --- |
| Auto-compaction | Enabled | Explicitly disabled after testing handoff |
| Model selection | Manual /model | model-group in templates |
| Spawn / notebook / handoff | Not promised | Through extension |
| readonly / thinking metadata | No behavior guarantee | Extension interprets it |
| OS isolation | No | Not guaranteed either |

The extension is **optional**. To retain the original scenario:

1. Review source/README for `pi-agenticoding@0.5.0`, then separately `pi install npm:pi-agenticoding@0.5.0`.
2. Restart Pi; test `/model-groups`, `/readonly`, `/handoff` in a test repository before disabling compaction.
3. Create roles from [MODEL-ROUTING.md](MODEL-ROUTING.md), initially one model each.
4. Explicitly apply the profile:

```bash
node scripts/kit.mjs global --profile agenticoding --ack-agenticoding --apply-settings --dry-run
node scripts/kit.mjs global --profile agenticoding --ack-agenticoding --apply-settings
```

The installer requires the exact enabled extension declaration in global settings. That validates a declaration, **not runtime operation**. If installed only at project scope, global profile intentionally stays unchanged; manually configure local compaction for that project after smoke testing.

Restore core defaults with `node scripts/kit.mjs global --profile core --apply-settings`. This does not uninstall the extension; use Pi's own controls for that.

## Workflows

- Small clear task: `/efficient-task` → change, checks, report in one context.
- Unfamiliar code: `/efficient-discover` → `/efficient-build` → `/efficient-verify`.
- Significant risk: additional `/efficient-review`; independence requires separate context, not just another model.
- Architecture question: `/efficient-architecture`, without automatic project rewrite.
- Handoff: `/portable-handoff [path]` writes a short document, default `.agent/handoffs/latest.md`, without resetting the session.

Avoid invoking every template by habit. Extension handoff and core compact are not required after every step. Handoff creates a new prefix and may lose cache benefits.

Pi skills use **/skill:name**, such as `/skill:tdd`. Files under `.pi/prompts/` are templates invoked as `/efficient-task`, without skill:. See [Matt integration](MATT-POCOCK-INTEGRATION.md).

## Compact, honest logs

From the project:

```bash
node .agent/scripts/compact-run.mjs --timeout-ms 120000 -- pnpm test
node .agent/scripts/compact-run.mjs --timeout-ms 300000 -- npm run build
node .agent/scripts/diff-summary.mjs
node .agent/scripts/diff-summary.mjs --base origin/main --no-log
```

On Windows, run npm/pnpm .cmd through an **explicit** shell or JS entry point:

```powershell
node .agent/scripts/compact-run.mjs --timeout-ms 120000 -- powershell.exe -NoProfile -NonInteractive -Command "pnpm test"
```

The wrapper does not add a shell. Never interpolate unreviewed text into an explicit shell string.

compact-run properties:

- Streamed recording, bounded excerpt memory; stdout/stderr follow received event order without promising absolute cross-stream ordering.
- Defaults: ≤8192 response bytes, ≤64 MiB raw log, 120 seconds. Flags: --max-output-bytes, --max-log-bytes, --timeout-ms; capped logs are explicitly marked.
- Unique `.agent/tmp/run-…/` with output.log and result.json; command arguments deliberately not printed.
- Process exit retained; timeout 124, logging error 125, launch 126/127, signals 128+number.
- POSIX group termination with escalation; Windows best-effort taskkill /T /F. Detached background processes are not guaranteed controlled. Avoid servers/interactive installers.
- OK means exit 0, **not task PASS**. Inspect test discovery, assertions, changed-behavior coverage, and acceptance criteria.

diff-summary includes untracked/staged/unstaged; --base REF adds committed changes from merge-base. NUL-delimited filenames are supported. Full JSON is written unless --no-log. Conflicts return nonzero. Categories may overlap; rename counts as one entry. Submodules are not recursively expanded.

## Security and limits

**Trust ≠ sandbox.** Pi loads AGENTS regardless of project trust unless context loading is disabled. Extension readonly is a guardrail; Windows uses a command classifier. Untrusted code needs OS/container/VM limits and minimal secrets/network access.

Spawn isolates **context, not working trees**. Use one writer per shared cwd; real parallel development needs separate worktrees/branches and serial integration. Checks can also write caches/snapshots.

Raw logs/backups may contain secrets. Gitignore and POSIX 0600 are not encryption. Do not upload whole logs into chat. No comprehensive automatic secret redaction is provided.

## Further reading

- [v2.1 audit](AUDIT.md): findings, fixes, actual checks.
- [Migration](MIGRATION.md): transition from v2/original.
- [Context tools](CONTEXT-TOOLS.md): opt-in guard, bulk-reader, consent, costs.
- [v2 audit](AUDIT-V2.md) and verification/v2-baseline/: separately labelled history.
- [Model routing](MODEL-ROUTING.md): roles, extension limits, cache.
- [Matt skills](MATT-POCOCK-INTEGRATION.md): selected copying from reviewed commits.
- [Checklist](TOKEN-BUDGET-CHECKLIST.md), [evaluation](EVALUATION.md): economics without invented percentages.
- [Sources](SOURCES.md), versions.json: primary evidence and versions.

CI checks Node 22.19/24 on Linux, Windows, macOS with immutable action pins and read-only repository permissions. Configuration **does not establish execution**; actual checks belong in dated reports.
