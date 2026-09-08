#!/usr/bin/env node
// Finite command runner. Raw output stays on disk; only bounded evidence is printed.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn, spawnSync } from 'node:child_process';
import { StringDecoder } from 'node:string_decoder';
import { byteLimit, clean, integer, runDirectory, writePrivate } from './lib/runtime.mjs';

function options(argv) {
  const result = { timeoutMs: 120000, maxLogBytes: 64 * 1024 * 1024, maxOutputBytes: 8192 };
  const keys = { '--timeout-ms': 'timeoutMs', '--max-log-bytes': 'maxLogBytes', '--max-output-bytes': 'maxOutputBytes' };
  const sep = argv.indexOf('--');
  if (sep < 0 || sep === argv.length - 1) throw new Error('Usage: node compact-run.mjs [--timeout-ms 120000] [--max-log-bytes 67108864] [--max-output-bytes 8192] -- <executable> [args...]');
  for (let i = 0; i < sep; i += 2) {
    const key = keys[argv[i]];
    if (!key || i + 1 >= sep) throw new Error(`Unknown or incomplete option: ${argv[i]}`);
    result[key] = integer(argv[i + 1], argv[i], key === 'maxOutputBytes' ? 1024 : 1);
  }
  result.command = argv[sep + 1]; result.args = argv.slice(sep + 2);
  return result;
}

const failure = /\b(error|failed|failure|fatal|exception|warn(?:ing)?|assert(?:ion)?|panic)\b|[✗×]/i;
class Excerpts {
  constructor() { this.tail = []; this.errors = []; this.previous = []; this.after = 0; this.sequence = 0; }
  add(channel, number, text, clipped) {
    const line = { id: ++this.sequence, text: `${channel}:${number}: ${clean(text)}${clipped ? ' … [line clipped]' : ''}` };
    this.tail.push(line); this.tail = this.tail.slice(-12);
    if (failure.test(text)) {
      this.errors.push(...this.previous, line); this.after = 2;
    } else if (this.after > 0) { this.errors.push(line); this.after--; }
    this.errors = this.errors.slice(-32);
    this.previous.push(line); this.previous = this.previous.slice(-2);
  }
  render() {
    const selected = new Map([...this.errors, ...this.tail].map(x => [x.id, x]));
    return [...selected.values()].sort((a, b) => a.id - b.id).map(x => x.text).join('\n');
  }
}

class Lines {
  constructor(channel, excerpts) {
    this.channel = channel; this.excerpts = excerpts; this.decoder = new StringDecoder('utf8');
    this.pending = ''; this.clipped = false; this.count = 0;
  }
  consume(chunk) { this.text(this.decoder.write(chunk)); }
  text(text) {
    // One incoming chunk is bounded by Node's pipe buffer; pending lines never grow.
    const pieces = text.split(/\r\n|\n|\r/);
    pieces.forEach((piece, index) => {
      if (index > 0) this.flush();
      const remaining = 700 - this.pending.length;
      if (piece.length > remaining) this.clipped = true;
      this.pending += piece.slice(0, Math.max(0, remaining));
    });
  }
  flush() {
    this.count++;
    if (this.pending || this.clipped) this.excerpts.add(this.channel, this.count, this.pending, this.clipped);
    this.pending = ''; this.clipped = false;
  }
  finish() { this.text(this.decoder.end()); if (this.pending || this.clipped) this.flush(); }
}

