# Sources and verification boundary

Checked on **2026-09-06**. Prefer primary documentation and versioned artifacts, not claims that an ecosystem pattern is universally best.

## Pi

- Release feed: https://pi.dev/news — Pi 0.85.1, released 2026-09-05.
- Versioned package/runtime requirement: https://github.com/earendil-works/pi/blob/v0.85.1/packages/coding-agent/package.json — @earendil-works/pi-coding-agent 0.85.1, Node >=22.19.0.
- Settings: https://pi.dev/docs/latest/settings — compaction default, cache notices, project trust, settings precedence.
- Skills: https://pi.dev/docs/latest/skills — `/skill:name`, progressive disclosure, collision behavior and `disable-model-invocation`.
- Prompt templates: https://pi.dev/docs/latest/prompt-templates — `/name`, argument hints and `${1:-default}` / `${@:-default}`.
- Usage: https://pi.dev/docs/latest/usage — context discovery, AGENTS.override, `/reload`, trust restart and explicit tool allowlists.
- Security: https://pi.dev/docs/latest/security — project trust is not a sandbox; context files are loaded separately; OS-level containment is required for untrusted work.

The `latest` pages are live documents, not immutable snapshots. Version-sensitive package identity/runtime requirements were also checked against tag v0.85.1. Live Pi/provider/extension execution was unavailable in the audit sandbox.

## Optional extension

- https://pi.dev/packages/pi-agenticoding — published package 0.5.0 (2026-08-30), minimum Pi 0.84.1, model-group sampling, context/cache behavior, shared cwd, readonly limitations and compaction recommendation.
- https://github.com/agenticoding/pi-agenticoding — upstream project.

The fetched GitHub README showed an older ledger-oriented description than the package page. For 0.5.0 behavior this audit uses the version-labelled package README. Detailed versioned architecture content could not be retrieved; no claim of source-level extension audit or runtime integration verification is made.

## Optional engineering skills

- https://github.com/mattpocock/skills — installation philosophy, selected workflow names, user/model invocation roles, README reviewed.
- https://github.com/vercel-labs/skills — Pi target paths, local-source/copy options and update ownership; our installer deliberately avoids a floating CLI.
- https://agentskills.io/specification — referenced by Pi as its skill standard; local checks implement the subset needed by bundled files, not a complete YAML/spec validator.

No Matt commit is advertised as reviewed wholesale; local installation requires your explicit full commit SHA. Git objects and SHA-256 installation receipts provide reproducibility, not a guarantee of trustworthy provenance or safe instructions.

## CI pins

- https://github.com/actions/checkout/commit/de0fac2e4500dabe0009e67214ff5f5447ce83dd
- https://github.com/actions/setup-node/commit/48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e

Latest release pages retrieved for this audit identify checkout v6.0.2 and setup-node v6.4.0; the workflow pins their full commits, not mutable tags. Dependabot is configured to propose updates; review them normally. A configured CI matrix is not an executed test result.


## v2.1 — 2026-09-08

- https://github.com/spotify/portal-ai-plugins — Portal plugins, источник архитектурного вдохновения.
- https://github.com/spotify/portal-ai-plugins/blob/main/plugins/shunt/README.md — доступный README о pre-read routing и one-shot workers.
- https://github.com/earendil-works/pi/blob/v0.85.1/packages/coding-agent/docs/extensions.md — версионная граница extension discovery, hooks, tools/commands и вложенного usage.
- https://pi.dev/docs/latest/extensions — текущие расширения, ModelRegistry streaming, режимы UI и lifecycle.
- https://pi.dev/docs/latest/sdk — интерфейсы SDK и контекста.
- https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/model-registry.ts — поведение реестра и провайдерных регистраций.

Spotify: прочитаны root/shunt README. Исходники отдельных hooks/scripts/skills/evals получить не удалось; их код не аудирован, не скопирован, заявленные авторами benchmark-проценты не воспроизведены. Модуль kit написан независимо. Текущая документация Pi может меняться: есть capability check, но нет заявления о воспроизведённой live-интеграции.
