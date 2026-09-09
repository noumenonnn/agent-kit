# Universal scaffolding: integration research

[Русский](RESEARCH-UNIVERSAL-RU.md)

Checked 8 September 2026 against primary sources. This is architecture rationale, not a claim that every described capability is implemented or verified in live clients. The implemented matrix is in [UNIVERSAL.md](UNIVERSAL.md).

## Lessons from Portal and related projects

**Spotify Portal AI Plugins** combines shared skills with separate Claude Code, Codex, and Cursor manifests. Its main product serves Spotify's catalog through Portal CLI: setup, doctor, search, service information, and actions. It demonstrates predictable setup → check → use, but this project does not need a mandatory Portal dependency. [Portal repository](https://github.com/spotify/portal-ai-plugins).

**Shunt** is a separate Claude Code plugin. Hooks bound large reads, scripts call AiKA, and skills guide tool selection. Useful ideas include named arguments, separate worker calls, exact reads for editing, and separate transport checks. Its 350-line threshold and 82–94% results belong to specific scenarios, not universal savings estimates. Delegation requires Portal/AiKA and does not replace exact-code reading during debugging. [Shunt README](https://github.com/spotify/portal-ai-plugins/blob/main/plugins/shunt/README.md).

**Vercel Skills** offers local/Git installation, agent selection, project/global scope, list/update/remove, and copying instead of symlinks. Ordinary files with version receipts suit Windows and this installer's safety rules. A mandatory CLI dependency is unnecessary. [Vercel Skills](https://github.com/vercel-labs/skills).

**Anthropic Skills** demonstrates individual skills and skill groups packaged in a marketplace. A suitable common format is `SKILL.md` with name, concrete description, local scripts, and references. [Anthropic Skills](https://github.com/anthropics/skills).

## Confirmed client contracts

| Client | Portable layer | Native layer |
| --- | --- | --- |
| Pi | `.pi/skills/`, `.agents/skills/`; explicit `/skill:name` | package.json `pi.skills`, `pi.prompts`, `pi.extensions`; `.pi/extensions/*/index.ts` |
| Codex | `.agents/skills/<name>/SKILL.md`; explicit `$name` | AGENTS.md with nonempty AGENTS.override.md precedence; plugins are another distribution method |
| Claude Code | `.claude/skills/<name>/SKILL.md`; `/name` | `.claude-plugin/plugin.json`, skills/, hooks/hooks.json; `/plugin:name` |
| OpenCode | `.opencode/skills/`, `.agents/skills/`, `.claude/skills/` | `.opencode/plugins/*.js` or .ts; npm packages via config plugin |

Pi loads project skills after project trust. A local package uses `pi install /absolute/path/to/package -l`; manifest resource paths are package-relative. The package is not copied, so its directory must remain available. Skills/prompts do not require an extension. [Pi skills](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/skills.md), [Pi packages](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/packages.md).

Pi extensions receive `ExtensionAPI`: `tool_call` can block a call, `tool_result` change results, and `session_before_compact` customize compaction. Native commands, UI, state, and reload exist. Preserve full Pi support through its own adapter beyond common skill files. [Pi extensions](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md).

Claude Code supports local testing with `claude --plugin-dir ./plugin`. Components live alongside `.claude-plugin/`, not inside it. `PreToolUse` takes stdin JSON; denial uses `hookSpecificOutput.permissionDecision: "deny"`. No decision preserves normal permission checks. Installing skills alone does not install hooks. [Plugins](https://code.claude.com/docs/en/plugins), [skills](https://code.claude.com/docs/en/skills), [hooks](https://code.claude.com/docs/en/hooks).

OpenCode loads local JS/TS plugins at startup. A module exports a function returning handlers such as `tool.execute.before`. `experimental.session.compacting` exists but its experimental status requires compatibility checks. Root AGENTS.md is primary; CLAUDE.md is fallback. Avoid duplicate skill names across discovered directories. [Plugins](https://opencode.ai/docs/plugins/), [skills](https://opencode.ai/docs/skills/), [rules](https://opencode.ai/docs/rules/).

## Proposed architecture and UX

Codex discovers `.agents/skills` from cwd up to repository root. Project setup can use this without changing user config.toml. [OpenAI: Build skills](https://learn.chatgpt.com/docs/build-skills). Per directory, one instruction file is selected: AGENTS.override.md, then AGENTS.md. Managed-block installation must honor existing overrides. [OpenAI: AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md).

OpenCode v1.18.10 clarification: skills are keyed by name, later entries replace earlier ones with warnings, and loading is parallel; fixed `.agents` over `.claude` precedence is not guaranteed. Identical copies are equivalent; divergent copies need diagnostics. [Assignment](https://github.com/anomalyco/opencode/blob/v1.18.10/packages/opencode/src/skill/index.ts#L115-L129), [parallel loading](https://github.com/anomalyco/opencode/blob/v1.18.10/packages/opencode/src/skill/index.ts#L223-L226).

The following are conclusions for this repository:

1. **Shared offline core:** small permanent policy, on-demand skills, portable Node helpers, project references. Adapters create the exact client files. One source per skill, with installer-tracked copies/versions.
2. **One entry point:** setup for new/existing directories with client selection; preview shows created, preserved, and conflicting files. Repeated runs are idempotent. Follow application with doctor/status and a precise first command.
3. **Honest capability matrix:** distinguish skills, commands, runtime guard, and worker. Guidance is not guaranteed tool interception. Pi remains a complete mandatory adapter.
4. **No hidden configuration:** preserve user instructions/settings, update managed portions, provide backup/restore. Do not install providers, switch models, or launch the agent during scaffolding.
5. **Optional extensions:** portable workflows work after setup; native guard/worker are explicit. A refusal should explain read size and offer a useful next step: range, search, or one-time permission.

## Context optimization

Agent Skills standardizes progressive disclosure: metadata first, relevant instructions next, then separate resources. Use a small catalog of concrete skills; avoid moving every reference into permanent AGENTS. [Agent Skills](https://agentskills.io/home), [specification](https://agentskills.io/specification).

Context engineering includes just-in-time source retrieval, small unambiguous tools, structured notes, and long-session compaction. Context must be sufficient, not merely small. [Anthropic context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents).

For this project: search → line range → justified full file; bounded output with explicit truncation; full local logs; short handoff containing decisions/checks/next steps; path/line citations and source fingerprints to check worker freshness. A summary does not prove code correctness. Account for principal + worker cost, latency, and quality; distinguish unknown cost from zero. These measures need controlled comparisons before any savings percentage can be claimed.

## Evidence limits

Documentation and integration schemas were examined; third-party code was not copied. Main-branch docs change, so releases should record actual tested client versions. Offline installer/fixture tests establish file contracts; separate live smoke tests must cover discovery, first use, native hooks, Pi UI, and providers. Missing clients/authentication mean unverified, not successful full compatibility.
