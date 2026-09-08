import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { parseConfig, normalizeRelative, sensitivePath, validateScopes, snapshot, selectWindow, inspectRead, prepareBundle, validateAnswer, assertFresh, modelIdentity, modelFingerprint } from '../optional/context-tools/extension/lib/core.mjs';
import { executeBulk, safeUsage } from '../optional/context-tools/extension/lib/worker.mjs';
import { registerContextTools } from '../optional/context-tools/extension/lib/adapter.mjs';
import { summarizeEvaluation } from '../optional/context-tools/evaluation.mjs';

const KIT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GOLD = { findings: [{ claim: 'Retry limit is three.', evidence: [{ path: 'src/service.ts', startLine: 1, endLine: 1, quote: 'RETRY_LIMIT = 3' }] }], unknowns: [] };
const USAGE = { input: 300, output: 80, cacheRead: 10, cacheWrite: 0, totalTokens: 390, cost: { input: 0.0003, output: 0.00016, cacheRead: 0.000001, cacheWrite: 0, total: 0.000461 } };
const model = () => ({ provider: 'test-provider', id: 'cheap-worker', api: 'mock', input: ['text'], baseUrl: 'https://worker.example.invalid/v1', contextWindow: 200000, maxTokens: 4096, cost: { input: 1, output: 2, cacheRead: 0.1, cacheWrite: 1 } });
const request = () => ({ question: 'Where is retry configured?', files: [{ path: 'src/service.ts' }] });
const response = (answer = GOLD) => ({ role: 'assistant', stopReason: 'stop', content: [{ type: 'text', text: JSON.stringify(answer) }], usage: structuredClone(USAGE) });
function put(file, value) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, value); }
function fixture(t) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'pi-context test-')));
  put(path.join(root, 'src/service.ts'), 'export const RETRY_LIMIT = 3;\nexport const LABEL = "Привет";\nexport function retry() { return RETRY_LIMIT; }\n');
  t.after(() => fs.rmSync(root, { recursive: true, force: true })); return root;
}
const hasCode = code => e => e.code === code;
function runInstaller(root, args) {
  try { return { code: 0, out: execFileSync(process.execPath, [path.join(KIT, 'scripts/kit.mjs'), ...args], { cwd: root, encoding: 'utf8', timeout: 10000, stdio: ['ignore', 'pipe', 'pipe'] }) }; }
  catch (e) { return { code: e.status, out: e.stdout?.toString(), err: e.stderr?.toString() }; }
}
async function bulk(root, overrides = {}) {
  return executeBulk({ root, request: request(), scopes: ['src'], limits: parseConfig().worker, model: model(), invoke: async () => response(), ...overrides });
}
async function harness(t, options = {}) {
  const root = fixture(t);
  if (options.config) put(path.join(root, '.pi/context-tools.json'), JSON.stringify(options.config));
  const handlers = new Map(), commands = new Map(), tools = new Map(), notifications = [], calls = [];
  const pi = { on(name, fn) { if (!handlers.has(name)) handlers.set(name, []); handlers.get(name).push(fn); }, registerCommand(name, def) { commands.set(name, def); }, registerTool(def) { tools.set(def.name, def); } };
  const h = { root, pi, handlers, commands, tools, notifications, calls, model: model(), approve: true, mode: 'tui', scopes: '["src"]', result: async () => response() };
  const ctx = { cwd: root, hasUI: true, get mode() { return h.mode; }, scopedModels: [],
    ui: { notify: (...a) => notifications.push(a), select: async (_title, choices) => choices[0], input: async () => h.scopes, confirm: async () => h.approve },
    modelRegistry: { getAvailable: () => [h.model], find: (p, id) => h.model.provider === p && h.model.id === id ? h.model : undefined,
      streamSimple: (m, context, opts) => { calls.push({ model: m, context, opts }); return { result: () => h.result() }; } } };
  h.ctx = ctx; h.status = registerContextTools(pi, { type: 'object' }).status;
  h.emit = async (name, event = {}) => { const out = []; for (const fn of handlers.get(name) || []) out.push(await fn(event, ctx)); return out; };
  h.command = args => commands.get('context-tools').handler(args, ctx);
  h.tool = (params = request(), signal) => tools.get('bulk_read').execute('fixture-call', params, signal, undefined, ctx);
  await h.emit('session_start'); return h;
}

