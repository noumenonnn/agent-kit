# v2.1 audit — 8 September 2026

[Русский](AUDIT-RU.md)

## Delivery

Optional context-tools v0.1: byte-based pre-read of the requested range, UI warn/enforce, one-time full read, tool-less bulk-reader through the Pi model registry, explicit session consent for model/paths, bounded input/output, quote/line/hash validation, cancellation/timeouts, and worker receipts. Added full-read / targeted-read / delegated accounting validation without double-counted costs.

Install: `node scripts/kit.mjs context-tools --target PROJECT`. Defaults to warn; model transmission stays disabled until interactive consent. Core is independent. Code-writer/Portal/AiKA are not included.

## Actually verified

- **85/85 tests**, 0 failures, skips, or cancellations: 40 existing core regressions and 45 new checks.
- Linux, Node v24.14.1, Git 2.49.0; exact command `node --test --test-reporter=tap`.
- 27 global/project-template/profiles files byte-identical to v2. Permanent AGENTS budget: 2407 UTF-8 bytes; optional tool metadata has its own overhead.
- MJS/TS syntax, JSON, skill/prompt metadata, and opt-in defaults: `verification/static-checks.json`.
- Consent/revocation, session change during confirmation, frozen budgets, model recheck before dispatch, excluded paths, binary/UTF-8, bounded ranges and giant lines, invalid citations/quotes, stale sources, absence of tools/history, one worker, timeout/abort, usage retained on rejection, unknown costs, artifact failures, installation/config preservation/restore.
- Evaluation validator tested with synthetic numbers. Unknown costs remain `null` and missing verdicts remain missing; this is not a benchmark.
- Bash-wrapper syntax checked. GitHub CI matrix was not run here.

Full TAP and machine-readable results are in `verification/`. v2 history is **separate** in `AUDIT-V2-RU.md` and `verification/v2-baseline/`; it is not new evidence.

## Verification boundary

Pi CLI and TypeBox were absent from the audit environment. The adapter used mocked context/registry; TypeScript syntax was checked without full dependency typechecking. **No real Pi extension loading, native Windows/macOS, Node 22, or paid model calls were exercised.** First use requires the smoke procedure in [CONTEXT-TOOLS.md](CONTEXT-TOOLS.md); missing Pi capabilities block worker enablement.

Matching a quote to source does not prove its conclusion. Guard covers local read, not every shell/custom tool, and is not a security sandbox. Known credential paths are blocked; embedded secrets are not reliably detected. Check project/extension trust and scopes before transmission. Cancellation does not guarantee no charge has already accrued.

Cost is Pi's catalog estimate, not an invoice. Received usage is included in the tool result; unknown costs cannot become zero. Do not add worker cost again to Pi session totals. Real accepted-task savings **have not been measured** and no percentage is claimed.

Available Spotify READMEs provided architectural inspiration. Hooks/scripts/evals could not be retrieved and were neither audited nor copied. Spotify's README percentages were not reproduced.

## Evidence inventory

- `CHANGES.patch`: differences from supplied v2, excluding the patch and FILE-HASHES themselves.
- `FILE-HASHES.json`: SHA-256 of other files; integrity, not a digital signature.
- `verification/CHANGED-FILES.json`: changes excluding generated hashes/patch and itself.
- `verification/RESULTS.json` and `test-output.tap`: actual offline run.

Use the archive and opt-in installer for ordinary updates; do not blindly apply the historical patch over personal AGENTS. Migrating from v2 does not require `init --force` or another global installation.
