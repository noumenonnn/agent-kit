#!/usr/bin/env node
// Static environment/configuration diagnostics. Does not load Pi/extensions or execute project scripts.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { canonicalTarget, safePath } from '../project-template/.agent/scripts/lib/runtime.mjs';

let project = process.cwd(), piHome = process.env.PI_CODING_AGENT_DIR || path.join(os.homedir(), '.pi/agent');
const findings = [];
const report = (level, message) => findings.push({ level, message });
function settings(root, relative) {
  try {
    const file = safePath(root, relative);
    if (!fs.existsSync(file)) { report('WARN', `Missing ${file}`); return {}; }
    const obj = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new Error('Expected JSON object');
    return obj;
  } catch (e) { report('ERROR', e.message); return {}; }
}
try {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (!['--project', '--pi-home'].includes(args[i]) || !args[i + 1]) throw new Error('Usage: node scripts/doctor.mjs [--project DIR] [--pi-home DIR]');
    if (args[i] === '--project') project = args[++i]; else piHome = args[++i];
  }
  project = canonicalTarget(project); piHome = canonicalTarget(piHome);
  const [major, minor] = process.versions.node.split('.').map(Number);
  report(major > 22 || (major === 22 && minor >= 19) ? 'OK' : 'ERROR', `Node ${process.versions.node}; required >=22.19.0`);
  const global = settings(piHome, 'settings.json'), local = settings(project, '.pi/settings.json');
  const compaction = local.compaction?.enabled ?? global.compaction?.enabled ?? true;
  // This checks declarations, not whether an extension was actually loaded.
  const allPackages = [...(Array.isArray(global.packages) ? global.packages : []), ...(Array.isArray(local.packages) ? local.packages : [])];
  const declared = allPackages.some(p => (typeof p === 'string' ? p : p?.source)?.startsWith('npm:pi-agenticoding@'));
  if (!compaction) report('WARN', `Auto-compaction disabled; agenticoding declaration ${declared ? 'found' : 'NOT found'}. Verify /handoff in a real Pi session or restore compaction.`);
  else report('OK', 'Auto-compaction enabled');
  if (global.defaultProjectTrust === 'always') report('WARN', 'Global project trust is always; review this deliberate security choice');
  for (const name of ['AGENTS.override.md', 'CLAUDE.md']) if (fs.existsSync(safePath(project, name))) report('WARN', `${name} exists: confirm which context files Pi actually loads. AGENTS.override.md takes precedence.`);
  const conventions = safePath(project, '.agent/references/conventions.md');
  if (fs.existsSync(conventions) && /TODO/.test(fs.readFileSync(conventions, 'utf8'))) report('WARN', 'Fill repository-specific commands in .agent/references/conventions.md');
  const names = new Map();
  const skillRoots = [path.join(piHome, 'skills'), path.join(project, '.pi/skills'), path.join(project, '.agents/skills'), path.join(os.homedir(), '.agents/skills')];
  function scan(dir, depth = 0) {
    if (depth > 5 || !fs.existsSync(dir)) return;
    if (fs.lstatSync(dir).isSymbolicLink()) { report('WARN', `Skill symlink not followed: ${dir}`); return; }
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) scan(p, depth + 1);
      else if (e.isSymbolicLink()) report('WARN', `Skill symlink not followed: ${p}`);
      else if (e.isFile() && e.name.endsWith('.md') && fs.statSync(p).size <= 128 * 1024) {
        const text = fs.readFileSync(p, 'utf8'), fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)?.[1];
        if (!fm) continue;
        const name = /^name:\s*["']?([^\r\n"']+)/m.exec(fm)?.[1]?.trim();
        if (name) { if (names.has(name)) report('WARN', `Duplicate skill ${name}: ${names.get(name)} and ${p}`); else names.set(name, p); }
      }
    }
  }
  for (const root of new Set(skillRoots)) scan(root);
  try {
    const ignored = execFileSync('git', ['--no-optional-locks', '-c', 'core.fsmonitor=false', 'check-ignore', '.agent/tmp/probe.log', '.agent/handoffs/probe.md', '.pi-starter-backups/probe/file'], { cwd: project, encoding: 'utf8', timeout: 5000, stdio: ['ignore', 'pipe', 'pipe'] });
    if (ignored.trim().split(/\r?\n/).length !== 3) report('WARN', 'Some logs/handoffs/backups are not ignored');
    else report('OK', 'Local logs, handoffs and backups are ignored');
  } catch { report('WARN', 'Could not confirm Git ignore rules; check repository initialization and .gitignore'); }
  report('INFO', 'Pi runtime/version, provider authentication, extension loading and live model routing are NOT tested by this static doctor.');
  report('INFO', 'Skill scan covers common local paths, not every ancestor/package/explicit settings path; no security certification is implied.');
} catch (e) { report('ERROR', e.message); }
for (const f of findings) console.log(`${f.level}: ${f.message}`);
process.exitCode = findings.some(f => f.level === 'ERROR') ? 1 : 0;
