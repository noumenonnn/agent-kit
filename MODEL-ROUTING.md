# Model routing: capability first, measured economics

[Русский](MODEL-ROUTING.ru.md)

Core Pi does not implement the `model-group`, `thinking` or `readonly` workflow policies from pi-agenticoding. Without the extension, select the model/thinking manually. Do not claim automatic cheap routing from frontmatter alone.

With the reviewed `pi-agenticoding@0.5.0`, configure `/model-groups`:

| Role | Work | Starting choice |
|---|---|---|
| scout | Focused repository discovery | Lowest-cost model that finds the correct code; low thinking |
| worker | Scoped implementation | Reliable coding model; medium when useful |
| verifier | Select/run checks, interpret evidence | Reliable low-cost model; low |
| architect | Ambiguous contracts and tradeoffs | Strong reasoning model; high when warranted |
| review | Risk-focused critique | Strong reviewer; separate context for independence |
| debugger | Causal debugging after reproduction | Strong reasoning when cheaper attempts stop adding evidence |

Start with **one usable authenticated model per group**. In extension 0.5.0 known groups sample uniformly with replacement: not ordered fallback, not cheapest-first, not health routing. Unknown spawn groups visibly fall back to the parent; known groups with no usable entries fail. Verify names and authentication before depending on costs. These are documented behaviors, not integration tests performed by this kit.

## Keep routing honest
- Use actual provider/model identities and advertised context/effort capabilities; do not disguise one model as another behind a proxy.
- Local/cheap models are not automatically cheapest per accepted task: retries, loops and missed bugs count.
- Same-family or different-family review is a hypothesis to evaluate, not proof of independence/correctness.
- One session doing discovery → implementation → review is not an independent review merely because frontmatter changed its model.
- Small changes normally stay with one worker. Do not spend a frontier call to do mechanical grep, and do not spend several cheap calls to avoid a single reliable answer.
- Stop repeated attempts when no new evidence appears; report the blocker or escalate deliberately.

## Cache-aware phases
Keep AGENTS and resource catalogs stable during a phase. Avoid dynamic status text in permanent instructions and unnecessary model/provider switches. Spawn starts a separate child context; handoff starts a new input prefix. Neither promises cache retention. `showCacheMissNotices` helps observation, but usage/cost must be measured from the actual provider/session.

Record total accepted-task cost, quality, latency, retries and child usage as described in `EVALUATION.md`. Do not choose model brands by fashion or hard-code current price assumptions into prompts.


## Optional bulk-reader v2.1

This is a separate narrow read-only call, not spawn/AgentSession. A human chooses the model and scopes in `/context-tools enable`; no fallback or inherited history. Do not choose the cheapest model without testing quote accuracy and task quality. Full accounting and targeted-read comparisons are in EVALUATION.md. This installation does not change core compaction or agenticoding roles.
