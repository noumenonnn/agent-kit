import fs from 'node:fs';
import path from 'node:path';
import { stripVTControlCharacters } from 'node:util';
import { randomUUID } from 'node:crypto';

export function clean(text) {
  return stripVTControlCharacters(String(text)).replace(/[\x00-\x08\x0b-\x1f\x7f-\x9f]/g, '');
}

export function byteLimit(text, max) {
  text = String(text);
  if (Buffer.byteLength(text) <= max) return text;
  let result = '', used = 0;
  for (const ch of text) {
    const n = Buffer.byteLength(ch);
    if (used + n > max) break;
    result += ch; used += n;
  }
  return result;
}

export function integer(value, name, min = 1, max = 2_147_483_647) {
  if (!/^\d+$/.test(String(value))) throw new Error(`${name} must be an integer`);
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < min || n > max) throw new Error(`${name} must be ${min}..${max}`);
  return n;
}

// Explicit target may have OS-managed symlink ancestors (e.g. /tmp on macOS).
// Canonicalize those once; reject a symlink at the target itself.
export function canonicalTarget(input) {
  const absolute = path.resolve(input);
  const parts = [];
  let existing = absolute;
  while (!fs.existsSync(existing)) {
    try { fs.lstatSync(existing); throw new Error(`Dangling link: ${existing}`); }
    catch (e) { if (e.code !== 'ENOENT') throw e; }
    parts.unshift(path.basename(existing));
    const parent = path.dirname(existing);
    if (parent === existing) throw new Error('Cannot resolve target');
    existing = parent;
  }
  if (existing === absolute && fs.lstatSync(existing).isSymbolicLink()) throw new Error(`Symlink target refused: ${absolute}`);
  return path.join(fs.realpathSync(existing), ...parts);
}

// No symlink/junction below root, no traversal, no special files.
// This is a local installation guard, not protection from hostile concurrent FS changes.
export function safePath(root, relative) {
  if (path.isAbsolute(relative) || relative.split(/[\\/]/).some(p => p === '..')) throw new Error(`Unsafe path: ${relative}`);
  const dest = path.resolve(root, relative);
  if (dest !== root && !dest.startsWith(root + path.sep)) throw new Error(`Path escapes target: ${relative}`);
  let current = root;
  for (const part of path.relative(root, dest).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    let stat;
    try { stat = fs.lstatSync(current); } catch (e) { if (e.code === 'ENOENT') continue; throw e; }
    if (stat.isSymbolicLink()) throw new Error(`Symlink/junction refused: ${current}`);
    if (!stat.isDirectory() && !stat.isFile()) throw new Error(`Special file refused: ${current}`);
  }
  return dest;
}

export function runDirectory(label, cwd = process.cwd()) {
  const root = fs.realpathSync(cwd);
  const base = safePath(root, '.agent/tmp');
  fs.mkdirSync(base, { recursive: true, mode: 0o700 });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = path.join(base, `${label}-${stamp}-${randomUUID().slice(0, 8)}`);
  fs.mkdirSync(dir, { mode: 0o700 });
  return dir;
}

export function writePrivate(file, data) {
  fs.writeFileSync(file, data, { flag: 'wx', mode: 0o600 });
}

export function atomicWrite(file, data, mode = 0o644) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = path.join(path.dirname(file), `.pi-starter-${randomUUID()}.tmp`);
  try {
    fs.writeFileSync(temporary, data, { flag: 'wx', mode });
    fs.renameSync(temporary, file);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}
