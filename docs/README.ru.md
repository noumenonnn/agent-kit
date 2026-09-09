# Документация Agent Kit

[English](README.md)

Начните с [обзора](../README.ru.md); для настройки агентом дайте ему [SETUP.ru.md](../SETUP.ru.md). Подробная установка, обновление и откат — [универсальное руководство](../UNIVERSAL-RU.md).

Все встроенные Markdown-инструкции имеют обе версии. Выберите язык через `setup --language en|ru`; активна только одна версия, справочные переводы не удваивают загружаемый контекст. Существующие документы пользователя и сторонние навыки не переписываются. Машинные ключи, имена команд и исторические JSON/TAP-свидетельства не переводятся. CLI и расширение могут выводить английские диагностические сообщения; значения и действия описаны в обеих версиях руководств. Английская MIT LICENSE определяет условия; русский перевод справочный.

Для разработчиков: обновляйте пару вместе, проверяйте смысл, затем `npm run docs:write` и `npm run docs:check`. Каталог и хеши выявляют пропущенные файлы и непроверенные изменения, но не доказывают качество перевода.

| Документ | English | Русский |
| --- | --- | --- |
| AGENTS.md | [English](../AGENTS.md) | [Русский](../AGENTS.ru.md) |
| README.md | [English](../README.md) | [Русский](../README.ru.md) |
| SETUP.md | [English](../SETUP.md) | [Русский](../SETUP.ru.md) |
| CONTRIBUTING.md | [English](../CONTRIBUTING.md) | [Русский](../CONTRIBUTING.ru.md) |
| CHANGELOG.md | [English](../CHANGELOG.md) | [Русский](../CHANGELOG.ru.md) |
| SECURITY.md | [English](../SECURITY.md) | [Русский](../SECURITY.ru.md) |
| SOURCES.md | [English](../SOURCES.md) | [Русский](../SOURCES.ru.md) |
| EVALUATION.md | [English](../EVALUATION.md) | [Русский](../EVALUATION.ru.md) |
| MODEL-ROUTING.md | [English](../MODEL-ROUTING.md) | [Русский](../MODEL-ROUTING.ru.md) |
| MATT-POCOCK-INTEGRATION.md | [English](../MATT-POCOCK-INTEGRATION.md) | [Русский](../MATT-POCOCK-INTEGRATION.ru.md) |
| TOKEN-BUDGET-CHECKLIST.md | [English](../TOKEN-BUDGET-CHECKLIST.md) | [Русский](../TOKEN-BUDGET-CHECKLIST.ru.md) |
| PI-LEGACY.md | [English](../PI-LEGACY.md) | [Русский](../PI-LEGACY.ru.md) |
| AUDIT.md | [English](../AUDIT.md) | [Русский](../AUDIT-RU.md) |
| AUDIT-V2.md | [English](../AUDIT-V2.md) | [Русский](../AUDIT-V2-RU.md) |
| MIGRATION.md | [English](../MIGRATION.md) | [Русский](../MIGRATION-RU.md) |
| UNIVERSAL.md | [English](../UNIVERSAL.md) | [Русский](../UNIVERSAL-RU.md) |
| RESEARCH-UNIVERSAL.md | [English](../RESEARCH-UNIVERSAL.md) | [Русский](../RESEARCH-UNIVERSAL-RU.md) |
| CONTEXT-TOOLS.md | [English](../CONTEXT-TOOLS.md) | [Русский](../CONTEXT-TOOLS-RU.md) |
| LICENSE | [English](../LICENSE) | [Русский](../LICENSE.ru.md) |
| .github/PULL_REQUEST_TEMPLATE.md | [English](../.github/PULL_REQUEST_TEMPLATE.md) | [Русский](../.github/PULL_REQUEST_TEMPLATE.ru.md) |
| .github/ISSUE_TEMPLATE/bug_report.md | [English](../.github/ISSUE_TEMPLATE/bug_report.md) | [Русский](../.github/ISSUE_TEMPLATE/bug_report.ru.md) |
| .github/ISSUE_TEMPLATE/feature_request.md | [English](../.github/ISSUE_TEMPLATE/feature_request.md) | [Русский](../.github/ISSUE_TEMPLATE/feature_request.ru.md) |
| verification/README.md | [English](../verification/README.md) | [Русский](../verification/README.ru.md) |
| verification/universal-v2.2.md | [English](../verification/universal-v2.2.md) | [Русский](../verification/universal-v2.2.ru.md) |
| portable/instructions.md | [English](../portable/instructions.md) | [Русский](../locales/ru/portable/instructions.md) |
| portable/skills/agent-kit-setup/SKILL.md | [English](../portable/skills/agent-kit-setup/SKILL.md) | [Русский](../locales/ru/portable/skills/agent-kit-setup/SKILL.md) |
| portable/skills/efficient-context/SKILL.md | [English](../portable/skills/efficient-context/SKILL.md) | [Русский](../locales/ru/portable/skills/efficient-context/SKILL.md) |
| portable/skills/efficient-handoff/SKILL.md | [English](../portable/skills/efficient-handoff/SKILL.md) | [Русский](../locales/ru/portable/skills/efficient-handoff/SKILL.md) |
| portable/skills/efficient-task/SKILL.md | [English](../portable/skills/efficient-task/SKILL.md) | [Русский](../locales/ru/portable/skills/efficient-task/SKILL.md) |
| portable/workflow.md | [English](../portable/workflow.md) | [Русский](../locales/ru/portable/workflow.md) |
| global/AGENTS.fragment.md | [English](../global/AGENTS.fragment.md) | [Русский](../locales/ru/global/AGENTS.fragment.md) |
| global/skills/compact-tool-output/SKILL.md | [English](../global/skills/compact-tool-output/SKILL.md) | [Русский](../locales/ru/global/skills/compact-tool-output/SKILL.md) |
| global/skills/context-efficiency/SKILL.md | [English](../global/skills/context-efficiency/SKILL.md) | [Русский](../locales/ru/global/skills/context-efficiency/SKILL.md) |
| global/skills/dependency-change-safety/SKILL.md | [English](../global/skills/dependency-change-safety/SKILL.md) | [Русский](../locales/ru/global/skills/dependency-change-safety/SKILL.md) |
| global/skills/deterministic-bulk-work/SKILL.md | [English](../global/skills/deterministic-bulk-work/SKILL.md) | [Русский](../locales/ru/global/skills/deterministic-bulk-work/SKILL.md) |
| global/skills/repository-exploration/SKILL.md | [English](../global/skills/repository-exploration/SKILL.md) | [Русский](../locales/ru/global/skills/repository-exploration/SKILL.md) |
| global/skills/verification-evidence/SKILL.md | [English](../global/skills/verification-evidence/SKILL.md) | [Русский](../locales/ru/global/skills/verification-evidence/SKILL.md) |
| project-template/.agent/references/architecture.md | [English](../project-template/.agent/references/architecture.md) | [Русский](../locales/ru/project-template/.agent/references/architecture.md) |
| project-template/.agent/references/conventions.md | [English](../project-template/.agent/references/conventions.md) | [Русский](../locales/ru/project-template/.agent/references/conventions.md) |
| project-template/.agent/references/safety.md | [English](../project-template/.agent/references/safety.md) | [Русский](../locales/ru/project-template/.agent/references/safety.md) |
| project-template/.pi/prompts/efficient-architecture.md | [English](../project-template/.pi/prompts/efficient-architecture.md) | [Русский](../locales/ru/project-template/.pi/prompts/efficient-architecture.md) |
| project-template/.pi/prompts/efficient-build.md | [English](../project-template/.pi/prompts/efficient-build.md) | [Русский](../locales/ru/project-template/.pi/prompts/efficient-build.md) |
| project-template/.pi/prompts/efficient-discover.md | [English](../project-template/.pi/prompts/efficient-discover.md) | [Русский](../locales/ru/project-template/.pi/prompts/efficient-discover.md) |
| project-template/.pi/prompts/efficient-review.md | [English](../project-template/.pi/prompts/efficient-review.md) | [Русский](../locales/ru/project-template/.pi/prompts/efficient-review.md) |
| project-template/.pi/prompts/efficient-task.md | [English](../project-template/.pi/prompts/efficient-task.md) | [Русский](../locales/ru/project-template/.pi/prompts/efficient-task.md) |
| project-template/.pi/prompts/efficient-verify.md | [English](../project-template/.pi/prompts/efficient-verify.md) | [Русский](../locales/ru/project-template/.pi/prompts/efficient-verify.md) |
| project-template/.pi/prompts/portable-handoff.md | [English](../project-template/.pi/prompts/portable-handoff.md) | [Русский](../locales/ru/project-template/.pi/prompts/portable-handoff.md) |
| project-template/AGENTS.md | [English](../project-template/AGENTS.md) | [Русский](../locales/ru/project-template/AGENTS.md) |
| project-template/CONTEXT.md | [English](../project-template/CONTEXT.md) | [Русский](../locales/ru/project-template/CONTEXT.md) |
| project-template/docs/adr/0000-template.md | [English](../project-template/docs/adr/0000-template.md) | [Русский](../locales/ru/project-template/docs/adr/0000-template.md) |
| verification/universal-v2.3.md | [English](../verification/universal-v2.3.md) | [Русский](../verification/universal-v2.3.ru.md) |
