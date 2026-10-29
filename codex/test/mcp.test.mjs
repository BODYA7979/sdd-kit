import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
test('built plugin exposes MCP tools and hands off a native job', { timeout: 15000 }, async t => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-mcp-'));
  const child = spawn(process.execPath, [path.join(root, 'dist/sdd-kit-codex/runtime/server.mjs')], { stdio: ['pipe', 'pipe', 'pipe'] });
  t.after(async () => {
    const exited = once(child, 'exit'); child.kill(); await exited;
    fs.rmSync(workspace, { recursive: true, force: true });
  });
  const waiting = new Map(); let seq = 0;
  readline.createInterface({ input: child.stdout }).on('line', line => {
    const result = JSON.parse(line); waiting.get(result.id)?.(result); waiting.delete(result.id);
  });
  const call = (method, params) => new Promise(resolve => {
    const id = ++seq; waiting.set(id, resolve);
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });
  const init = await call('initialize', { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'test', version: '1' } });
  assert.equal(init.result.protocolVersion, '2025-03-26');
  const list = await call('tools/list', {});
  assert.equal(list.result.tools.length, 6);
  const start = await call('tools/call', { name: 'workflow_start', arguments: { name: 'tech-research', workspace, args: { question: 'Compare local file formats' } } });
  const run = JSON.parse(start.result.content[0].text);
  assert.equal(run.status, 'running');
  const claim = await call('tools/call', { name: 'workflow_claim', arguments: { id: run.id } });
  const job = JSON.parse(claim.result.content[0].text);
  assert.equal(job.role.name, 'code-explorer');
  assert.equal(job.options.phase, 'Detect');
  const bad = await call('tools/call', { name: 'workflow_submit', arguments: { id: run.id, jobId: job.id, claim: job.claim, output: {} } });
  assert.equal(bad.result.isError, true);
  const stop = await call('tools/call', { name: 'workflow_stop', arguments: { id: run.id, reason: 'Integration probe complete', cancelled: true } });
  assert.equal(JSON.parse(stop.result.content[0].text).status, 'cancelled');
});
