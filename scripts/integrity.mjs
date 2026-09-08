#!/usr/bin/env node
// Release inventory over Git's non-ignored repository files, never local logs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

try {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && args[0] !== '--write')) throw new Error('Usage: node scripts/integrity.mjs [--write]');
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const names = execFileSync('git', ['--no-optional-locks', '-c', 'core.fsmonitor=false', 'ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: root, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
  const files = {};
  for (const name of [...new Set(names.split('\0').filter(n => n && n !== 'FILE-HASHES.json'))].sort()) {
    const file = path.join(root, name);
    if (!fs.lstatSync(file).isFile()) throw new Error(`Inventory requires a regular file: ${name}`);
    files[name] = createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  }
  const inventory = { algorithm: 'SHA-256', scope: 'Git tracked and non-ignored repository files except FILE-HASHES.json; integrity inventory, not a signature', files };
  const destination = path.join(root, 'FILE-HASHES.json');
  if (args[0] === '--write') {
    fs.writeFileSync(destination, JSON.stringify(inventory, null, 2) + '\n');
    console.log(`Recorded SHA-256 for ${Object.keys(files).length} repository files.`);
  } else {
    const recorded = JSON.parse(fs.readFileSync(destination, 'utf8'));
    const differences = [...new Set([...Object.keys(recorded.files || {}), ...Object.keys(files)])].filter(name => recorded.files?.[name] !== files[name]);
    if (recorded.algorithm !== inventory.algorithm || differences.length) throw new Error(`Integrity inventory differs: ${differences.join(', ') || 'algorithm'}. Review changes, then run npm run integrity:write.`);
    console.log(`Verified SHA-256 for ${Object.keys(files).length} repository files.`);
  }
} catch (e) { console.error(`ERROR: ${e.message}`); process.exitCode = 1; }
