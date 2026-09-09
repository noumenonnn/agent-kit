#!/usr/bin/env node
// Optional native loader check. Requires an explicitly supplied local Pi SDK;
// does not download dependencies, create an agent session or invoke a provider.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const kit = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
try {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== '--sdk') throw new Error('Usage: node scripts/smoke-pi.mjs --sdk /path/to/@earendil-works/pi-coding-agent');
  const sdk = fs.realpathSync(args[1]);
  const pkg = JSON.parse(fs.readFileSync(path.join(sdk, 'package.json'), 'utf8'));
  if (pkg.name !== '@earendil-works/pi-coding-agent') throw new Error('Expected the official Pi coding-agent SDK package');
  const { DefaultResourceLoader, SettingsManager } = await import(pathToFileURL(path.join(sdk, 'dist/index.js')).href);
  const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'agent-kit-pi-smoke-')));
  const results = [];
  try {
    for (const scenario of ['project', 'project-ru', 'context-tools', 'context-tools-ru', 'package']) {
      const cwd = path.join(base, scenario), agentDir = path.join(base, `${scenario}-profile`);
      fs.mkdirSync(path.join(cwd, '.git'), { recursive: true });
      fs.mkdirSync(agentDir, { recursive: true });
      if (scenario !== 'package') {
        execFileSync(process.execPath, [path.join(kit, 'scripts/agent-kit.mjs'), 'setup', cwd, '--agents', 'all', '--language', scenario.endsWith('-ru') ? 'ru' : 'en', ...(scenario.startsWith('context-tools') ? ['--with-context-tools'] : [])], { stdio: ['ignore', 'pipe', 'pipe'], timeout: 15000 });
      } else {
        fs.mkdirSync(path.join(cwd, '.pi'), { recursive: true });
        fs.writeFileSync(path.join(cwd, '.pi/settings.json'), JSON.stringify({ packages: [kit] }));
      }
      const settingsManager = SettingsManager.create(cwd, agentDir, { projectTrusted: true });
      const loader = new DefaultResourceLoader({ cwd, agentDir, settingsManager });
      await loader.reload();
      assert.deepEqual(settingsManager.drainErrors(), []);
      const extensions = loader.getExtensions();
      assert.deepEqual(extensions.errors, []);
      const relevant = file => file.startsWith((scenario === 'package' ? kit : cwd) + path.sep);
      const skills = loader.getSkills().skills.filter(s => relevant(s.filePath));
      for (const name of ['efficient-task', 'efficient-context', 'efficient-handoff', 'agent-kit-setup']) assert.ok(skills.some(s => s.name === name), `Pi did not discover ${name} in ${scenario}`);
      assert.equal(skills.length, scenario === 'package' ? 10 : 4, `Unexpected skill discovery: ${scenario}`);
      if (scenario.endsWith('-ru')) for (const skill of skills) assert.match(fs.readFileSync(skill.filePath, 'utf8'), /[а-яё]{3}/i);
      const prompts = loader.getPrompts().prompts.filter(p => relevant(p.filePath));
      assert.equal(prompts.length, 7, `Pi prompts: ${scenario}`);
      assert.ok(prompts.some(p => p.name === 'efficient-task'));
      const diagnostics = [...loader.getSkills().diagnostics, ...loader.getPrompts().diagnostics].filter(d => d.path && relevant(d.path));
      assert.deepEqual(diagnostics, [], `Pi resource diagnostics: ${scenario}`);
      let status = null;
      if (scenario.startsWith('context-tools')) {
        const extension = extensions.extensions.find(e => e.commands.has('context-tools'));
        assert.ok(extension, 'Pi did not register context-tools');
        const notices = [];
        await extension.commands.get('context-tools').handler('status', { cwd, mode: 'tui', hasUI: true, ui: { notify: (message, level) => notices.push({ message, level }) } });
        assert.ok(notices.some(n => /Guard: warn; bulk-reader: OFF/.test(n.message)));
        assert.ok(!notices.some(n => n.level === 'error'));
        status = 'warn; worker OFF (captured UI callback)';
      } else assert.equal(extensions.extensions.length, 0, 'Core/package unexpectedly loaded executable extensions');
      results.push({ scenario, skills: skills.length, prompts: prompts.length, extensions: extensions.extensions.length, status });
    }
  } finally {
    // The absolute target was created above by mkdtemp; never remove a supplied path.
    fs.rmSync(base, { recursive: true, force: true });
  }
  console.log(JSON.stringify({ piVersion: pkg.version, modelCalls: 0, fullTuiVerified: false, results }, null, 2));
} catch (e) { console.error(`ERROR: ${e.stack || e.message}`); process.exitCode = 1; }
