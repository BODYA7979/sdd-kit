#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { normalize } from './normalize.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../source');
const allowed = new Set(['block-dangerous.sh', 'check-commit-msg.sh', 'scan-secrets.sh', 'gate-guard.sh',
  'laravel-test-first.sh', 'nextjs-test-first.sh', 'laravel-lint.sh', 'nextjs-lint.sh',
  'session-start.sh', 'post-compact-context.sh', 'prompt-preflight.sh', 'pre-compact-save.sh', 'session-end.sh', 'scan-injection.sh', 'token-budget.sh']);
const name = process.argv[2];
if (!allowed.has(name)) throw new Error('Unknown hook');
const plugin = name.startsWith('laravel-') ? 'sdd-kit-laravel' : name.startsWith('nextjs-') ? 'sdd-kit-nextjs' : 'sdd-kit';
try {
  const event = JSON.parse(fs.readFileSync(0, 'utf8'));
  const cwd = event.cwd || process.cwd();
  const lifecycle = ['SessionStart', 'SessionEnd', 'PreCompact', 'UserPromptSubmit'].includes(event.hook_event_name);
  const outputs = []; let blocked = false;
  for (const input of normalize(event)) {
    let project = cwd;
    if (plugin !== 'sdd-kit') {
      // Each edited file may belong to a different repository in a polyrepo workspace.
      let at = path.dirname(input.tool_input.file_path), found = false;
      while (true) {
        let manifest = {};
        try { manifest = JSON.parse(fs.readFileSync(path.join(at, plugin === 'sdd-kit-laravel' ? 'composer.json' : 'package.json'), 'utf8')); } catch {}
        const deps = { ...manifest.require, ...manifest['require-dev'], ...manifest.dependencies, ...manifest.devDependencies };
        if (plugin === 'sdd-kit-laravel' ? deps['laravel/framework'] : deps.next) { project = at; found = true; break; }
        const parent = path.dirname(at);
        if (parent === at) break;
        at = parent;
      }
      if (!found) continue;
    }
    const result = spawnSync('bash', [path.join(root, 'plugins', plugin, 'scripts', name)], {
      input: JSON.stringify(input), encoding: 'utf8', cwd: project, timeout: 10000,
      env: { ...process.env, CLAUDE_PROJECT_DIR: project,
        CLAUDE_CONTEXT_USAGE: process.env.SDD_CONTEXT_USAGE || '0', CLAUDE_BUDGET_THRESHOLD: process.env.SDD_CONTEXT_THRESHOLD || '75' }, maxBuffer: 1024 * 1024,
    });
    if (result.stderr) process.stderr.write(result.stderr);
    if (result.error || (result.status !== 0 && result.status !== 2)) {
      throw new Error(`Hook ${name} failed: ${result.error?.message || result.status}`);
    }
    blocked ||= result.status === 2;
    if (result.stdout.trim()) {
      try { outputs.push(JSON.parse(result.stdout)); }
      catch { if (lifecycle) outputs.push({ systemMessage: result.stdout.trim() }); else throw new Error(`Invalid output from ${name}`); }
    }
  }
  const context = outputs.map(o => o.hookSpecificOutput?.additionalContext || o.systemMessage).filter(Boolean).join('\n');
  if (blocked) {
    const reason = outputs.map(o => o.hookSpecificOutput?.permissionDecisionReason || o.reason).filter(Boolean).join('\n') || `${name} rejected the operation; see hook diagnostics.`;
    process.stdout.write(JSON.stringify(event.hook_event_name === 'PreToolUse'
      ? { hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason } }
      : { decision: 'block', reason }));
    process.exitCode = 2;
  } else if (context) process.stdout.write(JSON.stringify(['PreCompact', 'SessionEnd'].includes(event.hook_event_name)
    ? { systemMessage: context }
    : { hookSpecificOutput: { hookEventName: event.hook_event_name || 'PostToolUse', additionalContext: context } }));
} catch (error) {
  process.stderr.write(`SDD hook failed: ${error.message}\n`);
  process.exitCode = 2;
}
