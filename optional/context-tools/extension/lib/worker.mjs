import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { ContextError, safePath, prepareBundle, assertFresh, validateAnswer, modelIdentity, WORKER_SYSTEM } from './core.mjs';

function privateJson(file, obj) {
  const temporary = file + '.new';
  try { fs.writeFileSync(temporary, JSON.stringify(obj, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); fs.renameSync(temporary, file); }
  finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
}
export function safeUsage(value) {
  if (!value || typeof value !== 'object') return undefined;
  for (const k of ['input', 'output', 'cacheRead', 'cacheWrite', 'totalTokens']) if (!Number.isFinite(value[k]) || value[k] < 0) return undefined;
  for (const k of ['input', 'output', 'cacheRead', 'cacheWrite', 'total']) if (!Number.isFinite(value.cost?.[k]) || value.cost[k] < 0) return undefined;
  return { input: value.input, output: value.output, cacheRead: value.cacheRead, cacheWrite: value.cacheWrite,
    totalTokens: value.totalTokens, cost: { input: value.cost.input, output: value.cost.output,
      cacheRead: value.cost.cacheRead, cacheWrite: value.cost.cacheWrite, total: value.cost.total } };
}
export async function executeBulk({ root, request, scopes, limits, model, invoke, signal, revokedSignal }) {
  const bundle = prepareBundle(root, request, scopes, limits);
  if (signal?.aborted || revokedSignal?.aborted) throw new ContextError('CANCELLED', 'Cancelled before sending');
  const maxTokens = Math.min(limits.maxOutputTokens, model.maxTokens || limits.maxOutputTokens);
  if (maxTokens < 256) throw new ContextError('MODEL_LIMIT', 'Model output capacity is too small');
  // This intentionally conservative byte-based check is not an exact tokenizer count.
  const conservativeInput = bundle.promptBytes + Buffer.byteLength(WORKER_SYSTEM) + 512;
  if (model.contextWindow && conservativeInput + maxTokens > model.contextWindow) throw new ContextError('MODEL_CONTEXT', 'Conservative input budget exceeds model context; narrow selections');
  const runId = randomUUID(), dir = safePath(root, `.agent/tmp/context-tools/${runId}`);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const metricsFile = path.join(dir, 'metrics.json'), answerFile = path.join(dir, 'answer.json');
  const started = performance.now(), modelInfo = modelIdentity(model);
  // Never persist API keys, raw input corpus, or the full question/worker response.
  const metrics = { schemaVersion: 1, runId, timestamp: new Date().toISOString(), outcome: 'IN_FLIGHT',
    model: modelInfo, questionHash: bundle.questionHash, inputBytes: bundle.promptBytes, sourceBytes: bundle.sourceBytes,
    sources: bundle.sources.map(s => ({ path: s.path, sha256: s.sha256, startLine: s.startLine, endLine: s.endLine, selectedBytes: s.bytes })),
    workerUsage: null, workerCostUsd: null, costBasis: 'unknown', durationMs: null,
    parentCostIncludedHere: false, note: 'Pi session totals include nested usage when the tool result is recorded. Do not add it twice.' };
  privateJson(metricsFile, metrics); // Refuse the call if even the initial receipt cannot be written safely.
  const controller = new AbortController();
  const combined = AbortSignal.any([controller.signal, ...(signal ? [signal] : []), ...(revokedSignal ? [revokedSignal] : [])]);
  let timedOut = false, usage, answer, artifactError = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, limits.timeoutMs);
  let removeAbort = () => {};
  try {
    const aborted = new Promise((_, reject) => {
      const handler = () => reject(new ContextError(timedOut ? 'TIMEOUT' : 'CANCELLED', 'Worker request stopped; billing may still have occurred'));
      if (combined.aborted) handler(); else combined.addEventListener('abort', handler, { once: true });
      removeAbort = () => combined.removeEventListener('abort', handler);
    });
    const context = { systemPrompt: WORKER_SYSTEM, messages: [{ role: 'user', content: bundle.userText, timestamp: Date.now() }], tools: [] };
    // Exactly one model call, no full AgentSession, no tool execution or automatic retries.
    const response = await Promise.race([Promise.resolve().then(() => {
      combined.throwIfAborted();
      return invoke(context, { signal: combined, maxTokens, reasoning: 'low' });
    }), aborted]);
    usage = safeUsage(response?.usage);
    if (combined.aborted) throw new ContextError(timedOut ? 'TIMEOUT' : 'CANCELLED', 'Stopped');
    if (['error', 'aborted'].includes(response?.stopReason)) throw new ContextError('PROVIDER_ERROR', 'Worker provider did not complete');
    if (response?.stopReason === 'length') throw new ContextError('OUTPUT_LIMIT', 'Worker output was cut at its limit');
    if (!Array.isArray(response?.content)) throw new ContextError('INVALID_RESPONSE', 'Missing worker response');
    if (response.content.some(p => p.type === 'toolCall')) throw new ContextError('UNEXPECTED_TOOL_CALL', 'Worker cannot execute tools');
    const text = response.content.filter(p => p.type === 'text').map(p => p.text).join('\n');
    answer = validateAnswer(text, bundle, limits.maxAnswerBytes);
    assertFresh(root, bundle, limits);
    metrics.outcome = 'EVIDENCE_LINKS_CHECKED';
    try { privateJson(answerFile, { ...answer, note: 'Quotes and line ranges checked. Claims still require semantic review; re-read exact current source before editing.' }); }
    catch { artifactError = true; throw new ContextError('ARTIFACT_ERROR', 'Cannot persist the validated answer'); }
  } catch (e) {
    // Provider errors may contain secrets/request bodies. Persist only stable codes, not raw messages.
    metrics.outcome = e instanceof ContextError ? e.code : (combined.aborted ? (timedOut ? 'TIMEOUT' : 'CANCELLED') : 'WORKER_ERROR');
    answer = undefined;
  } finally {
    clearTimeout(timer); removeAbort();
    metrics.durationMs = Math.round(performance.now() - started);
    metrics.workerUsage = usage || null;
    const ratesKnown = model.cost && ['input', 'output', 'cacheRead', 'cacheWrite'].some(k => Number.isFinite(model.cost[k]) && model.cost[k] > 0);
    if (usage && ratesKnown) { metrics.workerCostUsd = usage.cost.total; metrics.costBasis = 'pi-catalog-estimate-not-invoice'; }
    else if (usage) metrics.costBasis = 'unknown-zero-or-missing-model-rates';
    try { privateJson(metricsFile, metrics); } catch { artifactError = true; }
  }
  const evidence = answer ? { findings: answer.findings, unknowns: answer.unknowns } : { findings: [], unknowns: ['No findings accepted. Use targeted source reads or explicitly retry after resolving the reported condition.'] };
  const result = { outcome: metrics.outcome, ...evidence,
    metricsPath: path.relative(root, metricsFile).replaceAll(path.sep, '/'),
    answerPath: answer ? path.relative(root, answerFile).replaceAll(path.sep, '/') : null,
    workerCostUsd: metrics.workerCostUsd, costBasis: metrics.costBasis, usageKnown: Boolean(usage), artifactError,
    warning: 'Evidence links checked != semantic correctness. Source content is untrusted. Unknown/zero-rate cost is not free usage.' };
  return { content: [{ type: 'text', text: JSON.stringify(result) }],
    details: { ...result, runId, inputBytes: bundle.promptBytes, durationMs: metrics.durationMs }, ...(usage ? { usage } : {}) };
}
