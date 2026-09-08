#!/usr/bin/env node
// Explicit local excerpts: bounded UTF-8 data, exact provenance, no model calls.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { safePath, integer } from './lib/runtime.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const SCAN_CAP = 2 * 1024 * 1024;
const MAX_PACK = 512 * 1024;

function relativeName(input) {
  if (typeof input !== 'string' || !input || input.length > 512 || /^[\\/]/.test(input) || /^[a-z]:/i.test(input)) throw new Error('Use a relative project path');
  const result = input.replaceAll('\\', '/').replace(/^(\.\/)+/, '');
  if (result.split('/').some(p => !p || p === '.' || p === '..' || /[\x00-\x1f<>:"|?*]/.test(p) || /[. ]$/.test(p) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(p))) throw new Error('Unsafe or nonportable path');
  return result;
}

function source(root, input) {
  const relative = relativeName(input);
  const parts = relative.toLowerCase().split('/');
  if (parts.some(p => ['.git', '.pi', '.codex', '.claude', '.opencode', '.ssh', '.aws', '.azure', '.config', '.pi-starter-backups', 'node_modules', 'secrets', 'credentials'].includes(p) || /^\.env(?:\.|$)/.test(p) || ['.npmrc', '.netrc', '.pypirc', 'auth.json', 'credentials.json', 'id_rsa', 'id_ed25519'].includes(p) || /\.(pem|key|p12|pfx|keystore)$/.test(p)) || /^\.agent\/(tmp|handoffs)(\/|$)/.test(parts.join('/'))) throw new Error('Sensitive/configuration or local-output paths are excluded');
  const file = safePath(root, relative);
  let fd;
  try {
    fd = fs.openSync(file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
    const before = fs.fstatSync(fd);
    if (!before.isFile() || before.nlink > 1) throw new Error('Expected a regular non-hardlinked source file');
    if (before.size > SCAN_CAP) throw new Error(`Source exceeds ${SCAN_CAP} byte scan limit: ${relative}`);
    const buffer = Buffer.alloc(SCAN_CAP + 1); let n = 0;
    while (n < buffer.length) { const read = fs.readSync(fd, buffer, n, buffer.length - n, null); if (!read) break; n += read; }
    const after = fs.fstatSync(fd);
    if (n > SCAN_CAP || n !== before.size || before.size !== after.size || before.mtimeMs !== after.mtimeMs) throw new Error('Source changed while reading; retry with stable files');
    const bytes = buffer.subarray(0, n);
    if (bytes.includes(0)) throw new Error('Binary sources are not supported');
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes).replaceAll('\r\n', '\n');
    const lines = text ? text.split('\n') : [];
    if (text.endsWith('\n')) lines.pop();
    return { path: relative, sha256: hash(bytes), sourceBytes: n, lines };
  } finally { if (fd !== undefined) fs.closeSync(fd); }
}

function excerpt(item, selection) {
  const startLine = selection.startLine === undefined ? 1 : integer(selection.startLine, 'startLine', 1, 10000000);
  const endLine = selection.endLine === undefined ? item.lines.length : integer(selection.endLine, 'endLine', 1, 10000000);
  if ((item.lines.length && (endLine < startLine || startLine > item.lines.length || endLine > item.lines.length)) || (!item.lines.length && (selection.startLine !== undefined || selection.endLine !== undefined))) throw new Error(`Range is outside source lines: ${item.path}`);
  return { path: item.path, sha256: item.sha256, sourceBytes: item.sourceBytes, startLine, endLine,
    complete: startLine === 1 && endLine === item.lines.length, text: item.lines.slice(startLine - 1, endLine).join('\n') };
}

export function createPack(root, selections, maxBytes = 16384) {
  integer(maxBytes, 'maxBytes', 1024, MAX_PACK);
  if (!Array.isArray(selections) || selections.length < 1 || selections.length > 16) throw new Error('Choose 1..16 source files');
  const names = new Set();
  const files = selections.map(selection => {
    const item = source(root, selection.path);
    if (names.has(item.path)) throw new Error('Duplicate file; choose one sufficient range per file');
    names.add(item.path); return excerpt(item, selection);
  });
  const pack = { schemaVersion: 1, kind: 'agent-kit-context', files };
  const output = JSON.stringify(pack, null, 2) + '\n';
  if (Buffer.byteLength(output) > maxBytes) throw new Error(`Context budget exceeded (${Buffer.byteLength(output)} > ${maxBytes} bytes). Narrow --range/--file or explicitly raise --max-bytes. Nothing emitted.`);
  for (const file of files) if (source(root, file.path).sha256 !== file.sha256) throw new Error(`Stale source: ${file.path}`);
  return output;
}

export function verifyPack(root, raw) {
  if (Buffer.byteLength(raw) > MAX_PACK) throw new Error('Saved bundle exceeds verification limit');
  const pack = JSON.parse(raw);
  if (!pack || Object.keys(pack).some(k => !['schemaVersion', 'kind', 'files'].includes(k)) || pack.schemaVersion !== 1 || pack.kind !== 'agent-kit-context' || !Array.isArray(pack.files) || !pack.files.length || pack.files.length > 16) throw new Error('Invalid context bundle');
  const names = new Set();
  for (const file of pack.files) {
    if (!file || Object.keys(file).some(k => !['path', 'sha256', 'sourceBytes', 'startLine', 'endLine', 'complete', 'text'].includes(k))) throw new Error('Invalid bundle source fields');
    const current = source(root, file.path);
    if (names.has(current.path)) throw new Error('Duplicate bundle source');
    names.add(current.path);
    if (current.sha256 !== file.sha256) throw new Error(`Stale source: ${file.path}`);
    const selected = excerpt(current, current.lines.length ? file : {});
    if (Object.keys(selected).some(k => selected[k] !== file[k])) throw new Error(`Excerpt integrity mismatch: ${file.path}`);
  }
  return { verified: true, files: pack.files.length, semanticClaimsVerified: false };
}

function main(args) {
  const help = 'Usage: node .agent/scripts/context-pack.mjs --file PATH [--range START:END] [--file ...] [--max-bytes 16384] [--out NEW_PATH]\n       node .agent/scripts/context-pack.mjs --verify BUNDLE_PATH';
  if (!args.length || args.includes('--help')) { console.log(help); return; }
  const root = fs.realpathSync(process.cwd());
  if (args[0] === '--verify') {
    if (args.length !== 2) throw new Error(help);
    const file = safePath(root, relativeName(args[1]));
    const fd = fs.openSync(file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
    try {
      const stat = fs.fstatSync(fd);
      if (!stat.isFile() || stat.size > MAX_PACK) throw new Error('Invalid or oversized bundle file');
      const buffer = Buffer.alloc(MAX_PACK + 1); let n = 0;
      while (n < buffer.length) { const count = fs.readSync(fd, buffer, n, buffer.length - n, null); if (!count) break; n += count; }
      if (n > MAX_PACK) throw new Error('Saved bundle exceeds verification limit');
      console.log(JSON.stringify(verifyPack(root, new TextDecoder('utf-8', { fatal: true }).decode(buffer.subarray(0, n)))));
    } finally { fs.closeSync(fd); }
    return;
  }
  const selections = []; let maxBytes = 16384, output;
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i], value = args[i + 1];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${key}`);
    if (key === '--file') selections.push({ path: value });
    else if (key === '--range' && selections.length && /^\d+:\d+$/.test(value) && selections.at(-1).startLine === undefined) {
      const [startLine, endLine] = value.split(':').map(Number); Object.assign(selections.at(-1), { startLine, endLine });
    } else if (key === '--max-bytes') maxBytes = integer(value, key, 1024, MAX_PACK);
    else if (key === '--out' && output === undefined) output = relativeName(value);
    else throw new Error(`Unknown or invalid option: ${key}`);
  }
  const encoded = createPack(root, selections, maxBytes);
  if (output) {
    const file = safePath(root, output);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, encoded, { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ path: output, bytes: Buffer.byteLength(encoded), files: selections.length }));
  } else process.stdout.write(encoded);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); }
  catch (e) { console.error(`ERROR: ${e.message}`); process.exitCode = 1; }
}
