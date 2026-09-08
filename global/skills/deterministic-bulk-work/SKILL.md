---
name: deterministic-bulk-work
description: Replace repeated mechanical edits or checks with a scoped, reproducible script. Use for bulk renames, migrations, file transforms or log processing.
---

# Deterministic Bulk Work

Move repeated mechanical work into code when extra model/tool round-trips add little reasoning value.

1. Define the exact target set and exclusions, preserving user changes.
2. Dry-run and inspect representative changes before applying.
3. Use literal argument arrays, safe paths and deterministic ordering. Do not interpolate untrusted data into shell commands.
4. Preserve formats/encoding and support backup or reversible changes where feasible.
5. Bound runtime, output and memory. Stream large inputs; never buffer an unbounded log merely to shorten its final display.
6. Run regression checks and report counts, anomalous paths and evidence locations.

Parallelize independent reads, not conflicting writes. Scripts execute with ordinary OS permissions; a dry-run or prompt policy is not a sandbox.
