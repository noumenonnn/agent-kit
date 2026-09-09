# Matt Pocock skills + Pi

[Русский](MATT-POCOCK-INTEGRATION.ru.md)

Keep Matt's reusable engineering discipline; do not duplicate it with a large second workflow framework. This kit's own skills cover context, safe deterministic execution and evidence.

## Correct Pi invocation

Pi registers skills as `/skill:name`:

```text
/skill:setup-matt-pocock-skills
/skill:tdd
/skill:diagnosing-bugs
/skill:code-review
```

Upstream README examples `/tdd` or `/grill-with-docs` may describe another harness or aliases. Pi prompt templates, unlike skills, do use bare `/name`.

**There is no inherent core-Pi command collision** between extension `/handoff` and Matt `/skill:handoff`. They have different semantics. The old kit excluded Matt's handoff on an overly broad collision assumption. It is optional in the deep preset; `portable-handoff` remains available without Matt. If you add third-party aliases yourself, re-check resolution.

## Install only reviewed, pinned local source

The old `npx skills@latest ... --yes` bootstrap is gone from our installer. It ran a floating CLI against a moving repository. The new script does not download or execute code; it reads regular Git blobs from an explicitly supplied full commit SHA.

Obtain the official checkout separately (this is a user-approved network operation), then inspect the selected revision:

```bash
git clone https://github.com/mattpocock/skills.git /path/to/matt-skills
git -C /path/to/matt-skills rev-parse HEAD
```

Review that commit's `LICENSE`, skill bodies and scripts. Then substitute the reviewed 40-character SHA, not `main`:

```bash
node scripts/kit.mjs matt --source /path/to/matt-skills --ref FULL_REVIEWED_COMMIT_SHA --target /path/to/repo --dry-run
node scripts/kit.mjs matt --source /path/to/matt-skills --ref FULL_REVIEWED_COMMIT_SHA --target /path/to/repo
```

No global commit is pre-claimed as reviewed by this audit: the upstream README was inspected, not every executable in the latest skill tree. `versions.json` deliberately records this as null. A local Git SHA fixes the copied content but does not itself prove its origin or safety.

- **lean (default):** setup, TDD, debugging, module design, code review, domain modeling, writing-for-agents — seven selected skills.
- **deep (`--preset deep`):** adds the requirement/spec/ticket/research/productivity workflows from the original integration, plus explicitly namespaced handoff. Use when those additional workflows are required, not merely because they exist.
- Source layout is validated; missing skills cause a clear failure before writes. No silent fallback to a different version.
- Existing skill directories are preserved unless `--force`; changes are backed up, additional user files are not deleted.
- Scripts/assets and LICENSE are copied without execution; provenance is recorded in `.pi/matt-pocock-source.json`, per-file hashes in the installation manifest.
- Working-tree modifications in the source checkout are not copied: only blobs from the specified commit.
- Do not also install the same names in `.agents/skills`, another harness directory or another plugin. Pi can discover several of these paths; name collisions keep one and warn.

Run `/skill:setup-matt-pocock-skills` **after reviewing it**, once per repository, to choose tracker/doc locations. That workflow can ask for or perform additional setup: installation alone does not authorize external publishing or credential use.

## Ownership of a phase

- Clear small change: `/efficient-task` plus only applicable reusable disciplines.
- Ambiguous requirements (deep installed): `/skill:grill-with-docs`, then build when intent is clear.
- Stable bug seam: `/skill:diagnosing-bugs` or `/skill:tdd`.
- Architecture boundary: `/skill:codebase-design`.
- Important review: one review owner, not `/skill:implement` followed mechanically by the whole lean chain again.

Cross-harness skill files can refer to tools or subagents unavailable in Pi. Adapt the method to available capabilities; do not invent missing tool calls or silently claim background/parallel work. Preserve `disable-model-invocation` from upstream. User-invoked orchestration should remain user-invoked rather than expanding every normal task into a framework.

## Updating

Fetch and review the new commit yourself, repeat dry-run with the new SHA and inspect the backup/diff. `npx skills update` belongs to installations managed by that CLI; it is not the update mechanism for this kit's local Git-blob copies. If you prefer the upstream CLI, use it separately with a reviewed version/source and track its lock/provenance; do not mix both ownership methods for the same skill names.
