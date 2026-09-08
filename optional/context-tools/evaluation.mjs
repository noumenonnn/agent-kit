// Accounting uses either per-attempt Pi totals OR disjoint cost components, never both.
export function summarizeEvaluation(data) {
  if (!data || data.schemaVersion !== 1 || !Array.isArray(data.attempts)) throw new Error('Expected {schemaVersion:1, attempts:[...]}');
  const variants = new Map(), ids = new Set(), attempts = new Set();
  const money = v => { if (v === null) return null; if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) throw new Error('Costs must be finite nonnegative numbers or null (unknown)'); return v; };
  for (const row of data.attempts) {
    if (!row || typeof row.runId !== 'string' || !row.runId || ids.has(row.runId)) throw new Error('Each runId must be unique');
    ids.add(row.runId);
    if (typeof row.taskId !== 'string' || !row.taskId || !['full-read', 'targeted-read', 'delegated'].includes(row.variant)) throw new Error('Invalid taskId/variant');
    if (!Number.isSafeInteger(row.attempt) || row.attempt < 1) throw new Error('attempt must be a positive integer');
    const key = JSON.stringify([row.taskId, row.variant, row.attempt]);
    if (attempts.has(key)) throw new Error('Duplicate task/variant/attempt'); attempts.add(key);
    if (![true, false, null].includes(row.accepted)) throw new Error('accepted must be true, false or null (not judged)');
    if (row.durationMs !== null && (!Number.isFinite(row.durationMs) || row.durationMs < 0)) throw new Error('durationMs must be nonnegative or null');
    let cost;
    if (row.cost?.kind === 'pi-attempt-total') {
      if (Object.keys(row.cost).some(k => !['kind', 'usd'].includes(k))) throw new Error('Pi totals already include nested workers; do not also supply components');
      cost = money(row.cost.usd);
    } else if (row.cost?.kind === 'components') {
      if (Object.keys(row.cost).some(k => !['kind', 'parentUsd', 'workerUsd', 'otherUsd'].includes(k))) throw new Error('Components must be disjoint, not combined with a total');
      const values = ['parentUsd', 'workerUsd', 'otherUsd'].map(k => money(row.cost[k]));
      cost = values.includes(null) ? null : values.reduce((a, b) => a + b, 0);
    } else throw new Error('Choose pi-attempt-total or disjoint components');
    if (!['catalog-estimate', 'billed', 'unknown'].includes(row.costBasis)) throw new Error('Invalid costBasis');
    if (!variants.has(row.variant)) variants.set(row.variant, []);
    variants.get(row.variant).push({ ...row, computedCost: cost });
  }
  const groups = [...variants.entries()].map(([variant, rows]) => {
    const final = new Map();
    for (const row of rows) if (!final.has(row.taskId) || final.get(row.taskId).attempt < row.attempt) final.set(row.taskId, row);
    const decisions = [...final.values()], acceptedTasks = decisions.filter(r => r.accepted === true).length;
    const unjudgedTasks = decisions.filter(r => r.accepted === null).length;
    const unknownCostAttempts = rows.filter(r => r.computedCost === null).length;
    const knownSubtotalUsd = rows.reduce((n, r) => n + (r.computedCost ?? 0), 0);
    const completeCost = unknownCostAttempts === 0;
    const times = rows.map(r => r.durationMs).filter(v => v !== null).sort((a, b) => a - b);
    const median = times.length ? (times[Math.floor((times.length - 1) / 2)] + times[Math.floor(times.length / 2)]) / 2 : null;
    return { variant, attempts: rows.length, tasks: decisions.length, acceptedTasks, unjudgedTasks, unknownCostAttempts,
      taskIds: [...final.keys()].sort(), costBasis: [...new Set(rows.map(r => r.costBasis))].sort(),
      totalCostUsd: completeCost ? knownSubtotalUsd : null, knownSubtotalUsd,
      costPerAcceptedTaskUsd: completeCost && !unjudgedTasks && acceptedTasks ? knownSubtotalUsd / acceptedTasks : null,
      acceptanceRate: decisions.length && !unjudgedTasks ? acceptedTasks / decisions.length : null,
      medianAttemptDurationMs: median, unknownDurationAttempts: rows.filter(r => r.durationMs === null).length };
  });
  const matched = groups.length === 3 && new Set(groups.map(g => JSON.stringify(g.taskIds))).size === 1;
  return { schemaVersion: 1, groups, matchedTaskSets: matched,
    warnings: [!matched ? 'All three variants must cover the same tasks before comparison.' : null,
      groups.some(g => g.unknownCostAttempts) ? 'Unknown cost is not zero; totals and per-accepted-task costs are incomplete.' : null,
      groups.some(g => g.unjudgedTasks) ? 'Quality decisions are incomplete. No savings claim is justified.' : null,
      'Pi-attempt-total must be an isolated attempt total or an end-minus-start delta, not repeated cumulative footer readings.',
      'Catalog costs are estimates, not invoices. Failures/retries are included. No automatic winner or token-savings claim is produced.'
    ].filter(Boolean) };
}
