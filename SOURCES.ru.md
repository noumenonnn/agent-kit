# Источники и граница проверки

[English](SOURCES.md)

Проверено **2026-09-06**. Предпочитайте первичную документацию и версионные артефакты заявлениям об универсальном превосходстве подхода.

## Pi

- [Релизы](https://pi.dev/news): Pi 0.85.1 от 2026-09-05.
- [Версионный пакет и runtime](https://github.com/earendil-works/pi/blob/v0.85.1/packages/coding-agent/package.json): @earendil-works/pi-coding-agent 0.85.1, Node >=22.19.0.
- [Настройки](https://pi.dev/docs/latest/settings): compaction по умолчанию, cache notices, project trust, приоритет настроек.
- [Навыки](https://pi.dev/docs/latest/skills): /skill:name, progressive disclosure, конфликты и disable-model-invocation.
- [Шаблоны](https://pi.dev/docs/latest/prompt-templates): /name, подсказки аргументов и `${1:-default}` / `${@:-default}`.
- [Использование](https://pi.dev/docs/latest/usage): поиск контекста, AGENTS.override, /reload, перезапуск после trust и явные allowlists инструментов.
- [Безопасность](https://pi.dev/docs/latest/security): доверие проекту не является sandbox; контекст загружается отдельно; недоверенной работе нужна изоляция ОС.

Страницы latest меняются и не являются неизменными снимками. Идентификатор пакета и runtime дополнительно сверены с тегом v0.85.1. Живое выполнение Pi/provider/extension было недоступно в среде того аудита.

## Опциональное расширение

- [Пакет pi-agenticoding](https://pi.dev/packages/pi-agenticoding): версия 0.5.0 от 2026-08-30, минимум Pi 0.84.1, выборка model-group, контекст/кэш, общий cwd, ограничения readonly и рекомендация compaction.
- [Исходный проект](https://github.com/agenticoding/pi-agenticoding).

Полученный GitHub README содержал более старое описание, ориентированное на ledger. Для поведения 0.5.0 аудит использует README пакета с указанной версией. Подробную версионную архитектуру получить не удалось; аудит исходного кода расширения и runtime-интеграции не заявляется.

## Опциональные инженерные навыки

- [Matt Pocock skills](https://github.com/mattpocock/skills): подход к установке, выбранные процессы, роли вызова пользователем/моделью; изучен README.
- [Vercel skills](https://github.com/vercel-labs/skills): пути Pi, локальные источники/копирование, управление обновлениями; установщик намеренно не использует плавающий CLI.
- [Agent Skills specification](https://agentskills.io/specification): стандарт, на который ссылается Pi; локальные проверки реализуют нужное комплекту подмножество, а не полный YAML/spec-валидатор.

Ни один коммит Matt не объявлен целиком проверенным; локальная установка требует явный полный SHA. Git-объекты и SHA-256 receipts обеспечивают воспроизводимость, но не гарантируют доверенное происхождение или безопасные инструкции.

## Фиксация CI

- [checkout commit](https://github.com/actions/checkout/commit/de0fac2e4500dabe0009e67214ff5f5447ce83dd)
- [setup-node commit](https://github.com/actions/setup-node/commit/48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e)

На момент аудита страницы релизов указывали checkout v6.0.2 и setup-node v6.4.0; workflow фиксирует полные коммиты, а не изменяемые теги. Dependabot предлагает обновления для обычного ревью. Настроенная CI-матрица не является результатом выполнения.

## v2.1 — 2026-09-08

- [Spotify Portal AI Plugins](https://github.com/spotify/portal-ai-plugins): источник архитектурного вдохновения.
- [Shunt README](https://github.com/spotify/portal-ai-plugins/blob/main/plugins/shunt/README.md): маршрутизация перед чтением и одноразовые workers.
- [Версионные Pi extensions](https://github.com/earendil-works/pi/blob/v0.85.1/packages/coding-agent/docs/extensions.md): поиск, hooks, tools/commands и вложенный usage.
- [Текущие расширения](https://pi.dev/docs/latest/extensions): ModelRegistry streaming, режимы UI, lifecycle.
- [SDK](https://pi.dev/docs/latest/sdk): интерфейсы SDK и контекста.
- [Реестр моделей](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/model-registry.ts): реестр и регистрации провайдеров.

У Spotify прочитаны корневой и shunt README. Исходники hooks/scripts/skills/evals получить не удалось; их код не аудирован и не скопирован, benchmark-проценты авторов не воспроизведены. Модуль написан независимо. Текущая документация Pi может меняться: capability check есть, но воспроизведённая live-интеграция в этом аудите не заявлялась.
