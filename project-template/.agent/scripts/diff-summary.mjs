#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { byteLimit, clean, integer, runDirectory, writePrivate } from './lib/runtime.mjs';

export function parseStatus(raw) {
  const fields = raw.split('\0');
  const entries = [];
  for (let i = 0; i < fields.length; i++) {
    if (!fields[i]) continue;
    const status = fields[i].slice(0, 2), file = fields[i].slice(3);
    const item = { path: file, status };
    if (/[RC]/.test(status)) item.from = fields[++i]; // -z uses destination THEN original.
    entries.push(item);
  }
  return entries;
}

function options(argv) {
  const o = { maxFiles: 50, maxOutputBytes: 8192, noLog: false, base: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--no-log') o.noLog = true;
    else if (a === '--max-files') o.maxFiles = integer(argv[++i], a, 1, 10000);
    else if (a === '--max-output-bytes') o.maxOutputBytes = integer(argv[++i], a, 1024, 1_000_000);
    else if (a === '--base') { o.base = argv[++i]; if (!o.base || o.base.startsWith('-')) throw new Error('Expected a base ref, not an option'); }
    else throw new Error(`Unknown option: ${a}`);
  }
  return o;
}

function main() {
  const opt = options(process.argv.slice(2));
  const git = (args, cwd = process.cwd()) => execFileSync('git', [
    '--no-optional-locks', '-c', 'core.fsmonitor=false', ...args,
  ], { cwd, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, timeout: 30000, stdio: ['ignore', 'pipe', 'pipe'] });
  const root = git(['rev-parse', '--show-toplevel']).trimEnd();
  const entries = parseStatus(git(['status', '--porcelain=v1', '-z', '--untracked-files=all'], root));
  const diffOptions = ['diff', '--no-ext-diff', '--no-textconv'];
  const unstagedStat = git([...diffOptions, '--shortstat'], root).trim();
  const stagedStat = git([...diffOptions, '--cached', '--shortstat'], root).trim();
  let committed = [], baseCommit = null, committedStat = '';
  if (opt.base) {
    const baseOid = git(['rev-parse', '--verify', '--end-of-options', `${opt.base}^{commit}`], root).trim();
    const headOid = git(['rev-parse', '--verify', 'HEAD'], root).trim();
    baseCommit = git(['merge-base', baseOid, headOid], root).trim();
    const fields = git([...diffOptions, '--name-status', '--no-renames', '-z', baseCommit, headOid, '--'], root).split('\0');
    for (let i = 0; i + 1 < fields.length; i += 2) if (fields[i]) committed.push({ status: fields[i], path: fields[i + 1] });
    committedStat = git([...diffOptions, '--shortstat', baseCommit, headOid, '--'], root).trim();
  }
  const paths = new Map();
  for (const e of committed) paths.set(e.path, { path: e.path, committed: e.status });
  for (const e of entries) paths.set(e.path, { ...paths.get(e.path), ...e });
  const all = [...paths.values()];
  const conflicts = new Set(['DD', 'AU', 'UD', 'UA', 'DU', 'AA', 'UU']);
  const report = {
    schemaVersion: 1, generatedAt: new Date().toISOString(), root, baseCommit,
    counts: {
      changedPaths: all.length,
      staged: entries.filter(e => e.status !== '??' && e.status[0] !== ' ').length,
      unstaged: entries.filter(e => e.status !== '??' && e.status[1] !== ' ').length,
      untracked: entries.filter(e => e.status === '??').length,
      conflicted: entries.filter(e => conflicts.has(e.status)).length,
      committed: committed.length,
    },
    unstagedStat, stagedStat, committedStat, entries: all,
  };
  let reportFile = null;
  if (!opt.noLog) {
    reportFile = path.join(runDirectory('diff', root), 'report.json');
    writePrivate(reportFile, JSON.stringify(report, null, 2) + '\n');
  }
  const c = report.counts;
  const header = [
    `CHANGED PATHS: ${c.changedPaths} (includes untracked; a rename counts once)`,
    `Staged: ${c.staged}; unstaged: ${c.unstaged}; untracked: ${c.untracked}; conflicts: ${c.conflicted}; committed vs base: ${c.committed}`,
    'Categories overlap. Ignored files are excluded; submodules are not expanded.',
    `Unstaged stat: ${clean(unstagedStat || '(none)')}`, `Staged stat: ${clean(stagedStat || '(none)')}`,
    baseCommit ? `Base: ${baseCommit}; committed stat: ${clean(committedStat || '(none)')}` : '',
    reportFile ? `Full report: ${path.relative(process.cwd(), reportFile)}` : 'No report written (--no-log).',
  ].filter(Boolean).join('\n');
  const lines = all.slice(0, opt.maxFiles).map(e => `${e.status || '  '}${e.committed ? ` [base:${e.committed}]` : ''} ${JSON.stringify(e.path)}${e.from ? ` <- ${JSON.stringify(e.from)}` : ''}`);
  const full = header + '\n\n' + (lines.join('\n') || '(clean)') + (all.length > opt.maxFiles ? `\n… ${all.length - opt.maxFiles} more paths` : '');
  const suffix = '\n[Summary clipped; see full report or narrow the review.]\n';
  process.stdout.write(Buffer.byteLength(full + '\n') <= opt.maxOutputBytes ? full + '\n' : byteLimit(full, opt.maxOutputBytes - Buffer.byteLength(suffix)) + suffix);
  if (c.conflicted) process.exitCode = 1;
}

// Safe import for parser unit tests.
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  try { main(); } catch (e) {
    console.error(`DIFF ERROR: ${clean(e.stderr?.toString() || e.message).slice(0, 2000)}\nNo complete summary produced. Git commands are bounded to 16 MiB / 30 seconds.`);
    process.exitCode = Number.isInteger(e.status) && e.status > 0 ? e.status : 1;
  }
}
