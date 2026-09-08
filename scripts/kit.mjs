#!/usr/bin/env node
// Offline, dependency-free installers. Never invokes Pi, npm, npx, or downloaded code.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { atomicWrite, canonicalTarget, safePath } from '../project-template/.agent/scripts/lib/runtime.mjs';
import { universalPlan } from './lib/universal.mjs';

const KIT = fs.realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
const hash = b => createHash('sha256').update(b).digest('hex');
const json = b => JSON.parse(b.toString('utf8').replace(/^\uFEFF/, ''));
const BEGIN = '<!-- PI-TOKEN-STARTER:BEGIN -->', END = '<!-- PI-TOKEN-STARTER:END -->';
const help = `Usage (all local/offline; no third-party execution):
  node scripts/kit.mjs global [--pi-home DIR] [--force] [--dry-run] [--apply-settings]
      [--profile core|agenticoding] [--ack-agenticoding]
  node scripts/kit.mjs init [--target DIR] [--force] [--dry-run]
  node scripts/agent-kit.mjs setup [DIR] [--agents pi|codex|claude|opencode|all]
      [--preset lean|deep] [--with-context-tools] [--force] [--dry-run]
  node scripts/kit.mjs matt --source CHECKOUT --ref FULL_COMMIT_SHA
      [--target DIR] [--preset lean|deep] [--force] [--dry-run]
  node scripts/kit.mjs context-tools --target DIR [--force] [--dry-run]
  node scripts/kit.mjs restore --target DIR --manifest FILE [--dry-run]
Existing files are preserved by default. --force backs up replaced bytes, never deletes extra files.
Existing settings change only with --apply-settings. Read README.md before enabling agenticoding.`;

function parse(argv) {
  const command = argv.shift();
  if (!command || ['-h', '--help'].includes(command)) return { command: 'help' };
  const out = { command, force: false, dryRun: false, applySettings: false, profile: 'core', preset: 'lean' };
  const flags = { '--force': 'force', '--dry-run': 'dryRun', '--apply-settings': 'applySettings', '--ack-agenticoding': 'ackAgenticoding', '--skip-agenticoding': 'skipAgenticoding', '--with-context-tools': 'withContextTools' };
  const values = { '--target': 'target', '--pi-home': 'piHome', '--profile': 'profile', '--source': 'source', '--ref': 'ref', '--preset': 'preset', '--manifest': 'manifest', '--agents': 'agents' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (flags[a]) out[flags[a]] = true;
    else if (values[a]) {
      if (!argv[i + 1] || argv[i + 1].startsWith('--')) throw new Error(`Missing value for ${a}`);
      out[values[a]] = argv[++i];
    } else if (['init', 'setup'].includes(command) && !a.startsWith('-') && !out.target) out.target = a;
    else throw new Error(`Unknown option: ${a}`);
  }
  if (!['init', 'setup', 'global', 'matt', 'context-tools', 'restore'].includes(command)) throw new Error(`Unknown command: ${command}`);
  if (command !== 'setup' && (out.agents || out.withContextTools)) throw new Error('--agents and --with-context-tools require setup');
  if (command === 'setup' && (out.applySettings || out.piHome || out.source || out.ref || out.manifest || out.ackAgenticoding || out.skipAgenticoding || out.profile !== 'core')) throw new Error('setup supports project adapters only; use global for Pi global settings');
  if (!['core', 'agenticoding'].includes(out.profile)) throw new Error('Profile must be core or agenticoding');
  if (!['lean', 'deep'].includes(out.preset)) throw new Error('Preset must be lean or deep');
  return out;
}

function getRoot(opt) {
  const input = opt.command === 'global' ? opt.piHome || process.env.PI_CODING_AGENT_DIR || path.join(os.homedir(), '.pi', 'agent') : opt.target || process.cwd();
  const root = canonicalTarget(input);
  if (root === path.parse(root).root || root === KIT || root.startsWith(KIT + path.sep)) throw new Error('Choose a target outside the starter kit and not the filesystem root');
  if (fs.existsSync(root) && !fs.statSync(root).isDirectory()) throw new Error('Target must be a directory');
  return root;
}

