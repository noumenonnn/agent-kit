---
name: agent-kit-setup
description: Set up or update Agent Kit in a new or existing project when the user asks an agent to configure it.
---

# Agent-led setup

Use `.agent/references/setup.md` when present. Otherwise read `SETUP.md` or `SETUP.ru.md` in the reviewed Agent Kit checkout. Establish the target, agents and language from the request; ask only for required missing information.

Inspect existing work and preview `setup --target PATH --agents LIST --language en|ru --dry-run`. Apply the same selection within the user's authorization, preserving settings and unrelated files. Use the direct Node CLI; setup needs no package installation. Inspect doctor output and the final diff, fill project commands from actual configuration, then report verification and first-use instructions.

Use `--force` only for an authorized update after reviewing its backed-up changes. Keep optional Pi delegation disabled unless the user explicitly selects it in Pi. Obtaining the kit, credentials and native client trust follow the user's existing authorization; this skill grants none by itself. Do not claim full runtime compatibility from static checks.
