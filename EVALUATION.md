# Comparing quality and total cost

[Русский](EVALUATION.ru.md)

The kit has no proven savings percentage. Offline tests check logic, not real LLM answers/prices. Fair comparisons need the same task set and all attempts, including failures.

## Three variants

- `full-read`: ordinary full reads without the extra guard/worker.
- `targeted-read`: core v2 path/symbol search, bounded ranges, compact logs, no worker.
- `delegated`: the same core plus authorized bulk-reader; exact code for editing is still read directly.

One small-file request is often cheaper than two model calls. Moving text to a worker does not itself prove whole-task savings.

## Live evaluation protocol

1. Fix tasks: unfamiliar-code behavior discovery, narrow bug, multi-file change, regression review. Record criteria, tests, and assertions beforehand. Read-only questions also need a gold/reference verdict, not merely citations.
2. Start from identical Git snapshots and dirty state. Use separate branches/worktrees for edits. Randomize variant order; do not teach later runs earlier answers.
3. Keep principal model, thinking, Pi version, tools, and acceptance rules equal. Specify worker/model explicitly. Record real provider/model IDs, kit/extension versions, cache state, date/rates. Compare cold and warm separately; repeat tasks to observe variation.
4. Finish each task with verification or an honest failure. Include reads, worker, corrections, retries, review, summaries, handoff, and human intervention, not just one successful child's price.
5. Accept using the same tests and independent review, concealing variant identity from reviewers where possible. Validated bulk-reader paths/quotes are not quality verdicts.
6. Compare costs only after quality is comparable. Separately examine regressions, p50/p95 latency, tool calls, and human minutes. One example is insufficient to establish lower cost.

This distribution **did not run paid live evaluations**. They require your model/provider choice and authorization to transmit source. The script below reads existing records; it makes no model calls or charges.

## Records and summary

Copy `optional/context-tools/evaluation.template.json` to a local results directory. All costs/verdicts are null: a template, not measured data.

```bash
node scripts/summarize-context-evals.mjs /path/to/evaluation.json
```

Windows:

```powershell
node "$Kit\scripts\summarize-context-evals.mjs" "$Project\.agent\tmp\evaluation.json"
```

Minimal attempt record:

```json
{
  "schemaVersion": 1,
  "attempts": [
    {
      "runId": "unique-local-run-001",
      "taskId": "bug-001",
      "variant": "delegated",
      "attempt": 1,
      "accepted": null,
      "durationMs": null,
      "cost": {"kind": "pi-attempt-total", "usd": null},
      "costBasis": "unknown",
      "models": {"parent": "actual-provider/model", "worker": "actual-provider/model"},
      "thinking": "actual setting",
      "cacheCondition": "cold",
      "evidence": ["tests and review verdict paths"],
      "humanMinutes": null
    }
  ]
}
```

The script validates required fields; retain extra metadata/paths for reproduction. `runId` is unique. Within taskId/variant, attempt numbers are positive and unique. The last attempt determines acceptance; **all attempts count toward cost**, including earlier rejections. Retain failed/cancelled runs.

`accepted` is true/false after verification, null before a verdict. `durationMs` is total wall-clock attempt latency, not only worker time. Final costs may arrive later; use null, not 0, until known.

## Two valid accounting methods

**1. Full Pi attempt total**, `pi-attempt-total`:

- Use a fresh isolated session per attempt or end − start totals.
- Nested worker usage is already in Pi total if received and recorded.
- Never add worker receipts again.
- Do not repeat one cumulative footer across rows; that double-counts.
- Check receipts for timeout/missing usage. A numeric footer is not necessarily complete.

**2. Non-overlapping components**, instead of a total:

```json
{
  "kind": "components",
  "parentUsd": null,
  "workerUsd": null,
  "otherUsd": null
}
```

`parentUsd` excludes worker. `workerUsd` includes every dispatched worker call; `otherUsd` includes other relevant calls/reviews. Known absence can be 0; unknown is null. Any unknown makes total unknown. The validator rejects simultaneous total and components.

`costBasis`: catalog-estimate, billed, or unknown. Pi catalog USD is a rate estimate, not an invoice. The module deliberately does not infer payment from remembered model prices. Avoid mixing price bases in savings conclusions.

## Summary output

Per variant: attempts/tasks, accepted/unverified tasks, acceptance rate with complete verdicts, known subtotal, total only with complete accounting, cost per accepted task, median known durations, and missing counts. Zero accepted tasks means cost per accepted task is null, not zero.

Task ID sets are compared across all three variants. There is no automatic winner, arbitrary savings percentage, or substitution of zero for missing data. Summary validation does not establish invoice truth, review quality, equivalent cache conditions, or randomization; retain source evidence.

Use usage tokens diagnostically: provider definitions for fresh input, cache read/write, and output differ. Avoid adding overlapping totalTokens/input/cache counters twice. Quality evidence matters more than one attractive cost number.