class Plan {
  constructor(root, opt) { this.root = root; this.opt = opt; this.changes = new Map(); this.notes = []; }
  existing(relative) {
    const file = safePath(this.root, relative);
    if (!fs.existsSync(file)) return null;
    if (!fs.statSync(file).isFile()) throw new Error(`Expected regular file: ${relative}`);
    return fs.readFileSync(file);
  }
  add(relative, data, replace = this.opt.force, mode = 0o644) {
    const file = safePath(this.root, relative), before = this.existing(relative), after = Buffer.from(data);
    if (before?.equals(after)) return;
    if (before && !replace) { this.notes.push(`PRESERVED ${relative}`); return; }
    this.changes.set(relative, { relative, file, before, after, mode: before ? fs.statSync(file).mode & 0o777 : mode });
  }
  tree(source, relative = '') {
    for (const e of fs.readdirSync(source, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const src = path.join(source, e.name), dest = path.join(relative, e.name);
      if (e.isSymbolicLink()) throw new Error(`Source symlink refused: ${src}`);
      if (e.isDirectory()) this.tree(src, dest);
      else if (e.isFile()) this.add(dest, fs.readFileSync(src), this.opt.force, fs.statSync(src).mode & 0o777);
      else throw new Error(`Unsupported source file: ${src}`);
    }
  }
  ignore() {
    const snippet = fs.readFileSync(path.join(KIT, 'project-template/.gitignore.pi-agent-snippet'), 'utf8').trim();
    const before = this.existing('.gitignore')?.toString('utf8') || '';
    const known = new Set(before.split(/\r?\n/).map(s => s.trim()));
    const missing = snippet.split('\n').filter(s => s && !s.startsWith('#') && !known.has(s));
    if (missing.length) this.add('.gitignore', before + (before && !before.endsWith('\n') ? '\n' : '') + '\n# Pi starter local artifacts\n' + missing.join('\n') + '\n', true);
  }
}

function merge(base, patch) {
  const result = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (['__proto__', 'constructor', 'prototype'].includes(key)) throw new Error('Unsafe settings key');
    result[key] = value && typeof value === 'object' && !Array.isArray(value)
      ? merge(base?.[key] && typeof base[key] === 'object' && !Array.isArray(base[key]) ? base[key] : {}, value) : value;
  }
  return result;
}

function globalPlan(plan) {
  const { opt } = plan;
  for (const name of fs.readdirSync(path.join(KIT, 'global/skills')).sort()) {
    const dest = safePath(plan.root, `skills/${name}`);
    if (fs.existsSync(dest) && !opt.force) { plan.notes.push(`PRESERVED entire skill skills/${name} (use --force for a backed-up update)`); continue; }
    plan.tree(path.join(KIT, 'global/skills', name), `skills/${name}`);
  }
  const fragment = fs.readFileSync(path.join(KIT, 'global/AGENTS.fragment.md'), 'utf8').trim();
  const existing = plan.existing('AGENTS.md')?.toString('utf8') || '';
  const starts = existing.split(BEGIN).length - 1, ends = existing.split(END).length - 1;
  if (starts !== ends || starts > 1 || (starts === 1 && existing.indexOf(BEGIN) > existing.indexOf(END))) throw new Error('Malformed starter markers in AGENTS.md; repair manually before updating');
  if (starts) {
    const replacement = existing.slice(0, existing.indexOf(BEGIN)) + fragment + existing.slice(existing.indexOf(END) + END.length);
    plan.add('AGENTS.md', replacement, opt.force);
  } else plan.add('AGENTS.md', existing + (existing ? '\n\n' : '') + fragment + '\n', true);

  const raw = plan.existing('settings.json');
  const current = raw ? json(raw) : {};
  if (!current || typeof current !== 'object' || Array.isArray(current)) throw new Error('settings.json must be a JSON object');
  if (opt.profile === 'agenticoding') {
    const pinned = (current.packages || []).some(p => {
      if (typeof p === 'string') return p === 'npm:pi-agenticoding@0.5.0';
      return p?.source === 'npm:pi-agenticoding@0.5.0' && !(Array.isArray(p.extensions) && p.extensions.length === 0);
    });
    if (!opt.ackAgenticoding || !pinned) throw new Error('Agenticoding profile requires --ack-agenticoding and an enabled npm:pi-agenticoding@0.5.0 entry in global settings. Review/install it separately and smoke-test /handoff first.');
    if (raw && !opt.applySettings) throw new Error('Use --apply-settings to explicitly change existing compaction settings');
  }
  const template = opt.profile === 'core' ? 'global/settings.template.json' : 'profiles/agenticoding/settings.template.json';
  if (!raw || opt.applySettings) plan.add('settings.json', JSON.stringify(merge(current, json(fs.readFileSync(path.join(KIT, template)))), null, 2) + '\n', true, 0o600);
  else plan.notes.push('PRESERVED settings.json. Review templates; use --apply-settings to merge managed defaults with backup.');
  if (opt.skipAgenticoding) plan.notes.push('--skip-agenticoding is redundant: this installer never installs external packages.');
}

