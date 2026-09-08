import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const kit = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = path.join(kit, 'scripts/agent-kit.mjs');
function fixture(t) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'agent-kit-')));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}
function run(root, ...args) {
  const result = spawnSync(process.execPath, [cli, ...args], { cwd: root, encoding: 'utf8', timeout: 15000 });
  assert.ifError(result.error);
  return { code: result.status, out: result.stdout, err: result.stderr };
}
function put(root, name, text) { const file = path.join(root, name); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); }
function read(root, name) { return fs.readFileSync(path.join(root, name), 'utf8'); }

test('universal dry-run describes all adapters without creating the target', t => {
  const root = fixture(t), target = path.join(root, 'new project');
  const r = run(root, 'setup', target, '--agents', 'all', '--dry-run');
  assert.equal(r.code, 0, r.err); assert.match(r.out, /pi, codex, claude, opencode/);
  assert.equal(fs.existsSync(target), false);
});

test('all-agent setup preserves user instructions/settings and is idempotent', t => {
  const root = fixture(t);
  put(root, 'AGENTS.md', '# Team\r\nKeep our rules.\r\n');
  put(root, 'CLAUDE.md', '# Claude team\n');
  put(root, '.pi/settings.json', '{"theme":"custom","compaction":{"enabled":false}}');
  put(root, '.codex/config.toml', 'model = "user-choice"\n');
  put(root, 'opencode.json', '{"model":"user/model"}');
  const first = run(root, 'setup', '--agents', 'all');
  assert.equal(first.code, 0, first.err);
  assert.ok(read(root, 'AGENTS.md').startsWith('# Team\r\nKeep our rules.\r\n'));
  assert.ok(read(root, 'CLAUDE.md').startsWith('# Claude team\n'));
  assert.equal(read(root, '.pi/settings.json'), '{"theme":"custom","compaction":{"enabled":false}}');
  assert.equal(read(root, '.codex/config.toml'), 'model = "user-choice"\n');
  assert.equal(read(root, 'opencode.json'), '{"model":"user/model"}');
  for (const file of ['.agents/skills/efficient-task/SKILL.md', '.claude/skills/efficient-task/SKILL.md', '.opencode/commands/efficient-task.md', '.pi/prompts/efficient-task.md', '.agent/scripts/context-pack.mjs']) assert.ok(fs.existsSync(path.join(root, file)), file);
  assert.ok(!fs.existsSync(path.join(root, '.pi/extensions')));
  const before = fs.readdirSync(path.join(root, '.pi-starter-backups'));
  assert.equal(run(root, 'setup', '--agents', 'all').code, 0);
  assert.deepEqual(fs.readdirSync(path.join(root, '.pi-starter-backups')), before);
});

test('single agent installs only its adapter, adding Pi keeps existing agents', t => {
  const root = fixture(t);
  assert.equal(run(root, 'setup', '--agents', 'codex').code, 0);
  assert.ok(!fs.existsSync(path.join(root, '.pi')));
  assert.ok(!fs.existsSync(path.join(root, '.claude')));
  assert.equal(run(root, 'setup', '--agents', 'pi').code, 0);
  assert.deepEqual(JSON.parse(read(root, '.agent/kit.json')).agents, ['pi', 'codex']);
  assert.ok(fs.existsSync(path.join(root, '.pi/prompts/efficient-task.md')));
});

test('setup uses active AGENTS.override.md and refuses malformed markers before writes', t => {
  const root = fixture(t);
  put(root, 'AGENTS.override.md', '# Override\n');
  assert.equal(run(root, 'setup', '--agents', 'codex').code, 0);
  assert.match(read(root, 'AGENTS.override.md'), /AGENT-KIT:BEGIN/);
  const other = path.join(root, 'bad'); fs.mkdirSync(other);
  put(other, 'AGENTS.md', '<!-- AGENT-KIT:BEGIN -->\nbroken');
  const r = run(other, 'setup');
  assert.equal(r.code, 1); assert.match(r.err, /markers/);
  assert.ok(!fs.existsSync(path.join(other, '.agent')));
});

