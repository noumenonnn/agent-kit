# Contributing to Agent Kit

## Local development

Use Node.js 22.19 or newer. The core has no required npm dependencies or build step.

```sh
npm run check
npm test
```

Run targeted tests while working, then both commands before opening a pull request. Tests use Node's built-in runner and temporary fixtures. Keep client/provider smoke tests separate from offline checks; report skips and unavailable clients explicitly.

## Changes we can review

Keep each pull request focused on one problem. Describe the trigger, resulting behavior, and verification. Link an issue when relevant. Include terminal examples for CLI changes and screenshots for visual changes. Update the English overview, affected Russian guides, and changelog when behavior changes.

Use concise imperative commit subjects, for example `Preserve project rules during adapter updates`.

## Project invariants

- Keep Pi's existing commands, package resources, and optional extension compatible.
- Preserve offline setup, project settings, unrelated files, and reversible updates.
- Document native hooks separately from skill guidance.
- Keep permanent instructions small; load task-specific references on demand.
- Verify changed behavior, including failure paths and restore conflicts when relevant.
- Avoid dependencies for work the supported Node runtime handles directly.

Follow the layout and style in [AGENTS.md](AGENTS.md). New integrations need primary-source documentation for resource contracts and tests for generated artifacts.

## Release preparation

Update versions in `package.json` and `versions.json`, update `CHANGELOG.md`, run checks, and regenerate the inventory with `npm run integrity:write`. Verify it with `npm run integrity:check`. Build an archive using `npm pack --ignore-scripts`; this repository does not automatically publish to npm.

Report security-sensitive issues through [SECURITY.md](SECURITY.md), not a public issue containing credentials or private code.
