#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

export function transcriptMessages(file) {
  if (!file || !fs.existsSync(file)) return [];
  const fd = fs.openSync(file, 'r');
  try {
    const size = fs.fstatSync(fd).size, start = Math.max(0, size - 1024 * 1024), buffer = Buffer.alloc(size - start);
    fs.readSync(fd, buffer, 0, buffer.length, start);
    const lines = buffer.toString('utf8').split('\n'); if (start) lines.shift();
    return lines.flatMap(line => {
      let record; try { record = JSON.parse(line); } catch { return []; }
      const item = record.type === 'response_item' ? record.payload : record;
      if (item?.type !== 'message' || !['user', 'assistant'].includes(item.role)) return [];
      const text = (item.content || []).filter(c => ['input_text', 'output_text', 'text'].includes(c.type)).map(c => c.text || '').join('\n');
      return text ? [{ role: item.role, text }] : [];
    });
  } finally { fs.closeSync(fd); }
}

function ensure(dir) {
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  if (fs.lstatSync(dir).isSymbolicLink()) throw new Error('Session state directory cannot be a symlink');
}
function activeSpecs(root) {
  const found = [];
  if (!fs.existsSync(root)) return found;
  for (const dir of fs.readdirSync(root, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    const file = path.join(root, dir.name, 'tasks.md');
    if (!fs.existsSync(file)) continue;
    const text = fs.readFileSync(file, 'utf8');
    const pending = (text.match(/^\s*- \[ \]/gm) || []).length;
    const completed = (text.match(/^\s*- \[x\]/gim) || []).length;
    if (pending) found.push({ spec: dir.name, file, pending, completed });
  }
  return found;
}

export function handleLifecycle(event) {
  const cwd = fs.realpathSync(event.cwd || process.cwd()), ai = path.join(cwd, '.ai'), dir = path.join(ai, 'session');
  const at = new Date().toISOString(), stamp = at.replace(/[:.]/g, '-');
  const specs = activeSpecs(path.join(ai, 'specs'));
  if (event.hook_event_name === 'SessionStart' || event.hook_event_name === 'PostCompact') {
    const messages = [];
    if (specs.length) messages.push(`${specs.length} active SDD spec(s): ${specs.map(s => `${s.spec} (${s.pending} pending)`).join(', ')}. Resume with $execute-task --continue.`);
    const runsDir = path.join(ai, 'codex-workflows');
    if (fs.existsSync(runsDir)) for (const file of fs.readdirSync(runsDir).filter(f => f.endsWith('.json')).slice(-100)) {
      try { const run = JSON.parse(fs.readFileSync(path.join(runsDir, file), 'utf8')); if (run.status === 'running') messages.push(`Native run ${run.id}: ${run.phase}; resume and reconnect its existing workers before dispatching more work.`); } catch {}
    }
    if (event.source === 'compact' || event.hook_event_name === 'PostCompact') for (const name of ['business-rules.md', 'architecture.md', 'workflow.md']) {
      const file = path.join(cwd, 'docs/context', name);
      if (fs.existsSync(file)) messages.push(`${name}:\n${fs.readFileSync(file, 'utf8').split('\n').slice(0, 30).join('\n')}`);
    }
    return messages.length ? { hookSpecificOutput: { hookEventName: event.hook_event_name, additionalContext: messages.join('\n') } } : {};
  }
  if (event.hook_event_name === 'PreCompact' || event.hook_event_name === 'SessionEnd') {
    ensure(ai); ensure(dir);
    const checkpoint = { timestamp: at, event: event.hook_event_name, session_id: event.session_id || null, specs };
    if (event.hook_event_name === 'SessionEnd') {
      const readGit = args => { const result = spawnSync('git', ['-C', cwd, ...args], { encoding: 'utf8', timeout: 2000, maxBuffer: 128 * 1024 }); return result.status === 0 ? result.stdout.trim().split('\n').filter(Boolean).slice(0, 50) : null; };
      checkpoint.git = { branch: readGit(['branch', '--show-current']), changes: readGit(['status', '--short']), recent: readGit(['log', '-5', '--oneline']) };
    }
    fs.writeFileSync(path.join(dir, `codex-${event.hook_event_name.toLowerCase()}-${stamp}.json`), JSON.stringify(checkpoint, null, 2), { mode: 0o600 });
    return { systemMessage: 'SDD session checkpoint saved.' };
  }
  if (event.hook_event_name === 'Stop' || event.hook_event_name === 'SubagentStop') {
    if (event.stop_hook_active) return {};
    const messages = transcriptMessages(event.agent_transcript_path || event.transcript_path);
    if (event.last_assistant_message) messages.push({ role: 'assistant', text: event.last_assistant_message });
    const correction = messages.filter(m => m.role === 'user').map(m => m.text).findLast(text => /^(no\b|nope\b|wrong\b|не так\b)|you (forgot|missed|broke)|don't (do|use|add)|я (просив|казав)/im.test(text));
    const verdict = messages.filter(m => m.role === 'assistant').some(m => /\b(CHANGES_REQUIRED|BLOCKED|NOT-RESOLVED)\b/.test(m.text));
    if (!correction && !verdict) return {};
    ensure(ai); ensure(dir);
    const file = path.join(dir, 'lessons.jsonl'), session = event.session_id || 'unknown';
    const signal = correction ? 'user correction' : 'review or fix needs changes';
    const prior = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split('\n').flatMap(l => { try { return [JSON.parse(l)]; } catch { return []; } }) : [];
    if (prior.some(p => p.session === session && p.signal === signal)) return {};
    fs.appendFileSync(file, JSON.stringify({ at, session, signal, excerpt: correction?.slice(0, 200) || '', status: 'pending' }) + '\n', { mode: 0o600 });
    return { systemMessage: `Candidate lesson (${signal}). Use $learn to propose a durable guard; do not change policy or memory without the required user approval.` };
  }
  return {};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(handleLifecycle(JSON.parse(fs.readFileSync(0, 'utf8'))))); }
  catch (error) { console.error(`SDD lifecycle: ${error.message}`); process.exitCode = 1; }
}
