# Pi Starter Kit audit and improvements

[Русский](AUDIT-V2-RU.md)

**Date:** 6 September 2026. **Result:** version 2.0.0, ready for local installation after reviewing changes.

## Findings

The starter's core ideas are sound: short AGENTS, search before reading, on-demand skills, deterministic verification, external logs, and economical strong-model use. A heavyweight multi-agent framework is unnecessary.

The main issues concerned installation safety, output bounds, verification correctness, and hidden extension dependence. They were fixed in code, not merely documented.

## Substantial fixes

| Priority | Before | After |
| --- | --- | --- |
| High | Global installer removed existing skill directories via rm -rf / Remove-Item | Preserve by default; force requires byte-exact backups; additional files stay |
| High | Compaction disabled even with SkipAgenticoding | Core retains auto-compaction; alternative profile needs explicit acknowledgment and exact extension declaration |
| High | Implicit Windows shell changed argument meaning and interpreted metacharacters | No built-in shell; .cmd tools require explicitly selected shell/JS entry point |
| Medium | compact-run buffered all stdout/stderr and limited only lines | Streamed logs, bounded excerpts/line lengths/response bytes, log cap and incomplete marker |
| Medium | No timeout/reliable signal status; process.exit could truncate stdout | Deadline, POSIX process-group termination, best-effort Windows taskkill, actual exit codes via exitCode |
| Medium | init-project.sh changed cwd before resolving relative targets; position-sensitive --force | Shared Node installer, early path resolution, explicit argument parsing, dry-run |
| Medium | .gitignore was an inactive snippet | Additive real .gitignore merge for logs, handoffs, and backups |
| Medium | CHANGED FILES missed untracked files; line-based filename parsing | NUL-safe staged/unstaged/untracked/conflict parsing, merge-base review, bounded output and full JSON |
| Medium | Verify called read-only despite artifact-writing tests/builds | Explicit readonly:false for task/build/verify; no unapproved autofix/snapshot updates |
| Medium | Extension metadata confused with core Pi templates | Explicit limits: no automatic routing/enforcement without extension; core works independently |
| Medium | Skill docs used /tdd and claimed unavoidable handoff collision | Canonical /skill:tdd and /skill:handoff differ from extension /handoff |
| Medium | npx skills@latest --yes executed moving installer/source | Optional offline Git-blob copying from a full selected commit, including license/provenance |
| Medium | Spawn confused with file isolation; trust/readonly with sandbox | One writer per cwd, separate worktrees for parallel edits, explicit security limits |
| Improvement | Input tokens/completed task undercounted quality/cache effects | Cost/time per accepted task with acceptance/regression gates; children, retries, review, cache, intervention included |
| Improvement | Simple changes required phase/model chains | One /efficient-task default; extra phases based on complexity/risk |
| Improvement | No automated kit infrastructure checks | Node regression suite, static checker, doctor, CI matrix with immutable action pins |

## Practice alignment

- **Version boundaries rather than latest commands:** Pi 0.85.1 from the official 5 September release, Node ≥22.19.0. Optional pi-agenticoding stays at package-README-reviewed 0.5.0 rather than an unjustified upgrade.
- **Progressive disclosure and stable prefixes:** permanent policy reduced from **2815 to 2407 UTF-8 bytes**. These are not model tokens or proven monetary savings. Reports, tests, and detailed safety rules remain cold files.
- **Quality before savings:** preserve important diagnostics; exit 0 does not prove test coverage. No invented savings percentage.
- **Justified orchestration:** use a subagent for bounded work/context isolation, not one grep. Handoff loses the old cache prefix; model groups are not ordered failover.
- **Reproducibility and reversibility:** exact versions/commits, backups, SHA-256 manifests, restore refusing later user edits.
- **Real trust boundaries:** untrusted repositories/extensions need containers, VMs, or restricted accounts, not prompt-only protection.

## Executed checks

Environment: **Linux, v24.14.1**. These test kit infrastructure, not future user projects.

- `node --test --test-reporter=tap`: **40/40 PASS**, 0 FAIL/skipped.
- `node scripts/check-kit.mjs`: PASS for JS syntax, JSON, frontmatter, explicit readonly, profiles, and permanent-instruction budget.
- `bash -n scripts/*.sh`: all three wrappers checked individually; Bash wrapper executed in a test.
- Regressions: repeated installs, user skills/settings, deep merge, backups/restore, later-edit rejection, malformed markers, symlink escape, install lock, no floating ref, Git blobs without execution, UTF-8/ANSI, giant-line output, real exit codes, timeout/SIGINT/children, staged/unstaged/untracked, rename, merge-base/conflicts, spaced paths, static doctor.

Original defects were separately reproduced: deleted custom skill file, compaction disabled without extension, untracked with CHANGED FILES (0), inactive gitignore, and excessive giant-line output. For the same 200,000-character input, v2 returned **1055 summary bytes** and retained its log. This checks the limiter, not model cost.

Raw records: `verification/test-output.tap`, `verification/RESULTS.json`, `verification/original-regressions.json`, `verification/static-checks.json` (historical paths; v2 records now reside in `verification/v2-baseline/`).

## Unverified boundaries and reasons

- The sandbox lacked Pi and direct terminal npm/GitHub network access. Live provider authentication, model routing, extension loading, readonly transitions, and handoff **were not run**. Primary-source contracts are not runtime verification.
- **Windows/PowerShell and macOS were not run.** Wrappers share Node code; CI was prepared but unexecuted. Windows termination is best-effort; symlinks may need privileges.
- Upstream Matt skills/programs were not executed; end-to-end compatibility of each Pi workflow is not claimed. Installer tests use local Git fixtures without external execution.
- No savings measured on actual user tasks/models. [EVALUATION.md](EVALUATION.md) gives the protocol.
- No full adversarial security audit. Local guards/locks do not stop hostile filesystem races; raw logs/backups are unencrypted and may hold secrets.

## Next step

Start with core, inspect dry-run, and fill actual project commands. Run one small task with a known test. Then separately test agenticoding if needed and add only necessary Matt skills. For v1 migration use [MIGRATION.md](MIGRATION.md): preserved old files require deliberate updating/merging, not an assumption that they were automatically fixed.

Full documentation: README; sources and verification boundaries: SOURCES. The historical distribution included `CHANGES.patch` and hashes for inspection before installation.
