# Context tools v0.1 — optional module for kit v2.1

[Русский](CONTEXT-TOOLS-RU.md)

This MVP is inspired by Spotify shunt's architecture, **not a port of its code**. It controls large `read` calls and provides a narrow `bulk_read` using your selected Pi model. Portal/AiKA, Bash/jq, and another agent framework are unnecessary. A code-writer is not included.

**Historical v2.1 verification:** local logic, installer, and adapter were checked offline with mocked Pi/model responses; TypeScript syntax was checked. Real Pi loading, paid providers, and native Windows/macOS were not run in that environment. First use belongs in a test repository. Core remains independent and compaction settings do not change. Later resource-loader evidence is recorded separately in [verification](verification/README.md).

## 1. Installation

Unpack the new archive **separately** from the old kit and working project. With core v2 already installed, no global AGENTS/skills reinstall or `init --force` is needed.

From the kit:

```bash
node scripts/check-kit.mjs
node --test
node scripts/kit.mjs context-tools --target /path/to/project --dry-run
node scripts/kit.mjs context-tools --target /path/to/project
```

Windows/PowerShell, substituting your project:

```powershell
$Kit = "$HOME\Tools\pi-token-efficient-starter-kit-v2.1"
$Project = "C:\work\my-project"
node "$Kit\scripts\kit.mjs" context-tools --target $Project --dry-run
node "$Kit\scripts\kit.mjs" context-tools --target $Project
Set-Location $Project
pi.cmd
```

Requirements: Node ≥22.19, Git, Pi. The recommended version boundary is Pi 0.85.1; code checks required model-registry dispatch capability. For a fresh Windows Pi install: `npm.cmd install -g --ignore-scripts @earendil-works/pi-coding-agent@0.85.1`. Node/npm.cmd/pi.cmd commands require neither administrator privileges nor ExecutionPolicy changes.

The installer is **offline**: it copies `.pi/extensions/pi-context-tools/index.ts`, three `lib/*.mjs` files, `.pi/context-tools.json`, and missing ignore rules. It runs no extension, npm, or model and transmits nothing. Do not install TypeBox separately; Pi's loader provides its import and extension types.

Review extension code before trusting the project. Use `/reload` in an already trusted project; restart Pi after changing trust. Installation does not grant trust.

## 2. First enablement

```text
/context-tools status
/context-tools enable
```

In an interactive terminal:

1. Select a provider and specific model from Pi's available authenticated models. `scopedModels`, if configured, is respected. Changing the main model does not automatically change the worker.
2. Enter a JSON array of actual paths, such as `["src","tests"]` or `["package.json"]`, relative to the project. The whole root, globs, and paths outside the project are forbidden.
3. Review project, endpoint origin, model, paths, and limits. Approve sending **selected source and question** to that provider. Check scopes for embedded secrets beforehand.

A minimal smoke test can allow one reviewed small file and ask Pi a concrete question through `bulk_read`. Small files are usually cheaper to read directly; this smoke test does not demonstrate savings.

If authentication is missing, use Pi `/login` and repeat selection. Module commands neither accept nor store keys. Missing Pi capability blocks enablement rather than falling back to another client/provider.

Consent is held only in session memory. `/reload`, a new session, switch/fork/tree/shutdown, and `/context-tools disable` revoke it. An unfinished confirmation cannot carry into a new session. Automatic enablement in print/json/RPC is unsupported. Editing `context-tools.json` cannot enable delegation.

## 3. Read control

| Command | Behavior |
| --- | --- |
| `/context-tools warn` | UI warning; original read unchanged. Observation, not guaranteed savings. |
| `/context-tools enforce` | Blocks measured over-budget reads. Does not launch a worker automatically. |
| `/context-tools off` | Disables only the read guard; an authorized worker remains enabled. |
| `/context-tools allow-read` | Dialog authorizing one large read at a specified path; no worker consent. |
| `/context-tools disable` | Disables worker and aborts its active request; guard mode remains. |

Default: warn, 16,384 bytes. The **requested range** is measured, not just line count: one long minified line can be large. Offset alone is no exemption if it does not reduce the range. Small ranges of large files remain available.

Scanning is capped at 2 MiB. If a distant offset cannot be measured within that cap, warning is returned but read proceeds even in enforce. Known image formats, inaccessible paths, and unsupported paths are not intercepted. Counts are local text bytes, **not exact tokens or the fully formatted Pi tool-result size**.

This guards local standard `read`, **not a sandbox or universal output interceptor**. Bash/PowerShell, overridden/custom tools, and remote filesystems can bypass it. Do not use shell solely to evade a budget: choose grep/rg, a relevant range, or an explicitly authorized worker. Existing Pi output bounds remain in force.

## 4. Bulk-reader contract

Pi receives the `bulk_read` tool. Replace example paths with real ones:

