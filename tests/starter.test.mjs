import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { parseStatus } from '../project-template/.agent/scripts/diff-summary.mjs';

const KIT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const installer = path.join(KIT, 'scripts/kit.mjs');
const runner = path.join(KIT, 'project-template/.agent/scripts/compact-run.mjs');
const diff = path.join(KIT, 'project-template/.agent/scripts/diff-summary.mjs');
function fixture(t) {
  const d = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'pi-kit test-')));
  t.after(() => fs.rmSync(d, { recursive: true, force: true }));
  return d;
}
function run(script, args, cwd, extra = {}) {
  try { return { status: 0, out: execFileSync(process.execPath, [script, ...args], { cwd, encoding: 'utf8', timeout: 15000, maxBuffer: 2 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'], ...extra }), err: '' }; }
  catch (e) { if (e.status === null || e.status === undefined) throw e; return { status: e.status, out: e.stdout?.toString() || '', err: e.stderr?.toString() || '' }; }
}
function put(file, content) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, content); }
function git(cwd, ...args) { return execFileSync('git', ['-c', 'core.fsmonitor=false', '-c', 'commit.gpgsign=false', ...args], { cwd, encoding: 'utf8', timeout: 10000, stdio: ['ignore', 'pipe', 'pipe'] }).trim(); }
function repo(dir) { git(dir, 'init', '-q'); git(dir, 'config', 'user.name', 'Fixture'); git(dir, 'config', 'user.email', 'fixture@example.invalid'); }
function commit(dir) { git(dir, 'add', '.'); git(dir, 'commit', '-qm', 'fixture'); return git(dir, 'rev-parse', 'HEAD'); }
function receipts(root) { const d = path.join(root, '.pi-starter-backups'); return fs.existsSync(d) ? fs.readdirSync(d).map(n => path.join(d, n, 'manifest.json')) : []; }
function result(cwd) {
  const base = path.join(cwd, '.agent/tmp');
  const dirs = fs.readdirSync(base).filter(n => n.startsWith('run-'));
  assert.equal(dirs.length, 1);
  return JSON.parse(fs.readFileSync(path.join(base, dirs[0], 'result.json'), 'utf8'));
}
function canLink(t, target, link, type = 'dir') {
  try { fs.symlinkSync(target, link, type); return true; }
  catch (e) { if (['EPERM', 'EACCES', 'ENOSYS'].includes(e.code)) { t.skip('Symlink capability unavailable on this platform'); return false; } throw e; }
}

test('dry-run creates no files or directories', t => {
  const d = fixture(t), target = path.join(d, 'new');
  const r = run(installer, ['init', '--target', target, '--dry-run'], d);
  assert.equal(r.status, 0, r.err); assert.ok(!fs.existsSync(target));
});
test('relative targets and spaces resolve before copying, with flags in either order', t => {
  const d = fixture(t), r = run(installer, ['init', '--force', 'project with spaces'], d);
  assert.equal(r.status, 0, r.err); assert.ok(fs.existsSync(path.join(d, 'project with spaces/AGENTS.md')));
});
test('existing project files are preserved; .gitignore is merged and effective', t => {
  const d = fixture(t); repo(d); put(path.join(d, 'AGENTS.md'), 'user instructions'); put(path.join(d, '.gitignore'), 'custom/\n');
  const r = run(installer, ['init', '--target', d], d);
  assert.equal(r.status, 0, r.err); assert.equal(fs.readFileSync(path.join(d, 'AGENTS.md'), 'utf8'), 'user instructions');
  for (const f of ['.agent/tmp/check.log', '.agent/handoffs/latest.md', '.pi-starter-backups/run/manifest.json']) assert.equal(git(d, 'check-ignore', f), f);
  assert.match(fs.readFileSync(path.join(d, '.gitignore'), 'utf8'), /^custom\//);
});
test('repeated init is idempotent including ignore rules and receipts', t => {
  const d = fixture(t);
  assert.equal(run(installer, ['init', '--target', d], d).status, 0);
  const before = receipts(d).length, ignores = fs.readFileSync(path.join(d, '.gitignore'), 'utf8');
  assert.equal(run(installer, ['init', '--target', d], d).status, 0);
  assert.equal(receipts(d).length, before); assert.equal(fs.readFileSync(path.join(d, '.gitignore'), 'utf8'), ignores);
});
test('force creates byte-exact backups and reversible changes, retaining unrelated files', t => {
  const d = fixture(t); put(path.join(d, 'AGENTS.md'), 'original\r\n'); put(path.join(d, '.agent/custom.txt'), 'keep');
  const r = run(installer, ['init', '--target', d, '--force'], d); assert.equal(r.status, 0, r.err);
  const manifest = receipts(d)[0];
  assert.equal(fs.readFileSync(path.join(path.dirname(manifest), 'files/AGENTS.md'), 'utf8'), 'original\r\n');
  const restored = run(installer, ['restore', '--target', d, '--manifest', manifest], d);
  assert.equal(restored.status, 0, restored.err); assert.equal(fs.readFileSync(path.join(d, 'AGENTS.md'), 'utf8'), 'original\r\n');
  assert.equal(fs.readFileSync(path.join(d, '.agent/custom.txt'), 'utf8'), 'keep');
  assert.ok(!fs.existsSync(path.join(d, '.pi/prompts/efficient-task.md')));
});
test('restore refuses later user edits without partially reverting other files', t => {
  const d = fixture(t); assert.equal(run(installer, ['init', '--target', d], d).status, 0);
  put(path.join(d, 'AGENTS.md'), 'later user work');
  const r = run(installer, ['restore', '--target', d, '--manifest', receipts(d)[0]], d);
  assert.equal(r.status, 1); assert.match(r.err, /later edits/); assert.equal(fs.readFileSync(path.join(d, 'AGENTS.md'), 'utf8'), 'later user work');
  assert.ok(fs.existsSync(path.join(d, '.pi/prompts/efficient-task.md')));
});
test('global core defaults keep compaction and respect PI_CODING_AGENT_DIR', t => {
  const d = fixture(t), home = path.join(d, 'custom-pi');
  const r = run(installer, ['global'], d, { env: { ...process.env, PI_CODING_AGENT_DIR: home } });
  assert.equal(r.status, 0, r.err);
  const settings = JSON.parse(fs.readFileSync(path.join(home, 'settings.json')));
  assert.equal(settings.compaction.enabled, true); assert.equal(settings.defaultProjectTrust, 'ask'); assert.equal(settings.packages, undefined);
});
test('global updates never delete custom skill extras, even with force', t => {
  const d = fixture(t); put(path.join(d, 'skills/context-efficiency/SKILL.md'), 'user skill'); put(path.join(d, 'skills/context-efficiency/custom.txt'), 'keep');
  assert.equal(run(installer, ['global', '--pi-home', d], d).status, 0);
  assert.equal(fs.readFileSync(path.join(d, 'skills/context-efficiency/SKILL.md'), 'utf8'), 'user skill');
  assert.equal(run(installer, ['global', '--pi-home', d, '--force'], d).status, 0);
  assert.match(fs.readFileSync(path.join(d, 'skills/context-efficiency/SKILL.md'), 'utf8'), /Context Efficiency/);
  assert.equal(fs.readFileSync(path.join(d, 'skills/context-efficiency/custom.txt'), 'utf8'), 'keep');
});
test('existing settings stay byte-identical until explicit deep merge with backup', t => {
  const d = fixture(t), text = '{"theme":"custom","compaction":{"enabled":false,"keepRecentTokens":12345},"custom":{"x":1}}';
  put(path.join(d, 'settings.json'), text);
  assert.equal(run(installer, ['global', '--pi-home', d, '--force'], d).status, 0);
  assert.equal(fs.readFileSync(path.join(d, 'settings.json'), 'utf8'), text);
  const r = run(installer, ['global', '--pi-home', d, '--apply-settings'], d); assert.equal(r.status, 0, r.err);
  const settings = JSON.parse(fs.readFileSync(path.join(d, 'settings.json')));
  assert.equal(settings.compaction.enabled, true); assert.equal(settings.compaction.keepRecentTokens, 12345); assert.equal(settings.theme, 'custom'); assert.deepEqual(settings.custom, { x: 1 });
});
test('AGENTS managed block updates without changing surrounding user instructions', t => {
  const d = fixture(t), before = 'PREFIX\n<!-- PI-TOKEN-STARTER:BEGIN -->\nold policy\n<!-- PI-TOKEN-STARTER:END -->\nSUFFIX';
  put(path.join(d, 'AGENTS.md'), before);
  assert.equal(run(installer, ['global', '--pi-home', d], d).status, 0);
  assert.equal(fs.readFileSync(path.join(d, 'AGENTS.md'), 'utf8'), before);
  assert.equal(run(installer, ['global', '--pi-home', d, '--force'], d).status, 0);
  const after = fs.readFileSync(path.join(d, 'AGENTS.md'), 'utf8');
  assert.ok(after.startsWith('PREFIX\n')); assert.ok(after.endsWith('\nSUFFIX')); assert.ok(!after.includes('old policy'));
});
test('malformed managed markers fail before any installation changes', t => {
  const d = fixture(t); put(path.join(d, 'AGENTS.md'), '<!-- PI-TOKEN-STARTER:BEGIN -->\nbroken');
  const r = run(installer, ['global', '--pi-home', d, '--force'], d); assert.equal(r.status, 1); assert.ok(!fs.existsSync(path.join(d, 'skills')));
});
test('agenticoding compaction change requires explicit acknowledgement and pin', t => {
  const d = fixture(t); put(path.join(d, 'settings.json'), '{"packages":["npm:pi-agenticoding@0.5.0"],"compaction":{"enabled":true}}');
  let r = run(installer, ['global', '--pi-home', d, '--profile', 'agenticoding', '--apply-settings'], d); assert.equal(r.status, 1);
  r = run(installer, ['global', '--pi-home', d, '--profile', 'agenticoding', '--apply-settings', '--ack-agenticoding'], d); assert.equal(r.status, 0, r.err);
  assert.equal(JSON.parse(fs.readFileSync(path.join(d, 'settings.json'))).compaction.enabled, false);
});
test('a disabled extension entry does not authorize disabling auto-compaction', t => {
  const d = fixture(t); put(path.join(d, 'settings.json'), JSON.stringify({ packages: [{ source: 'npm:pi-agenticoding@0.5.0', extensions: [] }] }));
  const r = run(installer, ['global', '--pi-home', d, '--profile', 'agenticoding', '--apply-settings', '--ack-agenticoding'], d); assert.equal(r.status, 1);
});
test('unknown flags and targets inside the kit are rejected', t => {
  const d = fixture(t); assert.equal(run(installer, ['init', '--unknown'], d).status, 1);
  assert.equal(run(installer, ['init', '--target', KIT], d).status, 1);
});
test('installer refuses a symlinked target subtree before writing outside it', t => {
  const d = fixture(t), target = path.join(d, 'target'), external = path.join(d, 'outside'); fs.mkdirSync(target); fs.mkdirSync(external);
  if (!canLink(t, external, path.join(target, '.agent'))) return;
  assert.equal(run(installer, ['init', '--target', target, '--force'], d).status, 1); assert.deepEqual(fs.readdirSync(external), []);
});
test('installer refuses an existing installation lock', t => {
  const d = fixture(t); put(path.join(d, '.pi-starter-install.lock'), 'other process');
  assert.equal(run(installer, ['init', '--target', d], d).status, 1); assert.ok(!fs.existsSync(path.join(d, 'AGENTS.md')));
});
test('Matt installer requires full immutable commit, not latest', t => {
  const d = fixture(t); assert.equal(run(installer, ['matt', '--source', d, '--ref', 'main', '--target', path.join(d, 'target')], d).status, 1);
  assert.ok(!fs.existsSync(path.join(d, 'target')));
});
test('Matt installer copies committed blobs, preserves license, never executes scripts', t => {
  const d = fixture(t), source = path.join(d, 'source'), target = path.join(d, 'target'); fs.mkdirSync(source); repo(source);
  const names = ['setup-matt-pocock-skills', 'tdd', 'diagnosing-bugs', 'codebase-design', 'code-review', 'domain-modeling', 'writing-for-agents'];
  for (const n of names) put(path.join(source, `skills/engineering/${n}/SKILL.md`), `---\nname: ${n}\ndescription: Fixture\n---\ncommitted`);
  put(path.join(source, 'LICENSE'), 'Fixture license'); put(path.join(source, 'skills/engineering/tdd/scripts/never-run.mjs'), "throw new Error('NEVER EXECUTE')");
  const sha = commit(source); put(path.join(source, 'skills/engineering/tdd/SKILL.md'), 'uncommitted replacement');
  const r = run(installer, ['matt', '--source', source, '--ref', sha, '--target', target], d);
  assert.equal(r.status, 0, r.err); assert.match(fs.readFileSync(path.join(target, '.pi/skills/tdd/SKILL.md'), 'utf8'), /committed$/);
  assert.equal(fs.readFileSync(path.join(target, '.pi/skills/tdd/UPSTREAM-LICENSE'), 'utf8'), 'Fixture license');
  assert.equal(JSON.parse(fs.readFileSync(path.join(target, '.pi/matt-pocock-source.json'))).commit, sha);
});
test('compact runner returns real exit code and preserves stderr context', t => {
  const d = fixture(t), r = run(runner, ['--', process.execPath, '-e', "console.error('before');console.error('ERROR bad');console.error('after');process.exitCode=7"], d);
  assert.equal(r.status, 7); assert.match(r.out, /before/); assert.match(r.out, /ERROR bad/); assert.match(r.out, /after/);
  const data = result(d); assert.equal(data.status, 'ERROR'); assert.equal(data.exitCode, 7); assert.equal(data.logTruncated, false);
});
test('exit zero is labelled process OK, not fabricated test PASS', t => {
  const d = fixture(t), r = run(runner, ['--', process.execPath, '-e', "console.log('0 tests discovered')"], d);
  assert.equal(r.status, 0); assert.match(r.out, /OK means process exit 0/); assert.doesNotMatch(r.out, /^PASS/m);
  assert.equal(result(d).stdoutLines, 1);
});
test('long unbroken output is byte-bounded; log cap is explicit and result is accurate', t => {
  const d = fixture(t), size = 4 * 1024 * 1024;
  const r = run(runner, ['--max-output-bytes', '2048', '--max-log-bytes', '32768', '--', process.execPath, '-e', `process.stdout.write('x'.repeat(${size}))`], d);
  assert.equal(r.status, 0, r.err); assert.ok(Buffer.byteLength(r.out) <= 2048);
  const data = result(d); assert.equal(data.bytesSeen, size); assert.equal(data.bytesSaved, 32768); assert.equal(data.logTruncated, true);
  assert.equal(fs.statSync(path.join(d, data.logPath)).size, 32768); assert.match(r.out, /LOG CAPPED/);
});
test('runner writes complete below-cap logs without truncation from process.exit', t => {
  const d = fixture(t), size = 200000;
  const r = run(runner, ['--', process.execPath, '-e', `process.stdout.write('z'.repeat(${size}))`], d);
  assert.equal(r.status, 0); const data = result(d); assert.equal(data.bytesSeen, size); assert.equal(data.bytesSaved, size); assert.equal(data.logTruncated, false);
});
test('runner supports split multibyte UTF-8 and strips terminal control sequences', t => {
  const d = fixture(t), source = "const b=Buffer.from('Привет 🌍'); for (const x of b) process.stdout.write(Buffer.from([x]));process.stdout.write('\\n\\x1b[31mERROR red\\x1b[0m\\n')";
  const r = run(runner, ['--', process.execPath, '-e', source], d); assert.equal(r.status, 0); assert.match(r.out, /Привет 🌍/); assert.match(r.out, /ERROR red/); assert.ok(!r.out.includes('\x1b'));
});
test('runner never echoes command arguments and never adds an implicit shell', t => {
  const d = fixture(t), marker = 'PRIVATE_ARG_12345';
  const r = run(runner, ['--', process.execPath, '-e', 'process.exitCode=0', marker + '&echo INJECTED'], d);
  assert.equal(r.status, 0, r.err); assert.ok(!r.out.includes(marker)); assert.ok(!JSON.stringify(result(d)).includes(marker)); assert.ok(!r.out.includes('INJECTED'));
});
test('missing executable returns 127 and records spawn error', t => {
  const d = fixture(t), r = run(runner, ['--', 'pi-kit-nonexistent-command-zz'], d);
  assert.equal(r.status, 127); assert.equal(result(d).spawnErrorCode, 'ENOENT');
});
test('timeouts terminate finite-check process and return 124', t => {
  const d = fixture(t), start = Date.now();
  const r = run(runner, ['--timeout-ms', '150', '--', process.execPath, '-e', 'setInterval(()=>{},1000)'], d);
  assert.equal(r.status, 124); assert.equal(result(d).status, 'TIMEOUT'); assert.ok(Date.now() - start < 10000);
});
test('SIGINT returns 130 instead of an arbitrary failure', { skip: process.platform === 'win32', timeout: 12000 }, async t => {
  const d = fixture(t);
  const child = spawn(process.execPath, [runner, '--', process.execPath, '-e', "console.log('ready');setInterval(()=>{},1000)"], { cwd: d, stdio: ['ignore', 'pipe', 'pipe'] });
  let out = ''; child.stdout.on('data', b => { out += b; }); child.stderr.resume();
  t.after(() => { if (child.exitCode === null) child.kill('SIGTERM'); });
  const wait = new Promise(resolve => child.once('close', resolve));
  for (let i = 0; i < 100; i++) {
    const base = path.join(d, '.agent/tmp');
    if (fs.existsSync(base)) {
      const names = fs.readdirSync(base);
      if (names.length && fs.readFileSync(path.join(base, names[0], 'output.log'), 'utf8').includes('ready')) break;
    }
    await delay(30);
  }
  child.kill('SIGINT'); assert.equal(await wait, 130); assert.match(out, /INTERRUPTED/);
});
test('log path refuses symlink escape', t => {
  const d = fixture(t), external = path.join(d, 'outside'); fs.mkdirSync(external);
  if (!canLink(t, external, path.join(d, '.agent'))) return;
  const r = run(runner, ['--', process.execPath, '-e', '0'], d); assert.equal(r.status, 2); assert.deepEqual(fs.readdirSync(external), []);
});
test('invalid runner options fail before creating logs', t => {
  const d = fixture(t); assert.equal(run(runner, ['--timeout-ms', '0', '--', process.execPath, '-e', '0'], d).status, 2); assert.ok(!fs.existsSync(path.join(d, '.agent')));
});
test('porcelain parser handles rename order, spaces, Unicode and embedded newlines', () => {
  assert.deepEqual(parseStatus('R  new name\0old\nname\0?? Привет.txt\0 M changed\0'), [{ status: 'R ', path: 'new name', from: 'old\nname' }, { status: '??', path: 'Привет.txt' }, { status: ' M', path: 'changed' }]);
});
test('diff includes staged, unstaged and untracked paths; --no-log writes nothing', t => {
  const d = fixture(t); repo(d); put(path.join(d, 'tracked.txt'), 'old\n'); commit(d); put(path.join(d, 'tracked.txt'), 'new\n'); put(path.join(d, 'fresh.txt'), 'fresh'); put(path.join(d, 'stage.txt'), 'stage'); git(d, 'add', 'stage.txt');
  const r = run(diff, ['--no-log'], d); assert.equal(r.status, 0, r.err); assert.match(r.out, /CHANGED PATHS: 3/); assert.match(r.out, /untracked: 1/); assert.match(r.out, /fresh.txt/); assert.ok(!fs.existsSync(path.join(d, '.agent')));
});
test('diff default report retains all paths while terminal file list is bounded', t => {
  const d = fixture(t); repo(d); for (let i = 0; i < 100; i++) put(path.join(d, `file-${i}.txt`), 'x');
  const r = run(diff, ['--max-files', '2', '--max-output-bytes', '1024'], d); assert.equal(r.status, 0, r.err); assert.ok(Buffer.byteLength(r.out) <= 1024); assert.match(r.out, /CHANGED PATHS: 100/);
  const base = path.join(d, '.agent/tmp'), folder = fs.readdirSync(base)[0];
  const data = JSON.parse(fs.readFileSync(path.join(base, folder, 'report.json'))); assert.equal(data.entries.length, 100);
});
test('diff --base includes committed branch changes relative to merge base', t => {
  const d = fixture(t); repo(d); put(path.join(d, 'base.txt'), 'base'); const base = commit(d); put(path.join(d, 'feature.txt'), 'feature'); commit(d);
  const r = run(diff, ['--base', base, '--no-log'], d); assert.equal(r.status, 0, r.err); assert.match(r.out, /committed vs base: 1/); assert.match(r.out, /feature.txt/);
});
test('diff handles staged rename and does not run an external diff driver', t => {
  const d = fixture(t); repo(d); put(path.join(d, 'old.txt'), 'same content'); commit(d); git(d, 'mv', 'old.txt', 'new name.txt'); git(d, 'config', 'diff.external', 'pi-kit-must-not-run');
  const r = run(diff, ['--no-log'], d); assert.equal(r.status, 0, r.err); assert.match(r.out, /CHANGED PATHS: 1/); assert.match(r.out, /new name.txt/); assert.match(r.out, /old.txt/);
});
test('diff outside Git fails and does not create a misleading report', t => {
  const d = fixture(t); const r = run(diff, [], d); assert.notEqual(r.status, 0); assert.match(r.err, /No complete summary/); assert.ok(!fs.existsSync(path.join(d, '.agent')));
});
test('platform launcher delegates to the same safe Node installer', t => {
  const d = fixture(t), target = path.join(d, 'wrapper target');
  const executable = process.platform === 'win32' ? 'powershell.exe' : 'bash';
  const args = process.platform === 'win32' ? ['-NoProfile', '-NonInteractive', '-File', path.join(KIT, 'scripts/init-project.ps1'), '-Target', target, '-DryRun'] : [path.join(KIT, 'scripts/init-project.sh'), '--target', target, '--dry-run'];
  let out;
  try { out = execFileSync(executable, args, { cwd: d, encoding: 'utf8', timeout: 15000, stdio: ['ignore', 'pipe', 'pipe'] }); }
  catch (e) {
    if (process.platform === 'win32' && /running scripts is disabled|PSSecurityException/.test(e.stderr?.toString() || '')) {
      t.skip('PowerShell execution policy blocks the legacy wrapper; direct Node CLI is tested separately'); return;
    }
    throw e;
  }
  assert.match(out, /DRY RUN/); assert.ok(!fs.existsSync(target));
});

test('diff script works when its own installation path contains spaces', t => {
  const d = fixture(t), copy = path.join(d, 'tools with spaces');
  fs.cpSync(path.join(KIT, 'project-template/.agent/scripts'), copy, { recursive: true });
  const target = path.join(d, 'repo'); fs.mkdirSync(target); repo(target); put(path.join(target, 'new.txt'), 'new');
  const r = run(path.join(copy, 'diff-summary.mjs'), ['--no-log'], target); assert.equal(r.status, 0, r.err); assert.match(r.out, /CHANGED PATHS: 1/);
});
test('POSIX timeout also stops descendants that remain in the process group', { skip: process.platform === 'win32', timeout: 15000 }, async t => {
  const d = fixture(t);
  const code = "const {spawn}=require('node:child_process');const c=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'inherit'});console.log('grandchild='+c.pid);setInterval(()=>{},1000)";
  const r = run(runner, ['--timeout-ms', '1000', '--', process.execPath, '-e', code], d);
  assert.equal(r.status, 124);
  const log = fs.readFileSync(path.join(d, result(d).logPath), 'utf8');
  const pid = Number(/grandchild=(\d+)/.exec(log)?.[1]); assert.ok(pid > 0);
  await delay(100);
  try {
    process.kill(pid, 0);
    // Orphaned zombies can await PID 1 reaping in containers, but cannot execute.
    if (process.platform === 'linux') assert.match(fs.readFileSync(`/proc/${pid}/stat`, 'utf8'), /^\d+ \(.+\) Z /);
    else assert.fail('Descendant still present after group termination');
  } catch (e) { if (e.code !== 'ESRCH' && e.code !== 'ENOENT') throw e; }
});
test('doctor checks local configuration without claiming runtime integration', t => {
  const d = fixture(t), project = path.join(d, 'repo'), home = path.join(d, 'pi-home'); fs.mkdirSync(project); repo(project);
  assert.equal(run(installer, ['global', '--pi-home', home], d).status, 0);
  assert.equal(run(installer, ['init', '--target', project], d).status, 0);
  const r = run(path.join(KIT, 'scripts/doctor.mjs'), ['--project', project, '--pi-home', home], d);
  assert.equal(r.status, 0, r.err); assert.match(r.out, /Auto-compaction enabled/); assert.match(r.out, /Fill repository-specific commands/); assert.match(r.out, /NOT tested/);
});
test('diff identifies unresolved merge conflicts and returns nonzero', t => {
  const d = fixture(t); repo(d); put(path.join(d, 'conflict.txt'), 'base\n'); commit(d);
  const originalBranch = git(d, 'symbolic-ref', '--short', 'HEAD'); git(d, 'branch', 'alternate');
  put(path.join(d, 'conflict.txt'), 'first\n'); commit(d); git(d, 'checkout', '-q', 'alternate');
  put(path.join(d, 'conflict.txt'), 'second\n'); commit(d);
  assert.throws(() => git(d, 'merge', '--no-edit', originalBranch));
  const r = run(diff, ['--no-log'], d); assert.equal(r.status, 1); assert.match(r.out, /conflicts: 1/);
});