test('setup plus Pi context-tools is explicit and one reversible transaction', t => {
  const root = fixture(t);
  put(root, 'AGENTS.md', 'Original\r\n');
  const r = run(root, 'setup', '--agents', 'all', '--with-context-tools');
  assert.equal(r.code, 0, r.err);
  assert.ok(fs.existsSync(path.join(root, '.pi/extensions/pi-context-tools/index.ts')));
  assert.equal(JSON.parse(read(root, '.pi/context-tools.json')).guard.mode, 'warn');
  const manifests = fs.readdirSync(path.join(root, '.pi-starter-backups'));
  assert.equal(manifests.length, 1);
  const restored = run(root, 'restore', '--manifest', path.join(root, '.pi-starter-backups', manifests[0], 'manifest.json'));
  assert.equal(restored.code, 0, restored.err);
  assert.equal(read(root, 'AGENTS.md'), 'Original\r\n');
  assert.ok(!fs.existsSync(path.join(root, '.agent/kit.json')));
});

test('doctor reports missing or changed installed artifacts and JSON has no prose', t => {
  const root = fixture(t);
  assert.equal(run(root, 'setup', '--agents', 'all').code, 0);
  let r = run(root, 'doctor', '--json');
  assert.equal(r.code, 0, r.err); assert.equal(JSON.parse(r.out).runtimeVerified, false);
  fs.unlinkSync(path.join(root, '.agents/skills/efficient-task/SKILL.md'));
  r = run(root, 'doctor', '--json');
  assert.equal(r.code, 1); assert.ok(JSON.parse(r.out).findings.some(f => f.level === 'ERROR' && /efficient-task/.test(f.message)));
});

test('setup rejects invalid choices and wizard fails clearly without a terminal', t => {
  const root = fixture(t);
  for (const args of [['setup', '--agents', 'unknown'], ['setup', '--agents', 'codex', '--with-context-tools'], ['wizard']]) {
    const r = run(root, ...args); assert.equal(r.code, 1, JSON.stringify(args));
  }
  assert.deepEqual(fs.readdirSync(root), []);
});

test('OpenCode gets AGENTS.md even when Pi and Codex use an override', t => {
  const root = fixture(t); put(root, 'AGENTS.override.md', '# Team override\n');
  assert.equal(run(root, 'setup', '--agents', 'all').code, 0);
  assert.match(read(root, 'AGENTS.md'), /AGENT-KIT:BEGIN/);
  assert.match(read(root, 'AGENTS.override.md'), /AGENT-KIT:BEGIN/);
  assert.equal(run(root, 'doctor', '--json').code, 0);
  put(root, 'AGENTS.override.md', '# Newly replaced rules\n');
  assert.equal(run(root, 'doctor', '--json').code, 1);
});

test('doctor catches divergent Claude copies; force preserves surrounding rules and context', t => {
  const root = fixture(t);
  put(root, 'CONTEXT.md', 'Our domain'); put(root, '.agent/references/conventions.md', 'Our commands');
  assert.equal(run(root, 'setup', '--agents', 'all').code, 0);
  put(root, '.claude/skills/efficient-task/SKILL.md', 'custom skill');
  let r = run(root, 'doctor', '--json');
  assert.equal(r.code, 1); assert.ok(JSON.parse(r.out).findings.some(f => /copies differ/.test(f.message)));
  const policy = read(root, 'AGENTS.md'); put(root, 'AGENTS.md', '# Before\n' + policy + '\n# After');
  assert.equal(run(root, 'setup', '--agents', 'all', '--force').code, 0);
  assert.ok(read(root, 'AGENTS.md').startsWith('# Before\n')); assert.ok(read(root, 'AGENTS.md').endsWith('\n# After'));
  assert.equal(read(root, 'CONTEXT.md'), 'Our domain');
  assert.equal(read(root, '.agent/references/conventions.md'), 'Our commands');
  assert.equal(run(root, 'doctor', '--json').code, 0);
});

test('declared project commands are suggested without executing scripts', t => {
  const root = fixture(t);
  put(root, 'package.json', JSON.stringify({ scripts: { test: 'touch SENTINEL', build: 'touch SENTINEL', postinstall: 'touch SENTINEL' } }));
  put(root, 'pnpm-lock.yaml', 'lockfileVersion: 9.0\n');
  assert.equal(run(root, 'setup').code, 0);
  assert.match(read(root, '.agent/references/conventions.md'), /pnpm run test/);
  assert.ok(!fs.existsSync(path.join(root, 'SENTINEL')));
});
