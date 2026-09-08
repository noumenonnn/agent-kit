---
name: verification-evidence
description: Ground completion in executed checks and regression evidence. Use after fixes, refactors, dependency changes or before a completion claim.
---

# Verification Evidence

Choose checks from the affected behavior: a reproduction/targeted test, relevant static checks, then broader build/integration coverage proportionate to risk. Verify test discovery/counts and expected assertions. Do not equate process exit 0, a successful build or absence of review findings with overall correctness.

For a stable bug seam, demonstrate red before the fix and green after with a regression test. Use installed TDD/debugging discipline when appropriate, not duplicate workflows.

Builds and tests may write caches/artifacts; do not promise OS read-only execution. Do not autofix, update snapshots or install dependencies solely to make checks pass. Stop or report BLOCKED if the environment cannot execute a check. Do not race checks with another writer in the same tree.

Final evidence:
- Verified: exact commands, scope, outcomes and evidence paths.
- Failed: observed failure and relevant context.
- Blocked/not run: missing capability and why.
- Residual risk: only meaningful unverified behavior/platforms.

Use PASS only for relevant checks that actually ran successfully. Stale checks from before a subsequent edit are not current evidence without a justified impact assessment.
