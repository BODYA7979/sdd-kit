import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import { WorkflowEngine } from '../adapters/codex/runtime/engine.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const decisions = [
  { decision: 'Accept decimal operands only; reject 0x, 0b and 0o prefixes', rationale: 'The agreed CLI input contract' },
  { decision: 'Imports have no side effects', rationale: 'Reusable arithmetic functions' },
  { decision: 'Use local-only ci.sh; do not generate hosted CI configuration', rationale: 'Offline project scope' },
];
const valid = () => ({ resolved: true, steps: [{ step: 'CLI', expected: '5', actual: '5', ok: true }], brokenLinks: [], architectureChecks: decisions.map((d, decisionIndex) => ({ decisionIndex, ok: true, evidence: `Verified ${d.decision}` })) });

async function scenario(t, acceptance, host) {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-greenfield-'));
  const engine = new WorkflowEngine({ sourceRoot: root });
  t.after(() => { engine.close(); fs.rmSync(workspace, { recursive: true, force: true }); });
  const stackContext = await engine.stacks.context(workspace);
  const prompts = [];
  const logs = [];
  const evidence = (prompt, options) => {
    prompts.push({ prompt, ...options });
    switch (options.phase) {
      case 'Detect': return { greenfield: true, targets: [{ role: 'fullstack', path: '.', stack: 'other', empty: true, hasTrackedFiles: false }], ...stackContext };
      case 'Constitution': return { principles: ['No dependencies'] };
      case 'Architecture': return options.label ? { real: true, reason: 'Fixture proposal accepted' } : { repoLayout: 'single', layers: ['CLI', 'pure functions'], dataModelSketch: [], firstSlice: { title: 'Add two numbers', entryPoint: 'node index.js 2 3', expectedEndState: 'Print 5', touchesRepos: ['.'] }, decisions };
      case 'Scaffold': return options.label.startsWith('ci:') ? { configured: true, files: ['ci.sh'], jobs: [], committed: true } : { created: ['index.js'], committed: true, gateCheck: [{ name: 'test', ran: true }] };
      case 'Slice': return { summary: 'Fixture implementation', changedFiles: ['index.js'], completed: true };
      case 'Gates': return { repo: '.', allPassed: true, gates: [{ name: 'test', status: 'pass', details: 'Fixture tests' }] };
      case 'Acceptance': return acceptance;
      case 'Handoff': return { files: ['architecture.md'] };
      case 'Report': return options.label === 'backlog' ? { path: 'backlog.md' } : 'Fixture report';
      case 'CompletionReview': return { verdict: 'PASS', reason: 'Synthetic scenario checks machine decisions only' };
      default: throw new Error(`Unexpected phase ${options.phase}`);
    }
  };
  let result;
  if (host === 'claude') {
    const source = engine.source('greenfield-build').replace(/^export const meta\s*=/, 'const meta =');
    result = await new vm.Script(`(async () => {${source}\n})()`).runInNewContext({ args: { idea: 'Add two numbers', stack: 'other' }, log: message => logs.push(message), phase() {}, budget: { total: 0 }, agent: async (prompt, options) => evidence(prompt, options), parallel: tasks => Promise.all(tasks.map(task => task())) });
  } else {
    let status = await engine.start({ name: 'greenfield-build', workspace, args: { idea: 'Add two numbers', stack: 'other' } });
    let count = 0;
    while (status.status === 'running' && count++ < 25) {
      const job = engine.claim({ id: status.id });
      status = await engine.submit({ id: status.id, jobId: job.id, claim: job.claim, output: evidence(job.prompt, job.options) });
    }
    assert.equal(status.status, 'completed'); result = status.result; logs.push(...status.logs);
  }
  return { result, prompts, logs };
}

for (const host of ['claude', 'codex']) {
  test(`${host}: greenfield passes the architecture to builders and checks every decision`, async t => {
    const { result, prompts } = await scenario(t, valid(), host);
    assert.equal(result.recommendation, 'SHIP-SLICE');
    assert.equal(result.architectureImplemented, true);
    for (const phase of ['Slice', 'Acceptance']) {
      const prompt = prompts.find(p => p.phase === phase).prompt;
      for (const { decision } of decisions) assert.ok(prompt.includes(decision), `${phase} omitted ${decision}`);
    }
    const ciPrompt = prompts.find(p => p.label?.startsWith('ci:')).prompt;
    for (const { decision } of decisions) assert.ok(ciPrompt.includes(decision), `CI omitted ${decision}`);
    assert.match(ciPrompt, /local-only.*do not add a hosted workflow/i);
    const schema = prompts.find(p => p.phase === 'Acceptance').schema;
    assert.equal(new Ajv({ strict: false }).compile(schema)({ resolved: true, steps: [] }), false);
  });
  for (const [name, mutate] of [
    ['failed architecture check', value => { value.architectureChecks[0].ok = false; value.architectureChecks[0].evidence = '0x10 2 printed 18 instead of being rejected'; }],
    ['omitted decision', value => value.architectureChecks.pop()],
    ['duplicate decision', value => { value.architectureChecks[1].decisionIndex = 0; }],
    ['invented decision', value => { value.architectureChecks[1].decisionIndex = 99; }],
    ['failed journey step', value => { value.steps[0].ok = false; }],
    ['empty journey evidence', value => { value.steps = []; }],
    ['broken hop', value => { value.brokenLinks = ['/missing']; }],
  ]) test(`${host}: greenfield cannot ship with ${name} even when resolved=true`, async t => {
    const acceptance = valid(); mutate(acceptance);
    const { result, prompts, logs } = await scenario(t, acceptance, host);
    assert.equal(result.recommendation, 'FIX-FIRST');
    assert.equal(result.acceptanceResolved, false);
    assert.match(prompts.find(p => p.label === 'backlog').prompt, /NOT shippable/);
    assert.ok(logs.some(message => message.startsWith('Acceptance: NOT resolved')));
    assert.ok(prompts.some(p => p.phase === 'Report' && p.prompt.includes('Computed recommendation: FIX-FIRST')));
  });
}
