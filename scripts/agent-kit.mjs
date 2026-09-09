#!/usr/bin/env node
import path from 'node:path';
import { createInterface } from 'node:readline/promises';
import { runKit } from './kit.mjs';
import { inspectProject, selectAgents } from './lib/universal.mjs';
import { language } from './lib/languages.mjs';

const help = `Agent Kit — offline project setup for Pi, Codex, Claude Code and OpenCode

  agent-kit setup [DIR] [--agents pi,codex,claude,opencode|all]
      [--language en|ru] [--preset lean|deep] [--with-context-tools] [--dry-run] [--force]
  agent-kit wizard [--language en|ru]
  agent-kit doctor [--target DIR] [--json]
  agent-kit restore --target DIR --manifest FILE [--dry-run]

Run without installation: node /path/to/kit/scripts/agent-kit.mjs <command>
New projects default to Pi, English, lean skills, no extensions. Repeated setup keeps
previous agents and adds requested ones. Existing project settings are preserved.
--force updates kit files with backups; project context/conventions stay yours.
Legacy Pi global, init, matt and context-tools commands remain available.
Agent-led setup: SETUP.md. Documentation: docs/README.md.
`;

const helpRu = `Agent Kit — офлайн-настройка Pi, Codex, Claude Code и OpenCode

  agent-kit setup [DIR] [--agents pi,codex,claude,opencode|all]
      [--language en|ru] [--preset lean|deep] [--with-context-tools] [--dry-run] [--force]
  agent-kit wizard [--language en|ru]
  agent-kit doctor [--target DIR] [--json]
  agent-kit restore --target DIR --manifest FILE [--dry-run]

Без установки: node /path/to/kit/scripts/agent-kit.mjs <command>
Новый проект: Pi, английский язык, lean-навыки, без расширений.
Повторная настройка сохраняет язык и добавляет выбранные адаптеры.
--force обновляет файлы комплекта с резервной копией; контекст и правила проекта сохраняются.
Прежние команды Pi global, init, matt и context-tools доступны.
Настройка силами агента: SETUP.ru.md. Документация: docs/README.ru.md.
`;

async function wizard(selectedLanguage) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error('wizard needs an interactive terminal. Use setup --target DIR --agents all --dry-run instead.');
  const io = createInterface({ input: process.stdin, output: process.stdout });
  try {
    selectedLanguage = language(selectedLanguage ?? ((await io.question('Instruction language / Язык инструкций [en/ru, default en]: ')).trim() || 'en'));
    const ru = selectedLanguage === 'ru';
    const yes = value => /^(y(es)?|д(а)?)$/i.test(value.trim());
    const target = (await io.question(ru ? 'Папка проекта [.]: ' : 'Project directory [.]: ')).trim() || '.';
    const agents = (await io.question(ru ? 'Агенты: pi,codex,claude,opencode или all [pi]: ' : 'Agents: pi,codex,claude,opencode or all [pi]: ')).trim() || 'pi';
    const selected = selectAgents(agents);
    const extra = selected.includes('pi') && yes(await io.question(ru ? 'Добавить Pi context-tools (делегирование выключено)? [да/Нет]: ' : 'Add optional Pi context-tools (delegation starts disabled)? [y/N]: '));
    const args = ['setup', '--target', target, '--agents', agents, '--language', selectedLanguage, ...(extra ? ['--with-context-tools'] : [])];
    runKit([...args, '--dry-run']);
    if (yes(await io.question(ru ? 'Применить план с резервными копиями? [да/Нет]: ' : 'Apply this plan with backups? [y/N]: '))) runKit(args);
    else console.log(ru ? 'Отменено. Файлы не изменены.' : 'Cancelled. No files changed.');
  } finally { io.close(); }
}

try {
  const [command, ...args] = process.argv.slice(2);
  if (!command || ['--help', '-h', 'help'].includes(command) || args.includes('--help')) {
    const at = args.indexOf('--language');
    console.log(language(at < 0 ? 'en' : args[at + 1] ?? '') === 'ru' ? helpRu : help);
  }
  else if (command === 'wizard') {
    if (args.length && (args.length !== 2 || args[0] !== '--language')) throw new Error('wizard accepts --language en|ru; use setup for scripted execution');
    await wizard(args.length ? language(args[1]) : undefined);
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
