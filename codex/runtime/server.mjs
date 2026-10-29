#!/usr/bin/env node
import readline from 'node:readline';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WorkflowEngine, WORKFLOWS } from './engine.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const engine = new WorkflowEngine({ sourceRoot: path.resolve(here, '../source') });
const field = description => ({ type: 'string', description });
const tools = [
  { name: 'workflow_start', description: 'Start one SDD pipeline after its required human approvals. Returns jobs for native Codex subagents; does not run a model or shell.', inputSchema: { type: 'object', properties: { name: { type: 'string', enum: WORKFLOWS }, workspace: field('Absolute repository or polyrepo workspace root'), args: { description: 'Original workflow arguments', anyOf: [{ type: 'object' }, { type: 'string' }] }, maxActive: { type: 'integer', minimum: 1, maximum: 16 } }, required: ['name', 'workspace'], additionalProperties: false } },
  { name: 'workflow_resume', description: 'Reconnect to persisted workflow state. Claimed work is never repeated automatically.', inputSchema: { type: 'object', properties: { id: field('Run UUID'), workspace: field('Original absolute workspace') }, required: ['id', 'workspace'], additionalProperties: false } },
  { name: 'workflow_status', description: 'Read workflow phase, job states and final result.', inputSchema: { type: 'object', properties: { id: field('Run UUID') }, required: ['id'], additionalProperties: false } },
  { name: 'workflow_claim', description: 'Claim one pending job. Delegate its prompt and role to a fresh native Codex subagent, retaining claim for submission.', inputSchema: { type: 'object', properties: { id: field('Run UUID'), jobId: field('Optional queued job id'), worker: field('Optional native subagent identifier') }, required: ['id'], additionalProperties: false } },
  { name: 'workflow_submit', description: 'Submit an actual native subagent result. Invalid JSON schema or stale claims are rejected without advancing the workflow.', inputSchema: { type: 'object', properties: { id: field('Run UUID'), jobId: field('Claimed job id'), claim: field('Claim token'), output: { description: 'Worker JSON value matching its supplied schema, or a string for a prose-only step' } }, required: ['id', 'jobId', 'claim', 'output'], additionalProperties: false } },
  { name: 'workflow_stop', description: 'Stop a failed or cancelled run. Interrupt its active native subagents separately before calling this tool.', inputSchema: { type: 'object', properties: { id: field('Run UUID'), reason: field('Concrete failure or cancellation reason'), cancelled: { type: 'boolean' } }, required: ['id', 'reason'], additionalProperties: false } },
];

const send = response => process.stdout.write(`${JSON.stringify(response)}\n`);
async function handle(message) {
  if (!Object.hasOwn(message, 'id')) return;
  const response = { jsonrpc: '2.0', id: message.id };
  try {
    if (message.method === 'initialize') response.result = { protocolVersion: ['2024-11-05', '2025-03-26', '2025-06-18'].includes(message.params?.protocolVersion) ? message.params.protocolVersion : '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'sdd-kit-codex', version: '3.1.0-codex.1' } };
    else if (message.method === 'ping') response.result = {};
    else if (message.method === 'tools/list') response.result = { tools };
    else if (message.method === 'tools/call') {
      const { name, arguments: args = {} } = message.params || {};
      let result;
      switch (name) {
        case 'workflow_start': result = await engine.start(args); break;
        case 'workflow_resume': result = await engine.resume(args); break;
        case 'workflow_status': result = engine.status(args.id); break;
        case 'workflow_claim': result = engine.claim(args); break;
        case 'workflow_submit': result = await engine.submit(args); break;
        case 'workflow_stop': result = engine.stop(args); break;
        default: throw new Error('Unknown tool');
      }
      response.result = { content: [{ type: 'text', text: JSON.stringify(result) }] };
    } else { response.error = { code: -32601, message: 'Method not found' }; }
  } catch (error) {
    response.result = { isError: true, content: [{ type: 'text', text: error.message }] };
  }
  send(response);
}
// Serialize requests so two claims/submissions cannot race a state transition.
let queue = Promise.resolve();
readline.createInterface({ input: process.stdin, crlfDelay: Infinity }).on('line', line => {
  queue = queue.then(async () => {
    let message;
    try { message = JSON.parse(line); }
    catch { send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }); return; }
    await handle(message);
  }).catch(error => process.stderr.write(`${error.message}\n`));
});
