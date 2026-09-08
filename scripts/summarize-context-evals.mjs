#!/usr/bin/env node
import fs from 'node:fs';
import { summarizeEvaluation } from '../optional/context-tools/evaluation.mjs';
try {
  if (process.argv.length !== 3) throw new Error('Usage: node scripts/summarize-context-evals.mjs /path/to/evaluation.json');
  const file = process.argv[2];
  if (!fs.statSync(file).isFile() || fs.statSync(file).size > 8 * 1024 * 1024) throw new Error('Expected a regular JSON file <=8 MiB');
  const summary = summarizeEvaluation(JSON.parse(fs.readFileSync(file, 'utf8')));
  process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
} catch (e) { console.error(`EVALUATION ERROR: ${e.message}`); process.exitCode = 1; }