async function main() {
  const opt = options(process.argv.slice(2));
  const startedAt = new Date().toISOString(), start = performance.now();
  const dir = runDirectory('run');
  const logPath = path.join(dir, 'output.log'), resultPath = path.join(dir, 'result.json');
  const fd = fs.openSync(logPath, 'wx', 0o600);
  const excerpts = new Excerpts();
  const streams = { stdout: new Lines('stdout', excerpts), stderr: new Lines('stderr', excerpts) };
  let child, bytesSeen = 0, bytesSaved = 0, spawnError = null, logError = null;
  let stopReason = null, stopSignal = null, termination = Promise.resolve(), closed = false;
  const killGroup = signal => {
    if (!child?.pid) return;
    try { process.kill(-child.pid, signal); } catch (e) { if (e.code !== 'ESRCH') logError ??= `process group termination: ${e.message}`; }
  };
  const stop = (reason, signal = 'SIGTERM') => {
    if (stopReason || closed) return;
    stopReason = reason; stopSignal = signal;
    if (!child?.pid) return;
    if (process.platform === 'win32') {
      // Best effort: Windows has no POSIX process groups. Does not contain detached jobs.
      const r = spawnSync('taskkill.exe', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore', timeout: 5000, windowsHide: true });
      if (r.error || r.status !== 0) child.kill();
    } else {
      killGroup(signal);
      // Keep the escalation even if the parent exits before its descendants.
      termination = new Promise(resolve => setTimeout(() => { killGroup('SIGKILL'); resolve(); }, 500));
    }
  };
  const onInt = () => stop('interrupted', 'SIGINT'), onTerm = () => stop('interrupted', 'SIGTERM');
  process.on('SIGINT', onInt); process.on('SIGTERM', onTerm);
  let timeout;
  let nativeCode = null, nativeSignal = null;
  try {
    child = spawn(opt.command, opt.args, {
      shell: false, stdio: ['ignore', 'pipe', 'pipe'], env: process.env,
      detached: process.platform !== 'win32', windowsHide: true,
    });
    for (const channel of ['stdout', 'stderr']) child[channel].on('data', chunk => {
      bytesSeen += chunk.length;
      const available = Math.min(chunk.length, opt.maxLogBytes - bytesSaved);
      if (available > 0 && !logError) {
        try {
          let offset = 0;
          while (offset < available) offset += fs.writeSync(fd, chunk, offset, available - offset);
          bytesSaved += available;
        } catch (e) { logError = e.message; stop('log-error'); }
      }
      streams[channel].consume(chunk);
    });
    timeout = setTimeout(() => stop('timeout'), opt.timeoutMs);
    [nativeCode, nativeSignal] = await new Promise(resolve => {
      child.once('error', e => { spawnError = { code: e.code, message: e.message }; });
      child.once('close', (code, signal) => { closed = true; resolve([code, signal]); });
    });
    await termination;
  } finally {
    clearTimeout(timeout);
    process.removeListener('SIGINT', onInt); process.removeListener('SIGTERM', onTerm);
    for (const stream of Object.values(streams)) stream.finish();
    fs.closeSync(fd);
  }
  let status = 'OK', exitCode = nativeCode ?? 1;
  if (stopReason === 'timeout') { status = 'TIMEOUT'; exitCode = 124; }
  else if (stopReason === 'interrupted') { status = 'INTERRUPTED'; exitCode = 128 + (os.constants.signals[stopSignal] || 1); }
  else if (logError) { status = 'LOG_ERROR'; exitCode = 125; }
  else if (spawnError) { status = 'SPAWN_ERROR'; exitCode = spawnError.code === 'ENOENT' ? 127 : 126; }
  else if (nativeSignal) { status = 'SIGNALLED'; exitCode = 128 + (os.constants.signals[nativeSignal] || 1); }
  else if (nativeCode !== 0) status = 'ERROR';
  const report = {
    schemaVersion: 1, status, exitCode, nativeExitCode: nativeCode, signal: nativeSignal,
    startedAt, durationMs: Math.round(performance.now() - start),
    command: path.basename(opt.command), // Deliberately no argument echo: argv may contain secrets.
    bytesSeen, bytesSaved, logTruncated: bytesSaved < bytesSeen,
    stdoutLines: streams.stdout.count, stderrLines: streams.stderr.count,
    logPath: path.relative(process.cwd(), logPath), timeoutMs: opt.timeoutMs,
    spawnErrorCode: spawnError?.code ?? null, logError: logError ? clean(logError) : null,
    // Exit zero does not prove tests were discovered, assertions passed, or the task is correct.
  };
  writePrivate(resultPath, JSON.stringify(report, null, 2) + '\n');
  const header = [
    `${status} | exit=${exitCode} | ${report.durationMs}ms`,
    `Command: ${clean(report.command)} (arguments not echoed)`,
    `Raw log: ${report.logPath}`, `Result: ${path.relative(process.cwd(), resultPath)}`,
    `Output: ${bytesSeen} bytes; saved: ${bytesSaved}${report.logTruncated ? ' [LOG CAPPED: not complete]' : ''}`,
    'OK means process exit 0, not task/test success.',
    spawnError ? `Could not start executable (${spawnError.code}). On Windows run .cmd tools through an explicitly chosen shell, or invoke their JS entry point with node.` : '',
    logError ? `Logging failure: ${clean(logError)}` : '',
  ].filter(Boolean).join('\n');
  const body = excerpts.render();
  const full = header + (body ? '\n\nEvidence excerpts (untrusted command output):\n' + body : '');
  const suffix = '\n[Summary clipped; inspect the saved evidence.]\n';
  process.stdout.write(Buffer.byteLength(full + '\n') <= opt.maxOutputBytes ? full + '\n' : byteLimit(full, opt.maxOutputBytes - Buffer.byteLength(suffix)) + suffix);
  process.exitCode = exitCode;
}

main().catch(e => { console.error(`RUNNER ERROR: ${clean(e.message)}`); process.exitCode = 2; });