test('context config starts warn-only with no provider or persistent consent', () => {
  const c = parseConfig(); assert.equal(c.guard.mode, 'warn'); assert.equal(c.worker.provider, undefined); assert.ok(Object.isFrozen(c.worker));
  for (const bad of [{ worker: null }, { guard: { mode: 'automatic-send' } }, { enabled: true }, { worker: { timeoutMs: -1 } }]) assert.throws(() => parseConfig(bad));
});
test('portable relative paths reject traversal, absolute paths, ADS and Windows reserved names', () => {
  assert.equal(normalizeRelative('.\\src\\service.ts'), 'src/service.ts');
  for (const p of ['../secret', '/etc/passwd', 'C:\\secret', 'src/../secret', 'src/file:stream', 'src/CON', 'src/file.', 'src/*']) assert.throws(() => normalizeRelative(p));
});
test('sensitive paths include credentials, env files, settings and local artifacts', () => {
  for (const p of ['src/.env', 'src/.env.example', '.pi/auth.json', '.agent/tmp/a.json', '.agent/handoffs/a.md', 'src/key.pem', 'src/secrets/a.ts', '.npmrc']) assert.equal(sensitivePath(p), true, p);
  assert.equal(sensitivePath('src/service.ts'), false);
});
test('scopes must be explicit existing files/directories, not whole-root or wildcard', t => {
  const root = fixture(t); assert.deepEqual(validateScopes(root, ['src', 'src']), ['src']);
  for (const scopes of [[], ['.'], ['**'], ['missing']]) assert.throws(() => validateScopes(root, scopes));
});
test('snapshot preserves full file hash and selects exact UTF-8 ranges', t => {
  const root = fixture(t), s = snapshot(root, 'src/service.ts', 4096), w = selectWindow(s, { offset: 2, limit: 1 });
  assert.equal(w.startLine, 2); assert.equal(w.endLine, 2); assert.match(w.text, /Привет/); assert.equal(w.bytes, Buffer.byteLength(w.text)); assert.match(s.sha256, /^[a-f0-9]{64}$/);
});
test('snapshot refuses binary data, invalid UTF-8, excessive files and hardlinks', t => {
  const root = fixture(t); put(path.join(root, 'src/binary'), Buffer.from([1, 0, 2])); put(path.join(root, 'src/invalid'), Buffer.from([255])); put(path.join(root, 'src/huge'), 'x'.repeat(5000));
  assert.throws(() => snapshot(root, 'src/binary', 4096), hasCode('BINARY_FILE'));
  assert.throws(() => snapshot(root, 'src/invalid', 4096), hasCode('INVALID_UTF8'));
  assert.throws(() => snapshot(root, 'src/huge', 4096), hasCode('FILE_TOO_LARGE'));
  fs.linkSync(path.join(root, 'src/service.ts'), path.join(root, 'src/linked.ts'));
  assert.throws(() => snapshot(root, 'src/linked.ts', 4096), hasCode('UNSAFE_FILE'));
});
test('symlink/junction source escapes are refused', t => {
  const root = fixture(t), outside = path.join(root, 'outside'); fs.mkdirSync(outside); put(path.join(outside, 'data.ts'), 'secret material');
  try { fs.symlinkSync(outside, path.join(root, 'src/link'), 'dir'); }
  catch (e) { if (['EPERM', 'EACCES'].includes(e.code)) { t.skip('Symlink privilege unavailable'); return; } throw e; }
  assert.throws(() => snapshot(root, 'src/link/data.ts', 4096), hasCode('UNSAFE_PATH'));
});
test('read guard measures the requested range, not full file size or existence of offset', t => {
  const root = fixture(t), text = 'small first line\n' + 'x'.repeat(20000); put(path.join(root, 'src/large.ts'), text);
  const g = parseConfig().guard;
  assert.equal(inspectRead(root, { path: 'src/large.ts' }, g).kind, 'large');
  assert.equal(inspectRead(root, { path: 'src/large.ts', offset: 1 }, g).kind, 'large');
  assert.equal(inspectRead(root, { path: 'src/large.ts', offset: 1, limit: 1 }, g).kind, 'small');
  assert.equal(inspectRead(root, { path: 'src/large.ts', offset: 2, limit: 1 }, g).kind, 'large');
});
test('read guard catches one huge line and counts non-ASCII bytes', t => {
  const root = fixture(t); put(path.join(root, 'src/large.json'), '界'.repeat(7000));
  assert.equal(inspectRead(root, { path: 'src/large.json', limit: 1 }, parseConfig().guard).kind, 'large');
});
test('guard bounds scan work and reports unknown ranges instead of inventing a size', t => {
  const root = fixture(t); put(path.join(root, 'src/long.ts'), 'tiny\n'.repeat(5000));
  const g = { ...parseConfig().guard, maxScanBytes: 4096 };
  assert.equal(inspectRead(root, { path: 'src/long.ts', offset: 4000, limit: 1 }, g).kind, 'unmeasured');
  assert.equal(inspectRead(root, { path: 'missing' }, g).kind, 'skip');
  assert.equal(inspectRead(root, { path: 'src/long.ts', offset: 0 }, g).kind, 'skip');
});
test('bundle contains only approved selected ranges and no parent conversation', t => {
  const root = fixture(t), q = { question: 'Which label?', files: [{ path: 'src/service.ts', offset: 2, limit: 1 }] };
  const b = prepareBundle(root, q, ['src'], parseConfig().worker), sent = JSON.parse(b.userText);
  assert.equal(sent.files[0].startLine, 2); assert.match(sent.files[0].text, /^2: /); assert.ok(!b.userText.includes('RETRY_LIMIT')); assert.equal(sent.history, undefined);
});
test('bundle rejects duplicate paths, outside scopes, empty ranges and excessive payloads', t => {
  const root = fixture(t), limits = { ...parseConfig().worker, maxInputBytes: 4096 };
  assert.throws(() => prepareBundle(root, { question: 'q', files: [{ path: 'src/service.ts' }, { path: 'src/service.ts' }] }, ['src'], limits), hasCode('DUPLICATE_FILE'));
  put(path.join(root, 'outside.ts'), 'outside');
  assert.throws(() => prepareBundle(root, { question: 'q', files: [{ path: 'outside.ts' }] }, ['src'], limits), hasCode('OUTSIDE_SCOPE'));
  assert.throws(() => prepareBundle(root, { question: 'q', files: [{ path: 'src/service.ts', offset: 99 }] }, ['src'], limits), hasCode('EMPTY_SELECTION'));
  put(path.join(root, 'src/large.ts'), 'x'.repeat(5000));
  assert.throws(() => prepareBundle(root, { question: 'q', files: [{ path: 'src/large.ts' }] }, ['src'], limits), hasCode('INPUT_BUDGET'));
});
test('evidence validation accepts exact quotes but not invented files, lines or quotes', t => {
  const root = fixture(t), b = prepareBundle(root, request(), ['src'], parseConfig().worker);
  assert.deepEqual(validateAnswer(JSON.stringify(GOLD), b, 7000), GOLD);
  assert.deepEqual(validateAnswer('```json\n' + JSON.stringify(GOLD) + '\n```', b, 7000), GOLD);
  for (const patch of [{ path: 'src/other.ts' }, { startLine: 2, endLine: 2 }, { quote: 'RETRY_LIMIT = 9' }]) {
    const answer = structuredClone(GOLD); Object.assign(answer.findings[0].evidence[0], patch); assert.throws(() => validateAnswer(JSON.stringify(answer), b, 7000));
  }
  assert.throws(() => validateAnswer('not json', b, 7000));
});
test('quotes cannot reference unseen lines of a partially transmitted file', t => {
  const root = fixture(t), b = prepareBundle(root, { question: 'q', files: [{ path: 'src/service.ts', offset: 2, limit: 1 }] }, ['src'], parseConfig().worker);
  assert.throws(() => validateAnswer(JSON.stringify(GOLD), b, 7000));
});
test('source freshness detects edits after the snapshot', t => {
  const root = fixture(t), b = prepareBundle(root, request(), ['src'], parseConfig().worker); put(path.join(root, 'src/service.ts'), 'changed');
  assert.throws(() => assertFresh(root, b, parseConfig().worker), hasCode('STALE_SOURCE'));
});
test('model identity never exposes URL userinfo/query secrets, but fingerprint detects changes', () => {
  const m = model(); m.baseUrl = 'https://user:password@worker.example.invalid/v1?api_key=SECRET';
  assert.equal(modelIdentity(m).endpointOrigin, 'https://worker.example.invalid'); assert.ok(!JSON.stringify(modelIdentity(m)).includes('SECRET'));
  const before = modelFingerprint(m); m.baseUrl += '2'; assert.notEqual(modelFingerprint(m), before);
});
test('usage normalization preserves provider accounting without double-counting token fields', () => {
  assert.deepEqual(safeUsage(USAGE), USAGE); assert.equal(safeUsage(undefined), undefined); assert.equal(safeUsage({ ...USAGE, input: NaN }), undefined);
});
test('worker makes exactly one tool-less call, returns usage and writes no raw corpus', async t => {
  const root = fixture(t); let calls = 0;
  const out = await bulk(root, { invoke: async (context, options) => { calls++; assert.deepEqual(context.tools, []); assert.equal(context.messages.length, 1); assert.equal(context.messages[0].role, 'user'); assert.ok(options.signal); return response(); } });
  assert.equal(calls, 1); assert.equal(out.details.outcome, 'EVIDENCE_LINKS_CHECKED'); assert.deepEqual(out.usage, USAGE);
  const file = path.join(root, out.details.metricsPath), receipt = fs.readFileSync(file, 'utf8');
  assert.ok(!receipt.includes('export const')); assert.ok(!receipt.includes('Where is retry configured?')); assert.equal(JSON.parse(receipt).workerCostUsd, USAGE.cost.total);
  assert.ok(fs.existsSync(path.join(root, out.details.answerPath)));
});
test('invalid worker evidence is rejected while incurred usage/cost is retained', async t => {
  const root = fixture(t), bad = structuredClone(GOLD); bad.findings[0].evidence[0].quote = 'RETRY_LIMIT = 9';
  const out = await bulk(root, { invoke: async () => response(bad) });
  assert.notEqual(out.details.outcome, 'EVIDENCE_LINKS_CHECKED'); assert.deepEqual(out.usage, USAGE); assert.equal(out.details.findings.length, 0); assert.equal(out.details.answerPath, null);
});
test('changed source causes rejection even after a valid worker response', async t => {
  const root = fixture(t); const out = await bulk(root, { invoke: async () => { put(path.join(root, 'src/service.ts'), 'changed'); return response(); } });
  assert.equal(out.details.outcome, 'STALE_SOURCE'); assert.deepEqual(out.usage, USAGE);
});
test('worker never follows tool requests, accepts truncated responses or retries provider failures', async t => {
  const root = fixture(t); let calls = 0;
  const out = await bulk(root, { invoke: async () => { calls++; return { ...response(), content: [{ type: 'toolCall', name: 'bash', arguments: { command: 'do not run' } }] }; } });
  assert.equal(calls, 1); assert.equal(out.details.outcome, 'UNEXPECTED_TOOL_CALL');
  const cut = await bulk(root, { invoke: async () => ({ ...response(), stopReason: 'length' }) }); assert.equal(cut.details.outcome, 'OUTPUT_LIMIT');
  const error = await bulk(root, { invoke: async () => ({ ...response(), stopReason: 'error', errorMessage: 'SECRET_API_KEY' }) }); assert.equal(error.details.outcome, 'PROVIDER_ERROR'); assert.ok(!JSON.stringify(error).includes('SECRET_API_KEY'));
});
test('timeout returns unknown cost, not zero, even when an adapter ignores cancellation', async t => {
  const root = fixture(t), start = Date.now();
  const out = await bulk(root, { limits: { ...parseConfig().worker, timeoutMs: 100 }, invoke: () => new Promise(() => {}) });
  assert.equal(out.details.outcome, 'TIMEOUT'); assert.equal(out.details.workerCostUsd, null); assert.equal(out.details.usageKnown, false); assert.ok(Date.now() - start < 3000);
});
test('abort before dispatch prevents a request; zero-rate models do not pretend cost is known', async t => {
  const root = fixture(t), c = new AbortController(); c.abort(); let called = false;
  await assert.rejects(() => bulk(root, { signal: c.signal, invoke: () => { called = true; } }), hasCode('CANCELLED')); assert.equal(called, false);
  const m = model(); m.cost = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
  const out = await bulk(root, { model: m }); assert.deepEqual(out.usage, USAGE); assert.equal(out.details.workerCostUsd, null);
});
test('model context/input budget errors happen before dispatch', async t => {
  const root = fixture(t), m = model(); m.contextWindow = 1000; let called = false;
  await assert.rejects(() => bulk(root, { model: m, invoke: () => { called = true; } }), hasCode('MODEL_CONTEXT')); assert.equal(called, false);
});
test('adapter starts disabled and config cannot grant delegation permission', async t => {
  const h = await harness(t); let out = await h.tool(); assert.equal(out.details.outcome, 'CONSENT_REQUIRED'); assert.equal(h.calls.length, 0);
  put(path.join(h.root, '.pi/context-tools.json'), '{"enabled":true}'); out = await h.tool(); assert.equal(out.details.outcome, 'CONSENT_REQUIRED');
});
test('interactive denial and noninteractive mode never grant permission', async t => {
  const h = await harness(t); h.approve = false; await h.command('enable'); assert.equal(h.status().enabled, false);
  h.approve = true; h.mode = 'rpc'; await h.command('enable'); assert.equal(h.status().enabled, false); assert.equal(h.calls.length, 0);
});
test('adapter uses the configured provider registry and forwards nested usage to Pi', async t => {
  const h = await harness(t); await h.command('enable'); assert.equal(h.status().enabled, true);
  const out = await h.tool(); assert.equal(h.calls.length, 1); assert.equal(h.calls[0].model.id, h.model.id); assert.deepEqual(out.usage, USAGE);
});
test('model endpoint/rate changes invalidate prior permission without a silent fallback', async t => {
  const h = await harness(t); await h.command('enable'); h.model.baseUrl = 'https://different.example.invalid';
  const out = await h.tool(); assert.equal(out.details.outcome, 'MODEL_CHANGED'); assert.equal(h.calls.length, 0); assert.equal(h.status().enabled, false);
});
test('session switches, forks, tree navigation, reload and disable revoke consent', async t => {
  const h = await harness(t);
  for (const event of ['session_before_switch', 'session_before_fork', 'session_before_tree', 'session_shutdown', 'session_start']) {
    await h.command('enable'); assert.equal(h.status().enabled, true); await h.emit(event); assert.equal(h.status().enabled, false, event);
  }
  await h.command('enable'); await h.command('disable'); assert.equal(h.status().enabled, false);
});
test('per-session dispatched attempt budget blocks repeated requests', async t => {
  const h = await harness(t, { config: { worker: { maxCallsPerSession: 1 } } }); await h.command('enable');
  await h.tool(); const out = await h.tool(); assert.equal(h.calls.length, 1); assert.equal(out.details.outcome, 'CALL_BUDGET');
});
test('one request at a time and revocation cancels active work', async t => {
  const h = await harness(t); await h.command('enable'); h.result = () => new Promise(() => {});
  const first = h.tool(); await new Promise(resolve => setTimeout(resolve, 20));
  const second = await h.tool(); assert.equal(second.details.outcome, 'BUSY');
  await h.command('disable'); const out = await first; assert.equal(out.details.outcome, 'CANCELLED'); assert.equal(h.calls.length, 1);
});
test('warn mode does not block reads; enforce blocks large requested ranges but not small ones', async t => {
  const h = await harness(t); put(path.join(h.root, 'src/big.ts'), 'first line\n' + 'x'.repeat(20000));
  let r = await h.emit('tool_call', { toolName: 'read', input: { path: 'src/big.ts' } }); assert.equal(r[0], undefined); assert.ok(h.notifications.length);
  await h.command('enforce'); r = await h.emit('tool_call', { toolName: 'read', input: { path: 'src/big.ts', offset: 1 } }); assert.equal(r[0].block, true); assert.equal(h.calls.length, 0);
  r = await h.emit('tool_call', { toolName: 'read', input: { path: 'src/big.ts', offset: 1, limit: 1 } }); assert.equal(r[0], undefined);
  r = await h.emit('tool_call', { toolName: 'bash', input: { command: 'cat src/big.ts' } }); assert.equal(r[0], undefined); // Documented non-security boundary.
});
test('user can permit one exact large Read without permitting delegation', async t => {
  const h = await harness(t); put(path.join(h.root, 'src/big.ts'), 'x'.repeat(20000)); await h.command('enforce');
  h.scopes = 'src/big.ts'; await h.command('allow-read');
  const event = { toolName: 'read', input: { path: 'src/big.ts' } };
  assert.equal((await h.emit('tool_call', event))[0], undefined); assert.equal((await h.emit('tool_call', event))[0].block, true); assert.equal(h.status().enabled, false);
});
test('missing registry capability fails clearly without trying another client/provider', async t => {
  const h = await harness(t); delete h.ctx.modelRegistry.streamSimple; await h.command('enable'); assert.equal(h.status().enabled, false); assert.match(h.notifications.at(-1)[0], /PI_CAPABILITY/);
});
test('installer leaves core clean; optional dry-run is empty and opt-in is reversible', t => {
  const root = fixture(t), target = path.join(root, 'project');
  assert.equal(runInstaller(root, ['init', '--target', target]).code, 0); assert.ok(!fs.existsSync(path.join(target, '.pi/extensions')));
  assert.equal(runInstaller(root, ['context-tools', '--target', target, '--dry-run']).code, 0); assert.ok(!fs.existsSync(path.join(target, '.pi/extensions')));
  const r = runInstaller(root, ['context-tools', '--target', target]); assert.equal(r.code, 0, r.err); assert.ok(fs.existsSync(path.join(target, '.pi/extensions/pi-context-tools/index.ts')));
  const saved = JSON.parse(fs.readFileSync(path.join(target, '.pi/context-tools.json'))); assert.equal(saved.guard.mode, 'warn'); assert.equal(saved.worker.provider, undefined);
  saved.guard.mode = 'off'; put(path.join(target, '.pi/context-tools.json'), JSON.stringify(saved));
  assert.equal(runInstaller(root, ['context-tools', '--target', target, '--force']).code, 0); assert.equal(JSON.parse(fs.readFileSync(path.join(target, '.pi/context-tools.json'))).guard.mode, 'off');
});
function evalRow(runId, variant, accepted, amount, taskId = 'task', attempt = 1) { return { runId, taskId, variant, attempt, accepted, durationMs: 100, cost: { kind: 'pi-attempt-total', usd: amount }, costBasis: 'catalog-estimate' }; }
test('evaluation uses failed attempts in cost and latest acceptance per task', () => {
  const s = summarizeEvaluation({ schemaVersion: 1, attempts: [evalRow('a', 'delegated', false, 1, 'task', 1), evalRow('b', 'delegated', true, 2, 'task', 2)] });
  assert.equal(s.groups[0].totalCostUsd, 3); assert.equal(s.groups[0].acceptedTasks, 1); assert.equal(s.groups[0].costPerAcceptedTaskUsd, 3); assert.equal(s.matchedTaskSets, false);
});
test('evaluation does not add worker cost to Pi totals or turn unknown/unjudged into zero', () => {
  const bad = evalRow('a', 'delegated', true, 1); bad.cost.workerUsd = 1;
  assert.throws(() => summarizeEvaluation({ schemaVersion: 1, attempts: [bad] }));
  const unknown = summarizeEvaluation({ schemaVersion: 1, attempts: [evalRow('b', 'delegated', null, null)] });
  assert.equal(unknown.groups[0].totalCostUsd, null); assert.equal(unknown.groups[0].acceptanceRate, null); assert.equal(unknown.groups[0].costPerAcceptedTaskUsd, null);
});
test('three-way evaluation accepts disjoint components and checks matched task sets', () => {
  const rows = [evalRow('a', 'full-read', true, 2), evalRow('b', 'targeted-read', true, 1), evalRow('c', 'delegated', true, 1)];
  rows[2].cost = { kind: 'components', parentUsd: 0.7, workerUsd: 0.2, otherUsd: 0.1 };
  const s = summarizeEvaluation({ schemaVersion: 1, attempts: rows }); assert.equal(s.matchedTaskSets, true); assert.ok(Math.abs(s.groups[2].totalCostUsd - 1) < 1e-10);
  assert.throws(() => summarizeEvaluation({ schemaVersion: 1, attempts: [rows[0], rows[0]] }));
});

