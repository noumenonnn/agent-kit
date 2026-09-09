#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.join(root, 'docs/languages.json');
const catalog = JSON.parse(fs.readFileSync(file));
const write = process.argv.slice(2).includes('--write');
if (process.argv.slice(2).some(a => a !== '--write')) throw Error('Usage: node scripts/check-docs.mjs [--write]');
const errors = [], covered = new Set();
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    if (['.git', 'node_modules', '.pi-starter-backups', 'tmp'].includes(e.name)) return [];
    const p = path.join(dir, e.name);
    if (e.isSymbolicLink()) { errors.push(`Symlink: ${p}`); return []; }
    return e.isDirectory() ? walk(p) : p.endsWith('.md') ? [path.relative(root, p).replaceAll(path.sep, '/')] : [];
  });
}
for (const pair of catalog.pairs) {
  for (const lang of ['en', 'ru']) {
    const relative = pair[lang];
    if (typeof relative !== 'string' || path.isAbsolute(relative) || relative.split('/').some(p => p === '..') || covered.has(relative)) { errors.push(`Invalid/duplicate pair: ${relative}`); continue; }
    covered.add(relative);
    const p = path.join(root, relative);
    if (!fs.existsSync(p)) { errors.push(`Missing ${lang}: ${relative}`); continue; }
    const body = fs.readFileSync(p, 'utf8');
    if (!/^# /m.test(body) && !/^(\.github|locales|portable|global|project-template)\//.test(relative) && relative !== 'LICENSE') errors.push(`Missing heading: ${relative}`);
    if (lang === 'ru' && !/[а-яё]{3}/i.test(body)) errors.push(`Missing Russian text: ${relative}`);
    const hash = createHash('sha256').update(body).digest('hex');
    if (write) (pair.sha256 ??= {})[lang] = hash;
    else if (pair.sha256?.[lang] !== hash) errors.push(`Review both translations and run docs:write: ${relative}`);
    // Runtime templates have paths relative to the installed project; check human-doc links here.
    if (/^(locales|portable|global|project-template)\//.test(relative)) continue;
    for (const match of body.matchAll(/(?<!!)\[[^\]]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)) {
      const dest = match[1];
      if (/^(https?:|#|mailto:)/.test(dest)) continue;
      const target = decodeURIComponent(dest.split('#')[0]);
      if (target && !fs.existsSync(path.resolve(path.dirname(p), target))) errors.push(`Broken link: ${relative} -> ${dest}`);
    }
  }
}
for (const p of walk(root)) if (!covered.has(p)) errors.push(`Unpaired Markdown: ${p}`);
if (write && !errors.length) fs.writeFileSync(file, JSON.stringify(catalog, null, 2) + '\n');
console.log(JSON.stringify({ pairs: catalog.pairs.length, documents: covered.size, errors }, null, 2));
process.exitCode = errors.length ? 1 : 0;
