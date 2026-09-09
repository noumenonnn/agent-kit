# Upgrade v2 → v2.1

[Русский](MIGRATION-RU.md)

Unpack v2.1 separately. The optional module does not require replacing AGENTS, skills, CONTEXT, settings, or prompts:

```bash
node scripts/kit.mjs context-tools --target /path/to/project --dry-run
node scripts/kit.mjs context-tools --target /path/to/project
```

These Node commands work on Windows. Stop active Pi during extension file updates, review the diff, then restart trusted Pi. With trust already confirmed and no concurrent updates, `/reload` rereads resources. Run `/context-tools status`; source transmission separately requires `/context-tools enable` and interactive model/path selection.

Repeated installation preserves files. To update installed module code, preview `context-tools --force`: it creates backups without changing core. Existing `.pi/context-tools.json` remains even with force. Budget changes need `/reload` and renewed consent. Restore this installation's manifest using README instructions.

Core v2 and previous workflows remain available without the module. Avoid `init --force` solely for the bulk-reader. v2.1 has no code-writer. Smoke requirements and limits: [CONTEXT-TOOLS.md](CONTEXT-TOOLS.md).

---

# Original starter migration (v1 → core v2)

Avoid blind updates over working changes. Stop Pi sessions, save the current diff/backup, and unpack v2.1 separately.

## 1. Global files

```bash
node scripts/kit.mjs global --force --apply-settings --dry-run
```

`--force` updates six skill files and the managed global AGENTS block with backups. Additional skill files stay. `--apply-settings` changes only template fields and deeply preserves others, but changes preferences: inspect them. Without it, settings remain, including old `compaction.enabled=false`.

After review, apply without dry-run. If agenticoding is needed, follow explicit installation/smoke checks in [the legacy guide](PI-LEGACY.md), then apply its profile; do not disable compaction by habit.

## 2. Project

```bash
node scripts/kit.mjs init --target /path/to/repo --force --dry-run
```

Prefer manual merging if you edited project AGENTS, CONTEXT, conventions, ADRs, or templates: force replaces entire kit files while backing up originals. **Without force, existing old scripts/templates stay old.**

Review diff, apply the desired option, and run project doctor. Temporary-file rules enter the real `.gitignore`. Ignore does not remove already committed logs from history/index; separately consider untracking and rotating exposed secrets.

## 3. Behavior changes

- Core needs no extension and retains auto-compaction.
- Small tasks use `/efficient-task` rather than four mandatory phases.
- `/skill:tdd` and `/skill:code-review` are correct Pi skill names.
- Verify is no longer read-only: tests/builds may create artifacts, without autofix/snapshot updates.
- Output is byte-bounded, logs streamed, commands have timeouts.
- Windows has no implicit shell; npm/pnpm `.cmd` needs an explicit shell.
- Temporary handoff defaults to `.agent/handoffs/`.
- Matt installs from a reviewed local commit, without floating `npx skills@latest`.
- No automatic proof of safety, savings, or all-model compatibility.

## 4. Post-update checks

In the kit: `node scripts/check-kit.mjs`, `node --test`. In your project: doctor, `/reload` after allowed resource reload, and a small task with a known test. Separately check model roles, readonly → build → verify, and handoff when using the extension.

For problems use the backup manifest and restore from README. Later user changes block automatic overwrite; resolve conflicts manually.