```json
{
  "question": "Where is the retry limit defined and who uses it?",
  "files": [
    {"path": "src/retry.ts", "offset": 1, "limit": 120},
    {"path": "src/client.ts", "offset": 40, "limit": 80}
  ]
}
```

One request makes one selected-model call through Pi's registry. No main conversation history, AGENTS, skill catalog, child shell, tool execution, source writes, automatic retry, or fallback. Only one request runs at a time. Failed dispatched attempts consume the counter too. Resetting the full allowance requires renewed explicit human consent.

Responses are bounded findings/unknowns. Each finding requires exact path, line numbers, and quote. Only supplied lines are accepted; full-source SHA-256 hashes are rechecked afterward. Mismatches, changed files, tool calls, invalid JSON, and truncated answers are rejected.

**Verified quote ≠ correct reasoning.** Source and response text remain untrusted data. A model can draw a wrong conclusion from a real quote. Before editing/debugging, reread the current relevant range using ordinary read and run checks. No automatic semantic verifier is claimed.

## 5. Limits

`.pi/context-tools.json` contains budgets and guard mode, not provider, keys, or enabled state.

| Worker parameter | Default |
| --- | ---: |
| `maxFiles` | 8 |
| `maxInputBytes` | 96,000 serialized question/path/line/text bytes |
| `maxFileBytes` | 2 MiB local snapshot/hash reading per file |
| `maxOutputTokens` | 1,500, also bounded by model capability |
| `maxAnswerBytes` | 7,000 verified JSON bytes, excluding a small service wrapper |
| `timeoutMs` | 60,000 |
| `maxCallsPerSession` | 8 dispatched attempts |

One range per file. Empty selections, binary files, and invalid UTF-8 are rejected. Only selected ranges are transmitted, though the whole file is locally hashed up to the cap. A conservative byte-based capacity check reserves model space before dispatch; it is a heuristic, not an exact tokenizer.

JSON changes apply after `/reload` and renewed consent. Approved budgets are frozen. Use commands to change only guard mode within the current session.

## 6. Data, cancellation, and cost

Local outputs: `.agent/tmp/context-tools/<run>/metrics.json` and, on successful validation, `answer.json`:

- Metrics: selected model, endpoint **origin without userinfo/query/path**, question hash, file paths/ranges/hashes, bytes, duration, outcome, received usage, and estimated worker cost.
- Answer: verified JSON with quotes, without the raw model response.
- Raw corpus, complete question, provider error bodies, and keys are deliberately not logged.
- The provider receives approved source/question under its retention rules; it is not a local model by default.

The initial receipt must be written before dispatch. Failure to write the final receipt is an artifact error, not a successful result. Process termination can leave `IN_FLIGHT`; treat cost as unknown.

Usage returns to Pi as nested tool-result usage, **including rejected responses when the provider reported it**. Pi includes it in session totals. Do not add `/session` total and worker receipts again. A receipt contains **only worker cost**, not parent-model cost.

`workerCostUsd` is Pi's catalog estimate, **not an invoice**. Missing/zero rates yield `null`, not free. Usage may be absent after timeout, Esc/abort, network errors, or incomplete writes. A footer alone does not prove complete accounting; reconcile unknown worker attempts with the provider. Cancellation bounds waiting and sends abort but cannot guarantee zero charges for dispatched requests.

Known credential/config paths, `.env*`, private-key files, `.pi`, `.git`, `.agent/tmp`, `.agent/handoffs`, node_modules, symlinks/junctions, and hardlinks are excluded. **Embedded secrets in ordinary .ts/.json/README files are not reliably detected.** Humans own scope selection. Gitignore/0600 do not encrypt files; Windows ACLs are not separately configured. Answer quotes can also be sensitive.

This does not isolate malicious extensions, provider adapters, or same-privilege processes. They may alter files/registrations and use other Pi capabilities. Use reviewed extensions and OS containment for untrusted code.

## 7. Evaluation and restore

Three variants and accounting validation: [EVALUATION.md](EVALUATION.md). Offline tests cover routing/arithmetic with synthetic data, not actual LLM quality/prices. No “90% savings” claim is made.

Repeated `context-tools` is idempotent. Code updates with `--force` make backups; existing `.pi/context-tools.json` stays **even with force**. Edit budgets manually after schema review. Core files/settings are not replaced.

For full restore, first `/context-tools disable` and stop Pi, then restore using the module installation's manifest (see README). Later file edits are not automatically overwritten. Restart Pi. Backups, logs, and empty directories intentionally remain; the module does not modify source.

## Overhead

The tool description/schema enters Pi's catalog even while the worker is disabled. Unchanged core AGENTS bytes do not imply unchanged total extension context. For rare large reads, targeted-read may be cheaper. The script itself does not retry requests; transport/custom-provider retry behavior belongs to Pi and their configuration.
