import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
test('built plugin launches through its MCP configuration and hands off a native job', { timeout: 15000 }, async t => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd mcp workspace '));
  let child;
  t.after(async () => {
    try {
      if (child?.pid && child.exitCode === null && child.signalCode === null) {
        const exited = once(child, 'exit'); child.kill(); await exited;
      }
    } finally {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  });
  const pluginRoot = path.join(root, 'dist/codex/plugins/sdd-kit');
  const manifest = JSON.parse(fs.readFileSync(path.join(pluginRoot, 'plugin.json'), 'utf8'));
  assert.equal(manifest.$schema, 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json');
  const config = JSON.parse(fs.readFileSync(path.join(pluginRoot, 'mcp.json'), 'utf8'));
  assert.equal(config.$schema, 'https://agent-plugins.org/schemas/1.0.0/mcp.schema.json');
  const server = config.mcpServers['sdd-workflows'];
  assert.equal(server.type, 'stdio');
  // Codex expands this built-in placeholder, without a shell or Claude aliases.
  const args = server.args.map(arg => arg.replaceAll('${PLUGIN_ROOT}', pluginRoot));
  for (const arg of args) assert.doesNotMatch(arg, /\$\{[^}]+\}/, 'MCP arguments must resolve using Codex placeholders');
  child = spawn(server.command, args, { cwd: workspace, env: { ...process.env, ...server.env }, stdio: ['pipe', 'pipe', 'pipe'] });
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
  assert.equal(list.result.tools.length, 11);
  const role = await call('tools/call', { name: 'agent_instructions', arguments: { name: 'code-explorer', workspace } });
  const instructions = JSON.parse(role.result.content[0].text);
  assert.equal(instructions.name, 'code-explorer');
  assert.ok(instructions.instructions.includes('Native stack discovery'));
  for (const file of instructions.preloadSkillPaths) assert.ok(fs.existsSync(file));
  assert.equal(instructions.rulePaths.length, 6);
  for (const file of instructions.rulePaths) assert.ok(fs.existsSync(file));
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