function mattPlan(plan) {
  const { opt } = plan;
  if (!opt.source || !/^[0-9a-f]{40}$/i.test(opt.ref || '')) throw new Error('Matt install requires --source LOCAL_CHECKOUT and --ref FULL_40_HEX_COMMIT. No @latest or remote code is executed.');
  const source = fs.realpathSync(opt.source);
  const git = args => execFileSync('git', ['--no-optional-locks', '-c', 'core.fsmonitor=false', ...args], { cwd: source, maxBuffer: 8 * 1024 * 1024, timeout: 15000, stdio: ['ignore', 'pipe', 'pipe'] });
  const commit = git(['rev-parse', '--verify', `${opt.ref}^{commit}`]).toString().trim();
  if (commit.toLowerCase() !== opt.ref.toLowerCase()) throw new Error('Reference must be a commit, not a tag object');
  const entries = git(['ls-tree', '-r', '-z', commit, '--', 'skills', 'LICENSE']).toString('utf8').split('\0').filter(Boolean).map(line => {
    const match = /^(\d+) (\w+) ([0-9a-f]+)\t([\s\S]+)$/.exec(line);
    if (!match) throw new Error('Unexpected Git tree format');
    return { mode: match[1], type: match[2], oid: match[3], path: match[4] };
  });
  const blob = e => { if (!['100644', '100755'].includes(e.mode) || e.type !== 'blob') throw new Error(`Only regular Git blobs may be copied: ${e.path}`); return git(['cat-file', 'blob', e.oid]); };
  const catalog = new Map();
  for (const e of entries.filter(e => e.path.endsWith('/SKILL.md'))) {
    const text = blob(e).toString('utf8');
    const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)?.[1] || '';
    const name = /^name:\s*["']?([a-z0-9]+(?:-[a-z0-9]+)*)["']?\s*$/m.exec(fm)?.[1];
    if (!name) throw new Error(`Missing/unsupported skill name in ${e.path}`);
    if (catalog.has(name)) throw new Error(`Duplicate upstream skill name: ${name}`);
    catalog.set(name, path.posix.dirname(e.path));
  }
  const lean = ['setup-matt-pocock-skills', 'tdd', 'diagnosing-bugs', 'codebase-design', 'code-review', 'domain-modeling', 'writing-for-agents'];
  const deep = [...lean, 'ask-matt', 'grill-with-docs', 'triage', 'improve-codebase-architecture', 'to-spec', 'to-tickets', 'implement', 'wayfinder', 'prototype', 'research', 'resolving-merge-conflicts', 'wizard', 'grill-me', 'handoff', 'to-questionnaire', 'wait-what', 'grilling'];
  const selected = opt.preset === 'lean' ? lean : deep;
  const missing = selected.filter(n => !catalog.has(n));
  if (missing.length) throw new Error(`Pinned checkout lacks requested skills: ${missing.join(', ')}. Review its layout; do not silently substitute another revision.`);
  const licenseEntry = entries.find(e => e.path === 'LICENSE');
  if (!licenseEntry) throw new Error('Upstream LICENSE is required');
  const license = blob(licenseEntry), installed = [], preserved = [];
  for (const name of selected) {
    const destination = `.pi/skills/${name}`;
    if (fs.existsSync(safePath(plan.root, destination)) && !opt.force) { plan.notes.push(`PRESERVED ${destination}`); preserved.push(name); continue; }
    const prefix = catalog.get(name) + '/';
    for (const e of entries.filter(e => e.path.startsWith(prefix))) plan.add(destination + '/' + e.path.slice(prefix.length), blob(e), opt.force, e.mode === '100755' ? 0o755 : 0o644);
    plan.add(destination + '/UPSTREAM-LICENSE', license, opt.force);
    installed.push(name);
  }
  if (installed.length) plan.add('.pi/matt-pocock-source.json', JSON.stringify({ schemaVersion: 1, declaredUpstream: 'https://github.com/mattpocock/skills', commit, preset: opt.preset, installed, preserved, note: 'Records this operation only. Preserved skills may be from other revisions. File hashes live in the installation manifest.' }, null, 2) + '\n', true);
  plan.ignore();
}

