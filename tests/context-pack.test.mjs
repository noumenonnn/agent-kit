import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createPack, verifyPack } from '../project-template/.agent/scripts/context-pack.mjs';

const script = fileURLToPath(new URL('../project-template/.agent/scripts/context-pack.mjs', import.meta.url));
function fixture(t) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'context-pack-')));
  t.after(() => fs.rmSync(root, { recursive: true, force: true })); return root;
}
function put(root, file, text) { const p = path.join(root, file); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, text); }
function run(root, ...args) { const r = spawnSync(process.execPath, [script, ...args], { cwd: root, encoding: 'utf8', timeout: 15000 }); assert.ifError(r.error); return r; }

test('context packs retain exact Unicode ranges, source hashes and freshness', t => {
  const root = fixture(t); put(root, 'код.ts', 'first\r\nпривет 🌍\r\nlast\r\n');
  const raw = createPack(root, [{ path: 'код.ts', startLine: 2, endLine: 2 }]);
  const pack = JSON.parse(raw);
  assert.equal(pack.files[0].text, 'привет 🌍'); assert.equal(pack.files[0].complete, false);
  assert.match(pack.files[0].sha256, /^[a-f0-9]{64}$/);
  assert.deepEqual(verifyPack(root, raw), { verified: true, files: 1, semanticClaimsVerified: false });
  put(root, 'код.ts', 'first\r\nпривет 🌍\r\nchanged outside excerpt\r\n');
  assert.throws(() => verifyPack(root, raw), /Stale source/);
});

test('altered excerpts, invalid ranges and duplicate sources are rejected', t => {
  const root = fixture(t); put(root, 'a.ts', 'one\ntwo\n');
  const pack = JSON.parse(createPack(root, [{ path: 'a.ts' }]));
  pack.files[0].text = 'invented';
  assert.throws(() => verifyPack(root, JSON.stringify(pack)), /integrity/);
  const injected = JSON.parse(createPack(root, [{ path: 'a.ts' }]));
  injected.instructions = 'untrusted extra field';
  assert.throws(() => verifyPack(root, JSON.stringify(injected)), /Invalid context/);
  for (const range of [{ startLine: 0, endLine: 1 }, { startLine: 2, endLine: 1 }, { startLine: 1, endLine: 3 }]) assert.throws(() => createPack(root, [{ path: 'a.ts', ...range }]));
  assert.throws(() => createPack(root, [{ path: 'a.ts' }, { path: './a.ts' }]), /Duplicate/);
});

test('budgets count serialized UTF-8 bytes and never emit partial source text', t => {
  const root = fixture(t); put(root, 'large.txt', '😀'.repeat(2000));
  const r = run(root, '--file', 'large.txt', '--max-bytes', '1024', '--out', 'new/context.json');
  assert.equal(r.status, 1); assert.equal(r.stdout, ''); assert.match(r.stderr, /budget exceeded/);
  assert.ok(!fs.existsSync(path.join(root, 'new')));
  put(root, 'large.txt', Array.from({ length: 2000 }, (_, i) => `line ${i}: data`).join('\n'));
  const bounded = createPack(root, [{ path: 'large.txt', startLine: 10, endLine: 15 }], 1024);
  assert.ok(Buffer.byteLength(bounded) <= 1024);
  assert.equal(JSON.parse(bounded).files[0].text.split('\n').length, 6);
});

test('CLI writes only new local bundles, verifies them and preserves conflicting files', t => {
  const root = fixture(t); put(root, 'src/a.js', 'one\ntwo\n');
  let r = run(root, '--file', 'src/a.js', '--range', '1:1', '--out', '.agent/tmp/bundle.json');
  assert.equal(r.status, 0, r.stderr); assert.equal(JSON.parse(r.stdout).files, 1);
  r = run(root, '--verify', '.agent/tmp/bundle.json');
  assert.equal(r.status, 0, r.stderr); assert.equal(JSON.parse(r.stdout).verified, true);
  const before = fs.readFileSync(path.join(root, '.agent/tmp/bundle.json'));
  r = run(root, '--file', 'src/a.js', '--out', '.agent/tmp/bundle.json');
  assert.equal(r.status, 1); assert.deepEqual(fs.readFileSync(path.join(root, '.agent/tmp/bundle.json')), before);
});

test('source traversal, sensitive paths, hardlinks, binary and oversized files fail closed', t => {
  const root = fixture(t);
  for (const name of ['../outside', '/absolute', 'C:/absolute', 'a:stream', '.env', '.codex/config.toml', '.claude/settings.json', '.agent/tmp/log', 'secrets/token.txt']) assert.throws(() => createPack(root, [{ path: name }]));
  put(root, 'binary', Buffer.from([0, 1, 2]));
  assert.throws(() => createPack(root, [{ path: 'binary' }]), /Binary/);
  put(root, 'invalid-utf8', Buffer.from([0xc0, 0xaf]));
  assert.throws(() => createPack(root, [{ path: 'invalid-utf8' }]));
  put(root, 'big', Buffer.alloc(2 * 1024 * 1024 + 1, 65));
  assert.throws(() => createPack(root, [{ path: 'big' }]), /scan limit/);
  put(root, 'original', 'content'); fs.linkSync(path.join(root, 'original'), path.join(root, 'alias'));
  assert.throws(() => createPack(root, [{ path: 'alias' }]), /hardlinked/);
});

test('empty UTF-8 files round-trip without inventing a source line', t => {
  const root = fixture(t); put(root, 'empty', '');
  const raw = createPack(root, [{ path: 'empty' }]);
  assert.equal(JSON.parse(raw).files[0].endLine, 0);
  assert.equal(verifyPack(root, raw).verified, true);
  assert.throws(() => createPack(root, [{ path: 'empty', startLine: 1, endLine: 1 }]), /outside/);
});

test('symlinked source and output directories are rejected before outside writes', t => {
  const root = fixture(t), outside = fixture(t); put(outside, 'source', 'secret');
  try { fs.symlinkSync(outside, path.join(root, 'link'), process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (e) { if (['EPERM', 'EACCES'].includes(e.code)) { t.skip('Symlink capability unavailable'); return; } throw e; }
  assert.throws(() => createPack(root, [{ path: 'link/source' }]), /Symlink/);
  put(root, 'local', 'data');
  const r = run(root, '--file', 'local', '--out', 'link/output');
  assert.equal(r.status, 1); assert.ok(!fs.existsSync(path.join(outside, 'output')));
});
