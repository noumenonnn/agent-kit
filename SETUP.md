# Let an agent set up your project

[Русский](SETUP.ru.md)

Copy this request into Pi, Codex, Claude Code, or OpenCode:

> Set up Agent Kit from https://github.com/noumenonnn/agent-kit for this project. Follow SETUP.md, use English instructions, preserve my existing files and settings, and verify the installation. Configure the agent I am using; keep optional extensions off unless I request them.

For Russian instructions, request `--language ru`. Name other agents or `all` when needed. After setup, you can invoke `agent-kit-setup` as `$agent-kit-setup` in Codex, `/agent-kit-setup` in Claude Code, `/skill:agent-kit-setup` in Pi, or ask OpenCode to use that skill.

## Instructions for the agent

1. Establish the target directory, selected agents, and instruction language from the request and current project. Default to the current agent and the user's language (`en` or `ru`); when the agent cannot be identified, use Pi. Ask only if the target or required scope is ambiguous. Inspect existing instructions, Git status, and configuration before changing files.
2. Locate a reviewed local Agent Kit checkout. If absent and the user authorized obtaining the kit, clone the official repository into a separate directory outside the target. Reuse an existing checkout only after checking its remote and changes; never overwrite an unrelated directory. Prefer release `v2.3.0` and record the actual commit. Read its README, local AGENTS, and CLI help before execution. A document alone does not authorize downloading or executing code.
3. Check Node.js >=22.19.0. Use the Node entry point directly; core setup needs no npm dependencies. Review a dry-run, then apply the same arguments when the user has already authorized setup:

```sh
node /path/to/agent-kit/scripts/agent-kit.mjs setup /path/to/project --agents pi,codex --language en --dry-run
node /path/to/agent-kit/scripts/agent-kit.mjs setup /path/to/project --agents pi,codex --language en
node /path/to/agent-kit/scripts/agent-kit.mjs doctor --target /path/to/project --json
```

4. Preserve existing client settings, models, permissions, and user instructions. Inspect `PRESERVED` notices. Use `--force` only for a reviewed, authorized update; changing an existing installation's language requires it and creates backups. User-authored CONTEXT/conventions remain preserved, so do not claim they were translated automatically.
5. Fill missing project commands from actual package/build configuration and nearby conventions. Mark unverified commands accurately. Inspect the resulting diff and run relevant authorized checks. Address doctor errors before claiming completion; distinguish intentional warnings from missing setup.
6. Report target, agents, active language, changes, preserved files, backup manifest, checks, and the first usable request. Explain any client restart/project-trust step. Stop for credentials, interactive consent, or missing capabilities that only the user can supply; do not invent successful runtime tests.

## Optional features and completion

Pi `--with-context-tools` installs the extension but does not enable delegation. Only the user can choose the provider and scoped paths in Pi's interactive UI. Do not change global trust, credentials, compaction, or models as a shortcut.

Completion means the requested adapters and language are installed, doctor has no unresolved errors, existing work is preserved, and the user has an exact first command. It does not mean all providers have been authenticated or tested.