function apply(plan) {
  const changes = [...plan.changes.values()];
  for (const note of plan.notes) console.log(note);
  console.log(`${plan.opt.dryRun ? 'DRY RUN' : 'PLAN'}: ${changes.length} file changes in ${plan.root}`);
  const listed = plan.opt.command === 'setup' ? changes : changes.slice(0, 40);
  for (const c of listed) console.log(`${c.before ? 'UPDATE' : 'CREATE'} ${c.relative}`);
  if (changes.length > listed.length) console.log(`… ${changes.length - listed.length} more (listed in manifest after apply)`);
  if (plan.opt.dryRun || !changes.length) return;
  fs.mkdirSync(plan.root, { recursive: true });
  const lock = safePath(plan.root, '.pi-starter-install.lock');
  const lockFd = fs.openSync(lock, 'wx', 0o600);
  const runId = new Date().toISOString().replace(/[:.]/g, '-') + '-' + randomUUID().slice(0, 8);
  const backupRoot = safePath(plan.root, `.pi-starter-backups/${runId}`);
  let manifestPath;
  try {
    // Check for edits since planning before touching any destination.
    for (const c of changes) {
      safePath(plan.root, c.relative);
      const now = fs.existsSync(c.file) ? fs.readFileSync(c.file) : null;
      if (hash(now || Buffer.alloc(0)) !== hash(c.before || Buffer.alloc(0)) || Boolean(now) !== Boolean(c.before)) throw new Error(`File changed during planning: ${c.relative}`);
    }
    fs.mkdirSync(backupRoot, { recursive: true, mode: 0o700 });
    const receipt = { schemaVersion: 1, target: plan.root, createdAt: new Date().toISOString(), state: 'prepared', files: changes.map(c => ({ path: c.relative, beforeHash: c.before ? hash(c.before) : null, afterHash: hash(c.after), mode: c.mode })) };
    for (const c of changes) if (c.before) {
      const saved = safePath(backupRoot, path.join('files', c.relative));
      fs.mkdirSync(path.dirname(saved), { recursive: true, mode: 0o700 });
      fs.writeFileSync(saved, c.before, { flag: 'wx', mode: 0o600 });
    }
    manifestPath = path.join(backupRoot, 'manifest.json');
    atomicWrite(manifestPath, JSON.stringify(receipt, null, 2) + '\n', 0o600);
    for (const c of changes) atomicWrite(safePath(plan.root, c.relative), c.after, c.mode);
    receipt.state = 'complete';
    atomicWrite(manifestPath, JSON.stringify(receipt, null, 2) + '\n', 0o600);
    console.log(`DONE. Backup/restore manifest: ${manifestPath}`);
  } catch (e) {
    if (manifestPath) console.error(`Partial operation may exist. Inspect/restore with manifest: ${manifestPath}`);
    throw e;
  } finally { fs.closeSync(lockFd); fs.unlinkSync(lock); }
}

