import { ContextError, loadConfig, projectRoot, inspectRead, normalizeRelative, validateScopes, modelIdentity, modelFingerprint, parseConfig } from './core.mjs';
import { executeBulk } from './worker.mjs';

const notify = (ctx, message, level = 'info') => { if (ctx.hasUI) ctx.ui.notify(message, level); };
const blocked = (code, message, attempted = false) => ({ content: [{ type: 'text', text: `BULK_READ_BLOCKED (${code}): ${message}` }], details: { outcome: code, attempted } });

export function registerContextTools(pi, schema) {
  const state = { epoch: 0, root: null, config: parseConfig(), configError: null, consent: null, busy: false, warnings: new Set(), allowOnce: new Set() };
  function revoke() {
    state.epoch++; state.consent?.controller.abort(); state.consent = null; state.allowOnce.clear();
  }
  function initialize(ctx) {
    revoke(); state.root = projectRoot(ctx.cwd); state.warnings.clear(); state.configError = null;
    try { state.config = loadConfig(state.root); }
    catch { state.configError = 'Invalid context-tools.json; worker is disabled. Fix configuration and /reload.'; state.config = parseConfig(); notify(ctx, state.configError, 'warning'); }
  }
  function currentRoot(ctx) {
    const root = projectRoot(ctx.cwd);
    if (state.root !== root) initialize(ctx);
    return root;
  }
  pi.on('session_start', (_event, ctx) => initialize(ctx));
  for (const event of ['session_shutdown', 'session_before_switch', 'session_before_fork', 'session_before_tree']) pi.on(event, () => { revoke(); });
  pi.on('turn_start', () => { state.warnings.clear(); });
  pi.on('tool_call', (event, ctx) => {
    if (event.toolName !== 'read') return;
    try {
      const root = currentRoot(ctx), result = inspectRead(root, event.input, state.config.guard);
      if (!['large', 'unmeasured'].includes(result.kind)) return;
      if (state.allowOnce.delete(result.path)) return;
      const reason = result.kind === 'large'
        ? `Read exceeds ${result.cap} bytes for the requested range. Use grep + bounded offset/limit, or bulk_read only if user-enabled. For exact full content ask the user for /context-tools allow-read. No automatic delegation was performed.`
        : `Read range could not be measured within the local scan budget. Prefer an explicit small range. No automatic delegation was performed.`;
      if (state.config.guard.mode === 'enforce' && result.kind === 'large') return { block: true, reason };
      const key = `${result.path}:${event.input.offset || 1}:${event.input.limit || 'all'}:${result.stamp || ''}`;
      if (!state.warnings.has(key)) { notify(ctx, `[context-tools] ${JSON.stringify(result.path)}: ${reason}`, 'warning'); state.warnings.add(key); }
    } catch { /* An advisory cost guard must not disable core Read on its own errors. */ }
  });

  pi.registerCommand('context-tools', {
    description: 'status | enable | disable | warn | enforce | off | allow-read (delegation consent is session-only)',
    handler: async (args, ctx) => {
      try {
        const root = currentRoot(ctx), action = (args || 'status').trim(), epoch = state.epoch;
        // RPC has hasUI=true, but the MVP deliberately requires a human terminal session.
        if (action !== 'status' && (ctx.mode !== 'tui' || !ctx.hasUI)) throw new ContextError('INTERACTIVE_ONLY', 'Use a trusted interactive Pi terminal session');
        if (action === 'status') {
          const c = state.consent;
          notify(ctx, `Guard: ${state.config.guard.mode}; bulk-reader: ${c ? `${c.model.provider}/${c.model.id} (${c.calls}/${c.limits.maxCallsPerSession} attempts)` : 'OFF'}. ${c ? `Approved paths: ${JSON.stringify(c.scopes)}` : 'No code will be sent by this module until you run /context-tools enable.'}${state.configError ? ` ${state.configError}` : ''}`);
        } else if (action === 'disable') {
          revoke(); notify(ctx, 'Bulk-reader disabled; any active request was cancelled. Provider usage may already have occurred.');
        } else if (['off', 'warn', 'enforce'].includes(action)) {
          if (action === 'enforce' && !(await ctx.ui.confirm('Enforce read budget?', 'Large measured Read calls will be blocked. Small ranges remain available; no worker is invoked automatically. Bash/PowerShell reads are NOT blocked by this guard.'))) return;
          state.config = parseConfig({ ...state.config, guard: { ...state.config.guard, mode: action } });
          notify(ctx, `Read guard is ${action} for this session. This is a cost guard, not a sandbox.`);
        } else if (action === 'allow-read') {
          const raw = await ctx.ui.input('Allow ONE large Read of this project-relative path:', 'src/large-file.ts');
          if (!raw?.trim()) return;
          const relative = normalizeRelative(raw.trim());
          if (await ctx.ui.confirm('Allow one full Read?', `${JSON.stringify(relative)} may increase the main model context. No delegation is authorized by this action.`)) { if (state.epoch !== epoch) throw new ContextError('SESSION_CHANGED', 'Session changed during confirmation; ask again'); state.allowOnce.add(relative); notify(ctx, 'One read allowance recorded.'); }
        } else if (action === 'enable') {
          if (state.busy) throw new ContextError('BUSY', 'Wait for the current bulk-read or disable it first');
          if (state.configError) throw new ContextError('INVALID_CONFIG', state.configError);
          if (typeof ctx.modelRegistry?.streamSimple !== 'function') throw new ContextError('PI_CAPABILITY', 'This Pi lacks modelRegistry.streamSimple. Leave bulk-reader disabled and use a compatible Pi version.');
          const available = await ctx.modelRegistry.getAvailable();
          const scopeKeys = new Set((ctx.scopedModels || []).map(s => `${s.model.provider}/${s.model.id}`));
          const models = available.filter(m => (!scopeKeys.size || scopeKeys.has(`${m.provider}/${m.id}`)) && (!m.input || m.input.includes('text')));
          if (!models.length) throw new ContextError('NO_MODEL', 'No authenticated text models in the current Pi model scope; use /login and /model first');
          const provider = await ctx.ui.select('Choose the worker provider (code will be sent here):', [...new Set(models.map(m => m.provider))].sort());
          if (!provider) return;
          const modelId = await ctx.ui.select('Choose a reliable low-cost worker model:', models.filter(m => m.provider === provider).map(m => m.id).sort());
          if (!modelId) return;
          const model = models.find(m => m.provider === provider && m.id === modelId);
          const rawScopes = await ctx.ui.input('Allowed project paths as JSON (no whole-project wildcard):', '["src","tests"]');
          if (!rawScopes?.trim()) return;
          let parsed;
          try { parsed = JSON.parse(rawScopes); } catch { throw new ContextError('INVALID_SCOPE', 'Expected a JSON array, e.g. ["src","tests"]'); }
          const scopes = validateScopes(root, parsed), identity = modelIdentity(model);
          const consentText = `Allow this module to send selected UTF-8 source text and your question to ${provider}/${modelId} (${identity.endpointOrigin}) in this Pi session?\nProject: ${root}\nPaths: ${JSON.stringify(scopes)}\nUp to ${state.config.worker.maxFiles} files and ${state.config.worker.maxInputBytes} request bytes per call; ${state.config.worker.maxCallsPerSession} attempts per session; ${state.config.worker.maxOutputTokens} output tokens per call; ${state.config.worker.timeoutMs} ms timeout.\nWorker has NO tools. Review source for inline secrets; filename filtering is not a secret scanner. Charges/caching depend on the configured provider. No automatic retry/failover. You may revoke with /context-tools disable.`;
          if (!(await ctx.ui.confirm('Authorize scoped source delegation?', consentText))) return;
          if (state.epoch !== epoch || projectRoot(ctx.cwd) !== root) throw new ContextError('SESSION_CHANGED', 'Session changed during approval; run enable again');
          revoke();
          state.consent = { root, model, limits: state.config.worker, fingerprint: modelFingerprint(model), scopes: Object.freeze([...scopes]), controller: new AbortController(), calls: 0 };
          notify(ctx, 'Bulk-reader enabled for the approved model/paths in this session only. Read guard mode was not changed.');
        } else throw new ContextError('UNKNOWN_COMMAND', 'Use status, enable, disable, warn, enforce, off or allow-read');
      } catch (e) { notify(ctx, e instanceof ContextError ? `${e.code}: ${e.message}` : 'Configuration action failed; no new delegation permission was granted.', 'error'); }
    },
  });

  pi.registerTool({
    name: 'bulk_read', label: 'Bulk read with evidence',
    description: 'Answer one narrow code question from explicit files/ranges using a user-approved worker. Read-only, one model call, no tools or session history. Only after the user enables /context-tools enable; otherwise use bounded Read. Returns quote-checked paths/lines and usage, not guaranteed semantic truth. Re-read exact current source before editing.',
    parameters: schema,
    async execute(_id, params, signal, _onUpdate, ctx) {
      if (ctx.mode !== 'tui') return blocked('INTERACTIVE_ONLY', 'This optional worker is supported only in a human-approved terminal session');
      const root = currentRoot(ctx), consent = state.consent;
      if (!consent || consent.root !== root) return blocked('CONSENT_REQUIRED', 'Ask the user to run /context-tools enable, or continue with targeted reads. Do not edit config to grant yourself permission.');
      if (state.busy) return blocked('BUSY', 'One bulk-reader request at a time; do not launch parallel retries.');
      if (consent.calls >= consent.limits.maxCallsPerSession) return blocked('CALL_BUDGET', 'Session attempt budget reached. Only the user may renew it.');
      const current = ctx.modelRegistry.find(consent.model.provider, consent.model.id);
      if (!current || modelFingerprint(current) !== consent.fingerprint) { revoke(); return blocked('MODEL_CHANGED', 'Configured worker identity, endpoint or pricing changed; request fresh user approval.'); }
      state.busy = true;
      const attemptsBefore = consent.calls;
      try {
        return await executeBulk({ root, request: params, scopes: consent.scopes, limits: consent.limits,
          model: current, signal, revokedSignal: consent.controller.signal,
          invoke: async (context, options) => {
            if (state.consent !== consent || consent.controller.signal.aborted) throw new ContextError('CANCELLED', 'Permission revoked');
            const latest = ctx.modelRegistry.find(consent.model.provider, consent.model.id);
            if (!latest || modelFingerprint(latest) !== consent.fingerprint) {
              revoke(); throw new ContextError('MODEL_CHANGED', 'Worker configuration changed before dispatch');
            }
            consent.calls++; // Every registry invocation attempt counts, including failed/timed-out requests.
            const stream = await ctx.modelRegistry.streamSimple(latest, context, options);
            return await stream.result();
          } });
      } catch (e) {
        return blocked(e instanceof ContextError ? e.code : 'LOCAL_ERROR', e instanceof ContextError ? e.message : 'Local worker failure; inspect settings/paths and receipts before retrying. Billing may be unknown.', consent.calls > attemptsBefore);
      } finally { state.busy = false; }
    },
  });
  // Read-only diagnostics for offline adapter tests, not a permission-granting API.
  return { status: () => ({ mode: state.config.guard.mode, enabled: Boolean(state.consent), busy: state.busy, attempts: state.consent?.calls || 0 }) };
}
