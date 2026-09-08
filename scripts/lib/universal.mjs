import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { canonicalTarget, safePath } from '../../project-template/.agent/scripts/lib/runtime.mjs';

export const AGENTS = ['pi', 'codex', 'claude', 'opencode'];
const BEGIN = '<!-- AGENT-KIT:BEGIN -->', END = '<!-- AGENT-KIT:END -->';
const digest = data => createHash('sha256').update(data).digest('hex');
const encode = value => JSON.stringify(value, null, 2) + '\n';
const shellQuote = value => process.platform === 'win32' ? `'${value.replaceAll("'", "''")}'` : `'${value.replaceAll("'", "'\\''")}'`;

export function selectAgents(value = 'pi') {
  const selected = value === 'all' ? AGENTS : value.split(',');
  if (!selected.length || selected.some(name => !AGENTS.includes(name))) throw new Error('Choose --agents pi,codex,claude,opencode or all');
  return AGENTS.filter(name => selected.includes(name));
}

function stateFrom(bytes) {
  if (!bytes) return null;
  const state = JSON.parse(bytes.toString('utf8'));
  if (state.schemaVersion !== 1 || !Array.isArray(state.agents) || !state.agents.length || state.agents.some(a => !AGENTS.includes(a)) || !state.files || typeof state.files !== 'object' || Array.isArray(state.files)) throw new Error('Invalid .agent/kit.json; restore or repair the installation record');
  for (const [file, hash] of Object.entries(state.files)) {
    if (!file || !/^[a-f0-9]{64}$/.test(hash)) throw new Error('Invalid installation file hash');
  }
  return state;
}

function marked(plan, relative, body) {
  const existing = plan.existing(relative)?.toString('utf8') || '';
  const starts = existing.split(BEGIN).length - 1, ends = existing.split(END).length - 1;
  if (starts !== ends || starts > 1 || (starts && existing.indexOf(BEGIN) > existing.indexOf(END))) throw new Error(`Malformed agent-kit markers in ${relative}; repair before setup`);
  const block = `${BEGIN}\n${body.trim()}\n${END}`;
  const next = starts ? existing.slice(0, existing.indexOf(BEGIN)) + block + existing.slice(existing.indexOf(END) + END.length)
    : existing + (existing && !existing.endsWith('\n') ? '\n' : '') + (existing ? '\n' : '') + block + '\n';
  plan.add(relative, next, !starts || plan.opt.force);
}

function suggestedConventions(plan) {
  const bytes = plan.existing('package.json');
  if (!bytes || bytes.length > 256 * 1024) return null;
  let pkg;
  try { pkg = JSON.parse(bytes); } catch { return null; }
  const manager = plan.existing('pnpm-lock.yaml') ? 'pnpm' : plan.existing('yarn.lock') ? 'yarn' : plan.existing('bun.lock') || plan.existing('bun.lockb') ? 'bun' : 'npm';
  const commands = ['dev', 'build', 'test', 'check', 'typecheck', 'lint'].filter(key => typeof pkg?.scripts?.[key] === 'string').map(key => `- \`${manager} run ${key}\` — declared in package.json; not executed or verified by setup.`);
  if (!commands.length) return null;
  return `# Repository Conventions\n\n## Declared commands\n\n${commands.join('\n')}\n\nCheck the current package.json and workspace scope before running a command. Treat these as setup-time suggestions. Follow nearby code for naming, formatting and test patterns. Add durable project-specific rules here when discovered.\n`;
}