function restore(root, opt) {
  if (!opt.manifest) throw new Error('restore requires --manifest');
  const manifestPath = path.resolve(opt.manifest);
  const manifestRoot = path.dirname(manifestPath);
  if (!manifestRoot.startsWith(root + path.sep + '.pi-starter-backups' + path.sep)) throw new Error('Manifest must be inside this target’s .pi-starter-backups directory');
  safePath(root, path.relative(root, manifestPath));
  const receipt = json(fs.readFileSync(manifestPath));
  if (receipt.schemaVersion !== 1 || receipt.target !== root || !Array.isArray(receipt.files)) throw new Error('Manifest target/schema mismatch');
  const actions = [];
  for (const item of receipt.files) {
    const file = safePath(root, item.path);
    const now = fs.existsSync(file) ? fs.readFileSync(file) : null;
    const nowHash = now ? hash(now) : null;
    if (nowHash === item.beforeHash) continue;
    if (nowHash !== item.afterHash) throw new Error(`Refusing to overwrite later edits: ${item.path}`);
    let before = null;
    if (item.beforeHash) {
      const saved = safePath(manifestRoot, path.join('files', item.path));
      before = fs.readFileSync(saved);
      if (hash(before) !== item.beforeHash) throw new Error(`Backup checksum mismatch: ${item.path}`);
    }
    actions.push({ file, path: item.path, before, mode: item.mode, afterHash: item.afterHash });
  }
  console.log(`${opt.dryRun ? 'DRY RUN: ' : ''}Restore ${actions.length} files; later user edits are never overwritten.`);
  if (opt.dryRun || !actions.length) return;
  const lock = safePath(root, '.pi-starter-install.lock'), fd = fs.openSync(lock, 'wx', 0o600);
  try {
    for (const a of actions) {
      safePath(root, a.path);
      if (hash(fs.readFileSync(a.file)) !== a.afterHash) throw new Error(`File changed during restore: ${a.path}`);
      if (a.before) atomicWrite(a.file, a.before, a.mode);
      else fs.unlinkSync(a.file);
    }
    console.log('RESTORED. Empty directories and backups were retained.');
  } finally { fs.closeSync(fd); fs.unlinkSync(lock); }
}

export function runKit(argv) {
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major < 22 || (major === 22 && minor < 19)) throw new Error('Node >=22.19 is required');
  const opt = parse([...argv]);
  if (opt.command === 'help') console.log(help);
  else {
    const root = getRoot(opt);
    if (opt.command === 'restore') restore(root, opt);
    else {
      const plan = new Plan(root, opt);
      if (opt.command === 'global') globalPlan(plan);
      if (opt.command === 'init') { plan.tree(path.join(KIT, 'project-template')); plan.ignore(); }
      if (opt.command === 'setup') universalPlan(plan, KIT);
      if (opt.command === 'matt') mattPlan(plan);
      if (opt.command === 'context-tools') {
        plan.tree(path.join(KIT, 'optional/context-tools/extension'), '.pi/extensions/pi-context-tools');
        // Updating code must never silently overwrite custom limits or act as remote consent.
        plan.add('.pi/context-tools.json', fs.readFileSync(path.join(KIT, 'optional/context-tools/config.template.json')), false);
        plan.ignore();
        plan.notes.push('Optional context-tools only. No third-party package was installed and no model is authorized.');
        plan.notes.push('Restart/reload trusted Pi, then /context-tools status. Only the user may enable scoped delegation in the interactive UI.');
      }
      apply(plan);
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { runKit(process.argv.slice(2)); }
  catch (e) { console.error(`ERROR: ${e.message}`); process.exitCode = 1; }
}
