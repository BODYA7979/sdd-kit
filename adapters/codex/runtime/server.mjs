#!/usr/bin/env node
import readline from 'node:readline';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { WorkflowEngine, WORKFLOWS } from './engine.mjs';
import Ajv from 'ajv';

const here = path.dirname(fileURLToPath(import.meta.url));
const { version } = JSON.parse(fs.readFileSync(path.join(here, '../package.json'), 'utf8'));
const engine = new WorkflowEngine({ sourceRoot: path.resolve(here, '../source') });
const field = description => ({ type: 'string', description });
const tools = [
  { name: 'agent_instructions', description: 'Read the shared SDD agent role and preload skill paths for direct skill delegation. Pass the returned instructions to a fresh native Codex subagent; this does not launch a model.', inputSchema: { type: 'object', properties: { name: field('SDD agent name or plugin:name'), workspace: field('Absolute workspace root') }, required: ['name', 'workspace'], additionalProperties: false } },
  { name: 'workflow_start', description: 'Start one SDD pipeline after its required human approvals. Returns jobs for native Codex subagents; does not run a model or shell.', inputSchema: { type: 'object', properties: { name: { type: 'string', enum: WORKFLOWS }, workspace: field('Absolute repository or polyrepo workspace root'), args: { description: 'Original workflow arguments', anyOf: [{ type: 'object' }, { type: 'string' }] }, maxActive: { type: 'integer', minimum: 1, maximum: 16 } }, required: ['name', 'workspace'], additionalProperties: false } },
  { name: 'workflow_resume', description: 'Reconnect to persisted workflow state. Claimed work is never repeated automatically.', inputSchema: { type: 'object', properties: { id: field('Run UUID'), workspace: field('Original absolute workspace') }, required: ['id', 'workspace'], additionalProperties: false } },
  { name: 'workflow_status', description: 'Read workflow phase, job states and final result.', inputSchema: { type: 'object', properties: { id: field('Run UUID') }, required: ['id'], additionalProperties: false } },
  { name: 'workflow_claim', description: 'Claim one pending job. Delegate its prompt and role to a fresh native Codex subagent, retaining claim for submission.', inputSchema: { type: 'object', properties: { id: field('Run UUID'), jobId: field('Optional queued job id'), worker: field('Optional native subagent identifier') }, required: ['id'], additionalProperties: false } },
  { name: 'workflow_submit', description: 'Submit an actual native subagent result. Invalid JSON schema or stale claims are rejected without advancing the workflow.', inputSchema: { type: 'object', properties: { id: field('Run UUID'), jobId: field('Claimed job id'), claim: field('Claim token'), output: { description: 'Worker JSON value matching its supplied schema, or a string for a prose-only step' } }, required: ['id', 'jobId', 'claim', 'output'], additionalProperties: false } },
  { name: 'workflow_stop', description: 'Stop a failed or cancelled run. Interrupt its active native subagents separately before calling this tool.', inputSchema: { type: 'object', properties: { id: field('Run UUID'), reason: field('Concrete failure or cancellation reason'), cancelled: { type: 'boolean' } }, required: ['id', 'reason'], additionalProperties: false } },
  { name: 'workflow_reconnect', description: 'Bind a just-spawned native worker or recover the packet and claim token for its existing job. Does not dispatch new work.', inputSchema: { type: 'object', properties: { id: field('Run UUID'), jobId: field('Claimed job'), worker: field('Original native worker id') }, required: ['id', 'jobId', 'worker'], additionalProperties: false } },
  { name: 'workflow_retry_review', description: 'After correcting an existing report that failed independent completion review, reread that report and request a fresh reviewer. Preserves all original machine verdicts and never repeats implementation jobs.', inputSchema: { type: 'object', properties: { id: field('Blocked run UUID'), correction: { type: 'string', minLength: 1, maxLength: 2000 } }, required: ['id', 'correction'], additionalProperties: false } },
  { name: 'stack_list', description: 'Inspect native project/user stack manifests, command fields and exact trust hashes before approval.', inputSchema: { type: 'object', properties: { workspace: field('Absolute workspace root') }, required: ['workspace'], additionalProperties: false } },
  { name: 'stack_approve', description: 'After the human explicitly approves the displayed commands and SHA-256, trust that exact stack manifest. Never invoke automatically on behalf of a worker.', inputSchema: { type: 'object', properties: { workspace: field('Absolute workspace root'), source: field('Exact source from stack_list'), sha256: field('Exact SHA-256 approved by the human') }, required: ['workspace', 'source', 'sha256'], additionalProperties: false } },
];
const validator = new Ajv({ strict: false, allErrors: true });
const inputs = new Map(tools.map(tool => [tool.name, validator.compile(tool.inputSchema)]));
for (const tool of tools) tool.annotations = { readOnlyHint: ['workflow_status', 'stack_list', 'agent_instructions'].includes(tool.name), destructiveHint: false, openWorldHint: false };

const send = response => process.stdout.write(`${JSON.stringify(response)}\n`);
async function handle(message) {
  if (!message || typeof message !== 'object' || Array.isArray(message) || message.jsonrpc !== '2.0' || typeof message.method !== 'string') {
    send({ jsonrpc: '2.0', id: message?.id ?? null, error: { code: -32600, message: 'Invalid request' } }); return;
  }
  if (!Object.hasOwn(message, 'id')) return;
  const response = { jsonrpc: '2.0', id: message.id };
  try {
    if (message.method === 'initialize') response.result = { protocolVersion: ['2024-11-05', '2025-03-26', '2025-06-18'].includes(message.params?.protocolVersion) ? message.params.protocolVersion : '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'sdd-kit', version } };
    else if (message.method === 'ping') response.result = {};
    else if (message.method === 'tools/list') response.result = { tools };
    else if (message.method === 'tools/call') {
      const { name, arguments: args = {} } = message.params || {};
      const validate = inputs.get(name);
      if (!validate || !validate(args)) throw new Error(validate ? `Invalid tool arguments: ${validator.errorsText(validate.errors)}` : 'Unknown tool');
      let result;
      switch (name) {
        case 'agent_instructions': {
          if (!path.isAbsolute(args.workspace) || !fs.statSync(args.workspace).isDirectory()) throw new Error('workspace must be an absolute directory');
          result = engine.role(args.name, fs.realpathSync(args.workspace));
          if (result.name === 'general-purpose' && args.name !== 'general-purpose') throw new Error('Unknown SDD agent role');
          break;
        }
        case 'workflow_start': result = await engine.start(args); break;
        case 'workflow_resume': result = await engine.resume(args); break;
        case 'workflow_status': result = engine.status(args.id); break;
        case 'workflow_claim': result = engine.claim(args); break;
        case 'workflow_submit': result = await engine.submit(args); break;
        case 'workflow_stop': result = engine.stop(args); break;
        case 'workflow_reconnect': result = engine.reconnect(args); break;
        case 'workflow_retry_review': result = await engine.retryReview(args); break;
        case 'stack_list': result = await engine.stacks.list(args.workspace); break;
        case 'stack_approve': result = await engine.stacks.approve(args); break;
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
process.on('SIGTERM', () => { engine.close(); process.exit(0); });
process.on('SIGINT', () => { engine.close(); process.exit(0); });
process.stdin.on('end', () => { queue.finally(() => { engine.close(); }); });
readline.createInterface({ input: process.stdin, crlfDelay: Infinity }).on('line', line => {
  queue = queue.then(async () => {
    let message;
    try { message = JSON.parse(line); }
    catch { send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }); return; }
    await handle(message);
  }).catch(error => process.stderr.write(`${error.message}\n`));
});