export function universalPlan(plan, kit) {
  const previous = stateFrom(plan.existing('.agent/kit.json'));
  const requested = selectAgents(plan.opt.agents ?? previous?.agents.join(',') ?? 'pi');
  const agents = AGENTS.filter(a => requested.includes(a) || previous?.agents.includes(a));
  if (plan.opt.withContextTools && !agents.includes('pi')) throw new Error('--with-context-tools requires the pi adapter');
  const read = relative => fs.readFileSync(path.join(kit, relative));
  // Shared user-authored project documents are never replaced, even with --force.
  for (const relative of ['CONTEXT.md', 'docs/adr/0000-template.md']) plan.add(relative, read(`project-template/${relative}`), false);
  for (const name of fs.readdirSync(path.join(kit, 'project-template/.agent/references')).sort()) {
    const relative = `.agent/references/${name}`;
    plan.add(relative, name === 'conventions.md' ? suggestedConventions(plan) || read(`project-template/${relative}`) : read(`project-template/${relative}`), false);
  }
  plan.tree(path.join(kit, 'project-template/.agent/scripts'), '.agent/scripts');
  plan.add('.agent/references/workflow.md', read('portable/workflow.md'));

  if (agents.some(a => a !== 'claude')) {
    const override = plan.existing('AGENTS.override.md');
    const targets = new Set();
    if (agents.some(a => a === 'pi' || a === 'codex')) targets.add(override?.toString().trim() ? 'AGENTS.override.md' : 'AGENTS.md');
    if (agents.includes('opencode')) targets.add('AGENTS.md');
    for (const target of targets) marked(plan, target, read('portable/instructions.md').toString());
  }
  if (agents.includes('claude')) marked(plan, 'CLAUDE.md', read('portable/instructions.md').toString());

  const skillRoots = agents.some(a => a !== 'claude') ? ['.agents/skills'] : [];
  if (agents.includes('claude')) skillRoots.push('.claude/skills');
  const sources = [path.join(kit, 'portable/skills')];
  if (plan.opt.preset === 'deep' || previous?.preset === 'deep') sources.push(path.join(kit, 'global/skills'));
  for (const source of sources) for (const name of fs.readdirSync(source).sort()) for (const root of skillRoots) {
    const dest = `${root}/${name}`;
    if (fs.existsSync(safePath(plan.root, dest)) && !plan.opt.force) {
      plan.notes.push(`PRESERVED entire skill ${dest}; --force performs a backed-up update`);
    } else plan.tree(path.join(source, name), dest);
  }

  if (agents.includes('pi')) {
    plan.tree(path.join(kit, 'project-template/.pi/prompts'), '.pi/prompts');
    plan.add('.pi/settings.json', read('project-template/.pi/settings.json'), false);
    plan.notes.push('Pi: /efficient-task <task>; /skill:efficient-context; /portable-handoff. Reload in a trusted project.');
  }
  if (agents.includes('opencode')) {
    for (const name of fs.readdirSync(path.join(kit, 'project-template/.pi/prompts')).sort()) {
      const raw = read(`project-template/.pi/prompts/${name}`).toString();
      const description = /^description: (.+)$/m.exec(raw)?.[1];
      const body = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '').replaceAll('$@', '$ARGUMENTS').replace('${1:-.agent/handoffs/latest.md}', '.agent/handoffs/latest.md');
      plan.add(`.opencode/commands/${name}`, `---\ndescription: ${description}\n---\n${body}`);
    }
    plan.notes.push('OpenCode: /efficient-task <task>; shared skills are loaded on demand.');
  }
  if (agents.includes('codex')) plan.notes.push('Codex: $efficient-task <task>; $efficient-context; $efficient-handoff. Restart if discovery is stale.');
  if (agents.includes('claude')) plan.notes.push('Claude Code: /efficient-task <task>; /efficient-context; /efficient-handoff.');
  if (agents.includes('opencode') && agents.includes('claude')) plan.notes.push('OpenCode can discover both shared and Claude skill copies: identical copies are equivalent; doctor detects drift. The host may warn about duplicate names.');
  if (plan.opt.withContextTools) {
    plan.tree(path.join(kit, 'optional/context-tools/extension'), '.pi/extensions/pi-context-tools');
    plan.add('.pi/context-tools.json', read('optional/context-tools/config.template.json'), false);
    plan.notes.push('Pi context-tools installed, delegation disabled. /context-tools status; enable only through the interactive Pi UI.');
  }
  const entry = shellQuote(path.join(kit, 'scripts/agent-kit.mjs'));
  const target = shellQuote(plan.root);
  const firstSteps = { pi: '`/efficient-task <task>`', codex: '`$efficient-task <task>`', claude: '`/efficient-task <task>`', opencode: '`/efficient-task <task>`' };
  plan.add('.agent/GETTING-STARTED.md', `# Agent Kit\n\nInstalled for ${agents.join(', ')}. Open the project in your agent and follow its normal project-trust flow.\n\n${agents.map(a => `- ${a}: ${firstSteps[a]}`).join('\n')}\n\nRead \`.agent/references/conventions.md\` for project checks. Context tools and handoff instructions are in \`.agent/references/workflow.md\`.\n\nStatic diagnosis (keep the kit folder available):\n\n\`\`\`sh\nnode ${entry} doctor --target ${target}\n\`\`\`\n\nInstallation records: \`.agent/kit.json\`. Backups: \`.pi-starter-backups/\`. Setup is additive; rerun with the same agents for repair. Review \`--dry-run\` before \`--force\` updates. Restore manifests in reverse chronological order; later user edits are protected.\n`, true);
  plan.ignore();
  const files = { ...previous?.files };
  for (const change of plan.changes.values()) if (change.relative !== '.agent/kit.json') files[change.relative.replaceAll(path.sep, '/')] = digest(change.after);
  const next = { schemaVersion: 1, kitVersion: JSON.parse(read('package.json')).version, agents,
    preset: sources.length > 1 ? 'deep' : 'lean', contextTools: Boolean(plan.opt.withContextTools || previous?.contextTools), files };
  plan.add('.agent/kit.json', encode(next), true);
  plan.notes.unshift(`AGENTS: ${agents.join(', ')}. Scope: project. Preset: ${next.preset}. No network or model calls.`);
  plan.notes.push(`Next: node ${entry} doctor --target ${target}`);
  plan.notes.push('Project quickstart: .agent/GETTING-STARTED.md. Check commands in .agent/references/conventions.md.');
}