test('approval cannot carry over if a session changes while the confirmation is open', async t => {
  const h = await harness(t);
  h.ctx.ui.confirm = async () => { await h.emit('session_before_switch'); return true; };
  await h.command('enable'); assert.equal(h.status().enabled, false); assert.equal(h.calls.length, 0); assert.match(h.notifications.at(-1)[0], /SESSION_CHANGED/);
});
test('approved budget is frozen and a later config-file edit cannot increase it', async t => {
  const h = await harness(t, { config: { worker: { maxCallsPerSession: 1 } } }); await h.command('enable');
  put(path.join(h.root, '.pi/context-tools.json'), '{"worker":{"maxCallsPerSession":32}}');
  await h.tool(); assert.equal((await h.tool()).details.outcome, 'CALL_BUDGET'); assert.equal(h.calls.length, 1);
});
test('worker receipt failure occurs before dispatch, and answer-write failure retains billed usage', async t => {
  const root = fixture(t); put(path.join(root, '.agent'), 'not a directory'); let called = false;
  await assert.rejects(() => bulk(root, { invoke: async () => { called = true; return response(); } })); assert.equal(called, false);
  fs.unlinkSync(path.join(root, '.agent'));
  const out = await bulk(root, { invoke: async () => {
    const base = path.join(root, '.agent/tmp/context-tools'), run = fs.readdirSync(base)[0];
    // Force a local answer persistence error, not a provider response error.
    fs.mkdirSync(path.join(base, run, 'answer.json')); return response();
  } });
  assert.equal(out.details.outcome, 'ARTIFACT_ERROR'); assert.equal(out.details.artifactError, true); assert.deepEqual(out.usage, USAGE); assert.equal(out.details.answerPath, null);
});
test('installer restores only the optional addon, without disturbing existing core files', t => {
  const root = fixture(t), target = path.join(root, 'repo');
  assert.equal(runInstaller(root, ['init', '--target', target]).code, 0);
  const before = fs.readFileSync(path.join(target, 'AGENTS.md'));
  const install = runInstaller(root, ['context-tools', '--target', target]); assert.equal(install.code, 0);
  const manifest = install.out.match(/DONE\. Backup\/restore manifest: (.+)/)[1].trim();
  assert.equal(runInstaller(root, ['restore', '--target', target, '--manifest', manifest, '--dry-run']).code, 0);
  assert.ok(fs.existsSync(path.join(target, '.pi/context-tools.json')));
  assert.equal(runInstaller(root, ['restore', '--target', target, '--manifest', manifest]).code, 0);
  assert.ok(!fs.existsSync(path.join(target, '.pi/context-tools.json'))); assert.ok(!fs.existsSync(path.join(target, '.pi/extensions/pi-context-tools/index.ts')));
  assert.deepEqual(fs.readFileSync(path.join(target, 'AGENTS.md')), before);
});
test('authenticated model scope is respected and no fallback escapes it', async t => {
  const h = await harness(t); h.ctx.scopedModels = [{ model: { provider: 'another', id: 'not-authorized' } }];
  await h.command('enable'); assert.equal(h.status().enabled, false); assert.equal(h.calls.length, 0); assert.match(h.notifications.at(-1)[0], /NO_MODEL/);
});
test('provider failures never persist raw error text or credential-bearing endpoint URLs', async t => {
  const root = fixture(t), m = model(); m.baseUrl = 'https://u:PRIVATE_PASS@worker.example.invalid/v1?key=PRIVATE_TOKEN';
  const out = await bulk(root, { model: m, invoke: async () => { throw new Error('PRIVATE_ERROR_BODY source corpus'); } });
  const receipt = fs.readFileSync(path.join(root, out.details.metricsPath), 'utf8');
  for (const secret of ['PRIVATE_PASS', 'PRIVATE_TOKEN', 'PRIVATE_ERROR_BODY', 'source corpus']) assert.ok(!receipt.includes(secret));
  assert.equal(out.details.workerCostUsd, null); assert.equal(out.details.usageKnown, false);
});

test('model identity is rechecked immediately before invocation, not only before local I/O', async t => {
  const h = await harness(t); await h.command('enable');
  const work = h.tool(); h.model.baseUrl = 'https://changed-before-invoke.example.invalid';
  const out = await work; assert.equal(h.calls.length, 0); assert.equal(h.status().enabled, false);
  assert.notEqual(out.details.outcome, 'EVIDENCE_LINKS_CHECKED');
});
