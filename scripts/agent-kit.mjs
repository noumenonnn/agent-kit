#!/usr/bin/env node
import path from 'node:path';
import { createInterface } from 'node:readline/promises';
import { runKit } from './kit.mjs';
import { inspectProject, selectAgents } from './lib/universal.mjs';

const help = `Agent Kit — offline project setup for Pi, Codex, Claude Code and OpenCode

  agent-kit setup [DIR] [--agents pi,codex,claude,opencode|all]
      [--preset lean|deep] [--with-context-tools] [--dry-run] [--force]
  agent-kit wizard
  agent-kit doctor [--target DIR] [--json]
  agent-kit restore --target DIR --manifest FILE [--dry-run]

Run without installation: node /path/to/kit/scripts/agent-kit.mjs <command>
New projects default to Pi, lean skills, no extensions. Repeated setup keeps
previous agents and adds requested ones. Existing project settings are preserved.
--force updates kit files with backups; project context/conventions stay yours.
Legacy Pi global, init, matt and context-tools commands remain available.
`;

async function wizard() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error('wizard needs an interactive terminal. Use setup --target DIR --agents all --dry-run instead.');
  const io = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const target = (await io.question('Project directory [.]: ')).trim() || '.';
    const agents = (await io.question('Agents: pi,codex,claude,opencode or all [pi]: ')).trim() || 'pi';
    const selected = selectAgents(agents);
    const extra = selected.includes('pi') && /^y(es)?$/i.test((await io.question('Add optional Pi context-tools (delegation starts disabled)? [y/N]: ')).trim());
    const args = ['setup', '--target', target, '--agents', agents, ...(extra ? ['--with-context-tools'] : [])];
    runKit([...args, '--dry-run']);
    if (/^y(es)?$/i.test((await io.question('Apply this plan with backups? [y/N]: ')).trim())) runKit(args);
    else console.log('Cancelled. No files changed.');
  } finally { io.close(); }
}

try {
  const [command, ...args] = process.argv.slice(2);
  if (!command || ['--help', '-h', 'help'].includes(command) || args.includes('--help')) console.log(help);
  else if (command === 'wizard') {
    if (args.length) throw new Error('wizard takes no options; use setup for scripted execution');
    await wizard();
  } else if (command === 'doctor' || command === 'status') {
    let target = process.cwd(), json = false;
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--json') json = true;
      else if (args[i] === '--target' && args[i + 1] && !args[i + 1].startsWith('-')) target = args[++i];
      else throw new Error(`Unknown or incomplete option: ${args[i]}`);
    }
    const result = inspectProject(path.resolve(target));
    if (json) console.log(JSON.stringify(result, null, 2));
    else { console.log(`Agent Kit: ${result.agents.join(', ')} in ${result.root}`); for (const f of result.findings) console.log(`${f.level}: ${f.message}`); }
    process.exitCode = result.findings.some(f => f.level === 'ERROR') ? 1 : 0;
  } else runKit([command, ...args]);
} catch (e) {
  if (process.argv.includes('--json')) console.log(JSON.stringify({ schemaVersion: 1, error: e.message, runtimeVerified: false }));
  else console.error(`ERROR: ${e.message}`);
  process.exitCode = 1;
}