export function inspectProject(input) {
  const root = canonicalTarget(input), findings = [];
  const report = (level, message) => findings.push({ level, message });
  const record = safePath(root, '.agent/kit.json');
  if (!fs.existsSync(record)) throw new Error('No universal installation found. Run agent-kit setup --target <project> first; legacy Pi diagnostics: node scripts/doctor.mjs --project <project>');
  const state = stateFrom(fs.readFileSync(record));
  const required = ['.agent/scripts/context-pack.mjs', '.agent/scripts/compact-run.mjs', '.agent/scripts/diff-summary.mjs', '.agent/scripts/lib/runtime.mjs', '.agent/references/workflow.md'];
  if (state.agents.includes('pi')) required.push('.pi/prompts/efficient-task.md');
  if (state.agents.includes('opencode')) required.push('.opencode/commands/efficient-task.md');
  for (const relative of required) if (!fs.existsSync(safePath(root, relative))) report('ERROR', `Missing required artifact: ${relative}; rerun setup`);
  const instructionFiles = [];
  if (state.agents.some(a => a !== 'claude')) {
    const override = safePath(root, 'AGENTS.override.md');
    const activeOverride = fs.existsSync(override) && fs.readFileSync(override, 'utf8').trim();
    // OpenCode uses AGENTS.md even when Pi/Codex select an override.
    if (state.agents.some(a => a === 'pi' || a === 'codex')) instructionFiles.push(activeOverride ? 'AGENTS.override.md' : 'AGENTS.md');
    if (state.agents.includes('opencode')) instructionFiles.push('AGENTS.md');
  }
  if (state.agents.includes('claude')) instructionFiles.push('CLAUDE.md');
  for (const relative of new Set(instructionFiles)) {
    const file = safePath(root, relative);
    if (!fs.existsSync(file) || !fs.readFileSync(file, 'utf8').includes(BEGIN)) report('ERROR', `Active instructions lack Agent Kit block: ${relative}; rerun setup after reviewing overrides`);
  }
  for (const [relative, expected] of Object.entries(state.files)) {
    const file = safePath(root, relative);
    if (!fs.existsSync(file)) report('ERROR', `Missing installed file: ${relative}; rerun setup`);
    else if (digest(fs.readFileSync(file)) !== expected) report('WARN', `Changed since setup: ${relative}; preserve intentional edits or review --force`);
  }
  for (const name of ['efficient-task', 'efficient-context', 'efficient-handoff']) {
    const folders = state.agents.some(a => a !== 'claude') ? ['.agents/skills'] : [];
    if (state.agents.includes('claude')) folders.push('.claude/skills');
    for (const folder of folders) {
      const relative = `${folder}/${name}/SKILL.md`, file = safePath(root, relative);
      if (!fs.existsSync(file)) report('ERROR', `Missing skill: ${relative}`);
      else {
        const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(fs.readFileSync(file, 'utf8'))?.[1] || '';
        if (!new RegExp(`^name: ["']?${name}["']?\\s*$`, 'm').test(frontmatter) || !/^description: .+/m.test(frontmatter)) report('ERROR', `Invalid skill metadata: ${relative}; review preserved content`);
      }
    }
  }
  if (state.agents.includes('claude') && state.agents.some(a => a !== 'claude')) {
    const shared = safePath(root, '.agents/skills');
    if (fs.existsSync(shared)) for (const name of fs.readdirSync(shared)) {
      const a = safePath(root, `.agents/skills/${name}/SKILL.md`), b = safePath(root, `.claude/skills/${name}/SKILL.md`);
      if (fs.existsSync(a) && fs.existsSync(b) && digest(fs.readFileSync(a)) !== digest(fs.readFileSync(b))) report('ERROR', `Skill copies differ: ${name}; sync reviewed content before using multiple agents`);
    }
  }
  for (const name of ['AGENTS.md', 'AGENTS.override.md', 'CLAUDE.md']) {
    const file = safePath(root, name);
    if (fs.existsSync(file) && fs.statSync(file).size > 8192) report('WARN', `${name} exceeds the advisory 8 KiB local instruction budget; move task-specific detail to references`);
  }
  if (state.agents.includes('pi')) {
    const file = safePath(root, '.pi/settings.json');
    if (fs.existsSync(file)) {
      try { if (JSON.parse(fs.readFileSync(file)).compaction?.enabled === false) report('WARN', 'Pi auto-compaction is disabled in project settings; verify your intended handoff workflow'); }
      catch { report('ERROR', 'Invalid .pi/settings.json'); }
    }
  }
  const conventions = safePath(root, '.agent/references/conventions.md');
  if (fs.existsSync(conventions) && /TODO/.test(fs.readFileSync(conventions, 'utf8'))) report('WARN', 'Fill project commands in .agent/references/conventions.md');
  if (!findings.some(f => f.level === 'ERROR')) report('OK', 'Installed files checked; no missing required artifacts or divergent skill copies');
  report('INFO', 'Static checks only. Client discovery, authentication, native hooks and live provider behavior require a session smoke test.');
  return { schemaVersion: 1, root, agents: state.agents, preset: state.preset, contextTools: state.contextTools, runtimeVerified: false, findings };
}
