#!/usr/bin/env node
// Static contract checks; no dependencies, network, or project code execution.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
import { parseConfig } from '../optional/context-tools/extension/lib/core.mjs';

const failures = [], counts = { javascript: 0, typescriptSyntax: 0, json: 0, skills: 0, prompts: 0 };
function check(condition, message) { if (!condition) failures.push(message); }
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    if (['node_modules', '.git', '.pi-starter-backups', 'tmp'].includes(e.name)) return [];
    const p = path.join(dir, e.name);
    if (e.isSymbolicLink()) { failures.push(`Unexpected symlink: ${p}`); return []; }
    return e.isDirectory() ? walk(p) : [p];
  });
}
const files = walk(root);
for (const file of files) {
  const rel = path.relative(root, file), bytes = fs.readFileSync(file);
  if (/\.(md|mjs|ts|json|sh|ps1|ya?ml)$/.test(file)) check(!bytes.subarray(0, 3).equals(Buffer.from([239, 187, 191])), `${rel}: unexpected UTF-8 BOM`);
  if (file.endsWith('.mjs') || file.endsWith('.ts')) {
    if (file.endsWith('.ts')) counts.typescriptSyntax++; else counts.javascript++;
    try { execFileSync(process.execPath, ['--check', file], { timeout: 10000, stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { failures.push(`${rel}: ${e.stderr?.toString() || e.message}`); }
  }
  if (file.endsWith('.json')) {
    counts.json++; try { JSON.parse(bytes.toString()); } catch { failures.push(`${rel}: invalid JSON`); }
  }
  if (file.endsWith('SKILL.md')) {
    counts.skills++;
    const fm = /^---\n([\s\S]*?)\n---/.exec(bytes.toString())?.[1] || '';
    const name = /^name: (.+)$/m.exec(fm)?.[1], description = /^description: (.+)$/m.exec(fm)?.[1];
    check(name === path.basename(path.dirname(file)), `${rel}: name/directory mismatch`);
    check(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name || '') && name.length <= 64, `${rel}: invalid name`);
    check(Boolean(description) && description.length <= 1024, `${rel}: missing/long description`);
  }
  if (rel.replaceAll(path.sep, '/').startsWith('project-template/.pi/prompts/') && file.endsWith('.md')) {
    counts.prompts++;
    const fm = /^---\n([\s\S]*?)\n---/.exec(bytes.toString())?.[1] || '';
    check(/^description: .+$/m.test(fm), `${rel}: no description`);
    check(/^readonly: (true|false)$/m.test(fm), `${rel}: explicit readonly posture required`);
    if (/efficient-(task|build|verify)\.md$/.test(file)) check(/^readonly: false$/m.test(fm), `${rel}: writable check workflow incorrectly readonly`);
    check(!bytes.toString().includes('model: '), `${rel}: provider-specific model pin in workflow`);
  }
}
const readJson = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const core = readJson('global/settings.template.json'), extension = readJson('profiles/agenticoding/settings.template.json');
check(core.compaction.enabled === true, 'Core must retain compaction');
check(extension.compaction.enabled === false, 'Agenticoding profile must be explicit');
check(core.defaultProjectTrust === 'ask', 'Global project trust should ask');
check(!readJson('project-template/.pi/settings.json').defaultThinkingLevel, 'Project template should not override personal thinking preferences');
const contextConfig = parseConfig(readJson('optional/context-tools/config.template.json'));
check(contextConfig.guard.mode === 'warn', 'Optional read guard must start advisory-only');
check(!fs.existsSync(path.join(root, 'project-template/.pi/extensions/pi-context-tools')), 'Core init must not install context-tools');
const policyBytes = ['global/AGENTS.fragment.md', 'project-template/AGENTS.md'].reduce((n, p) => n + fs.statSync(path.join(root, p)).size, 0);
check(policyBytes <= 2800, `Always-loaded policy budget exceeded: ${policyBytes} bytes > 2800`);
const portablePolicyBytes = fs.statSync(path.join(root, 'portable/instructions.md')).size;
check(portablePolicyBytes <= 1024, `Portable policy exceeds 1024 bytes: ${portablePolicyBytes}`);
const pkg = readJson('package.json');
check(pkg.pi.extensions.length === 0, 'Pi package must not implicitly load optional extensions');
for (const resource of [...pkg.pi.skills, ...pkg.pi.prompts]) check(fs.existsSync(path.join(root, resource)), `Missing Pi package resource: ${resource}`);
let leanMetadataBytes = 0;
for (const name of fs.readdirSync(path.join(root, 'portable/skills'))) {
  const body = fs.readFileSync(path.join(root, 'portable/skills', name, 'SKILL.md'), 'utf8');
  leanMetadataBytes += Buffer.byteLength(/^---\n([\s\S]*?)\n---/.exec(body)?.[1] || '');
  check(Buffer.byteLength(body) <= 4096, `${name}: disclose reference detail; skill exceeds 4096 bytes`);
}
check(leanMetadataBytes <= 1024, `Lean skill metadata exceeds 1024 bytes: ${leanMetadataBytes}`);
console.log(JSON.stringify({ ...counts, policyBytes, portablePolicyBytes, leanMetadataBytes, failures }, null, 2));
process.exitCode = failures.length ? 1 : 0;
