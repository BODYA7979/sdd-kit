import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { WorkflowEngine, WORKFLOWS } from '../runtime/engine.mjs';

const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-native-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}
const args = { description: 'Probe', feature: 'Probe', bug: 'Probe', question: 'Probe', idea: 'Probe', paths: ['src'] };

for (const name of WORKFLOWS) test(`${name}: original workflow starts with a native Detect job`, async t => {
  const engine = new WorkflowEngine({ sourceRoot });
  const started = await engine.start({ name, workspace: fixture(t), args });
  assert.equal(started.status, 'running');
  const job = engine.claim({ id: started.id });
  assert.equal(job.options.phase, 'Detect');
  assert.equal(job.role.name, 'code-explorer');
  assert.ok(job.options.schema);
  assert.ok(job.role.instructions.includes('Stack discovery'));
  engine.stop({ id: started.id, reason: 'Test complete', cancelled: true });
});

test('bad outputs and stale claims cannot advance a workflow', async t => {
  const engine = new WorkflowEngine({ sourceRoot });
  const { id } = await engine.start({ name: 'ship-feature', workspace: fixture(t), args });
  const job = engine.claim({ id });
  await assert.rejects(engine.submit({ id, jobId: job.id, claim: 'wrong', output: {} }), /stale/);
  await assert.rejects(engine.submit({ id, jobId: job.id, claim: job.claim, output: {} }), /schema/);
  assert.equal(engine.status(id).jobs[0].status, 'claimed');
  engine.stop({ id, reason: 'Test complete' });
});

test('claimed work survives restart without being dispatched twice', async t => {
  const workspace = fixture(t);
  const first = new WorkflowEngine({ sourceRoot });
  const { id } = await first.start({ name: 'fix-bug', workspace, args });
  const job = first.claim({ id, worker: 'native-123' });
  const second = new WorkflowEngine({ sourceRoot });
  const resumed = await second.resume({ id, workspace });
  assert.equal(resumed.jobs[0].status, 'claimed');
  assert.equal(resumed.jobs[0].worker, 'native-123');
  assert.throws(() => second.claim({ id, jobId: job.id }), /queued/);
  second.stop({ id, reason: 'Test complete' });
});

test('parallel jobs, schema validation and cached replay preserve a fixed scenario', async t => {
  const workspace = fixture(t), source = fixture(t);
  fs.mkdirSync(path.join(source, 'plugins/sdd-kit/workflows'), { recursive: true });
  fs.writeFileSync(path.join(source, 'plugins/sdd-kit/workflows/tech-research.js'), `export const meta = {};
    const schema = {type:'object',required:['value'],properties:{value:{type:'integer'}}};
    phase('Research');
    const values = await parallel([() => agent('one',{schema}), () => agent('two',{schema})]);
    phase('Decision');
    const final = await agent(JSON.stringify(values), {schema});
    return {values, final};`);
  const first = new WorkflowEngine({ sourceRoot: source, maxActive: 1 });
  const { id } = await first.start({ name: 'tech-research', workspace });
  const a = first.claim({ id });
  assert.throws(() => first.claim({ id }), /Concurrency/);
  await first.submit({ id, jobId: a.id, claim: a.claim, output: { value: 1 } });
  const second = new WorkflowEngine({ sourceRoot: source, maxActive: 1 });
  await second.resume({ id, workspace });
  const b = second.claim({ id });
  assert.equal(b.prompt, 'two');
  await second.submit({ id, jobId: b.id, claim: b.claim, output: { value: 2 } });
  const c = second.claim({ id });
  assert.deepEqual(JSON.parse(c.prompt), [{ value: 1 }, { value: 2 }]);
  const done = await second.submit({ id, jobId: c.id, claim: c.claim, output: { value: 3 } });
  assert.equal(done.status, 'completed');
  assert.deepEqual(done.result, { values: [{ value: 1 }, { value: 2 }], final: { value: 3 } });
  await assert.rejects(second.submit({ id, jobId: c.id, claim: c.claim, output: { value: 3 } }), /stale/);
});

test('state cannot be redirected through a repository symlink', async t => {
  const workspace = fixture(t), outside = fixture(t);
  fs.symlinkSync(outside, path.join(workspace, '.ai'));
  await assert.rejects(new WorkflowEngine({ sourceRoot }).start({ name: 'fix-bug', workspace, args }), /Unsafe/);
  assert.deepEqual(fs.readdirSync(outside), []);
});

test('complete research pipeline preserves upstream results with the same scripted worker evidence', async t => {
  const engine = new WorkflowEngine({ sourceRoot });
  const input = { question: 'Which local format?', options: ['JSON', 'YAML'] };
  const evidence = (prompt, options) => {
    switch (options.phase) {
      case 'Detect': return { repos: [{ role: 'fullstack', path: '.', stack: 'other' }], discovery: { mode: 'unknown', method: 'stacks-dir', errors: [] }, stackManifests: [] };
      case 'Frame': return { criteria: [{ name: 'Existing parser', weight: 'must' }], options: ['JSON', 'YAML'] };
      case 'Research': return options.label === 'codebase-fit' ? { fitNotes: ['Synthetic fixture already uses JSON'], conflicts: [] } : { option: options.label.slice(4), findings: [{ insight: 'Synthetic claim for parity test', source: 'https://example.com/fixture' }] };
      case 'Verify': return { real: false, reason: 'Synthetic claim is intentionally unverified' };
      case 'Decide': return { recommendation: 'JSON', options: [{ name: 'JSON', score: 80 }, { name: 'YAML', score: 60 }], runnerUp: 'YAML', confidence: 'low', openQuestions: ['Human sign-off required'] };
      case 'Document': return { path: '.ai/decisions/0001-fixture.md', adrId: '0001' };
      case 'Report': return 'Fixture report: recommendation only; human sign-off required.';
      default: throw new Error(`Unexpected phase ${options.phase}`);
    }
  };
  const upstreamSource = engine.source('tech-research').replace(/^export const meta\s*=/, 'const meta =');
  const expected = await new vm.Script(`(async () => {${upstreamSource}\n})()`).runInNewContext({ args: input, log() {}, phase() {}, agent: async (prompt, options) => evidence(prompt, options), parallel: tasks => Promise.all(tasks.map(t => t())) });
  let status = await engine.start({ name: 'tech-research', workspace: fixture(t), args: input });
  let count = 0;
  while (status.status === 'running' && count++ < 30) {
    const job = engine.claim({ id: status.id });
    status = await engine.submit({ id: status.id, jobId: job.id, claim: job.claim, output: evidence(job.prompt, job.options) });
  }
  assert.equal(status.status, 'completed');
  assert.equal(status.result.droppedClaims, 2);
  assert.deepEqual(status.result, JSON.parse(JSON.stringify(expected)));
});
