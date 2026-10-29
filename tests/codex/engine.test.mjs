import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { WorkflowEngine, WORKFLOWS } from '../../adapters/codex/runtime/engine.mjs';

const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-native-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}
const args = { description: 'Probe', feature: 'Probe', bug: 'Probe', question: 'Probe', idea: 'Probe', paths: ['src'] };

test('workflow jobs use native project instructions while canonical source stays unchanged', async t => {
  const source = fixture(t), workspace = fixture(t);
  fs.mkdirSync(path.join(source, 'plugins/sdd-kit/workflows'), { recursive: true });
  const file = path.join(source, 'plugins/sdd-kit/workflows/greenfield-build.js');
  const script = "export const meta = {}; return await agent('Read CLAUDE.md and .claude/stacks before scaffolding');";
  fs.writeFileSync(file, script);
  const engine = new WorkflowEngine({ sourceRoot: source });
  const { id } = await engine.start({ name: 'greenfield-build', workspace });
  assert.equal(engine.claim({ id }).prompt, 'Read AGENTS.md and .codex/stacks before scaffolding');
  assert.equal(fs.readFileSync(file, 'utf8'), script);
  engine.stop({ id, reason: 'Test complete', cancelled: true });
  engine.close();
});

for (const name of WORKFLOWS) test(`${name}: original workflow starts with a native Detect job`, async t => {
  const engine = new WorkflowEngine({ sourceRoot });
  const started = await engine.start({ name, workspace: fixture(t), args });
  assert.equal(started.status, 'running');
  const job = engine.claim({ id: started.id });
  assert.equal(job.options.phase, 'Detect');
  assert.equal(job.role.name, 'code-explorer');
  assert.ok(job.options.schema);
  assert.ok(job.role.instructions.includes('Native stack discovery'));
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
  first.close();
  const second = new WorkflowEngine({ sourceRoot });
  const resumed = await second.resume({ id, workspace });
  assert.equal(resumed.jobs[0].status, 'claimed');
  assert.equal(resumed.jobs[0].worker, 'native-123');
  assert.throws(() => second.claim({ id, jobId: job.id }), /queued/);
  assert.throws(() => second.reconnect({ id, jobId: job.id, worker: 'wrong' }), /match/);
  assert.equal(second.reconnect({ id, jobId: job.id, worker: 'native-123' }).claim, job.claim);
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
  first.close();
  const second = new WorkflowEngine({ sourceRoot: source, maxActive: 1 });
  await second.resume({ id, workspace });
  const b = second.claim({ id });
  assert.equal(b.prompt, 'two');
  await second.submit({ id, jobId: b.id, claim: b.claim, output: { value: 2 } });
  const c = second.claim({ id });
  assert.deepEqual(JSON.parse(c.prompt), [{ value: 1 }, { value: 2 }]);
  await second.submit({ id, jobId: c.id, claim: c.claim, output: { value: 3 } });
  const review = second.claim({ id });
  assert.equal(review.options.phase, 'CompletionReview');
  const done = await second.submit({ id, jobId: review.id, claim: review.claim, output: { verdict: 'PASS', reason: 'Test fixture result verified' } });
  assert.equal(done.status, 'completed');
  assert.deepEqual(done.result, { values: [{ value: 1 }, { value: 2 }], final: { value: 3 } });
  assert.equal((await second.submit({ id, jobId: c.id, claim: c.claim, output: { value: 3 } })).status, 'completed');
  await assert.rejects(second.submit({ id, jobId: c.id, claim: c.claim, output: { value: 4 } }), /stale/);
});

test('state cannot be redirected through a repository symlink', async t => {
  const workspace = fixture(t), outside = fixture(t);
  fs.symlinkSync(outside, path.join(workspace, '.ai'));
  await assert.rejects(new WorkflowEngine({ sourceRoot }).start({ name: 'fix-bug', workspace, args }), /Unsafe/);
  assert.deepEqual(fs.readdirSync(outside), []);
});

test('only one live engine can own a run', async t => {
  const workspace = fixture(t), first = new WorkflowEngine({ sourceRoot });
  const { id } = await first.start({ name: 'fix-bug', workspace, args });
  await assert.rejects(new WorkflowEngine({ sourceRoot }).resume({ id, workspace }), /another live engine/);
  first.close();
  const second = new WorkflowEngine({ sourceRoot });
  await second.resume({ id, workspace });
  assert.ok(second.claim({ id }).claim);
  second.stop({ id, reason: 'Fixture complete' }); second.close();
});

test('tampered cached outputs fail closed without alias retries or new jobs', async t => {
  const source = fixture(t), workspace = fixture(t);
  fs.mkdirSync(path.join(source, 'plugins/sdd-kit/workflows'), { recursive: true });
  fs.writeFileSync(path.join(source, 'plugins/sdd-kit/workflows/tech-research.js'), `export const meta = {};
    const schema = {type:'object',required:['value'],properties:{value:{type:'integer'}}};
    let a; try { a = await agent('first', {schema}); } catch { a = await agent('alias fallback', {schema}); }
    return await agent('second ' + a.value, {schema});`);
  const first = new WorkflowEngine({ sourceRoot: source });
  const { id } = await first.start({ name: 'tech-research', workspace });
  const job = first.claim({ id });
  await first.submit({ id, jobId: job.id, claim: job.claim, output: { value: 1 } });
  first.close();
  const file = path.join(workspace, '.ai/codex-workflows', `${id}.json`);
  const state = JSON.parse(fs.readFileSync(file, 'utf8'));
  state.jobs[job.id].output.value = 'tampered'; fs.writeFileSync(file, JSON.stringify(state));
  const second = new WorkflowEngine({ sourceRoot: source });
  const restored = await second.resume({ workspace, id });
  assert.equal(restored.status, 'failed');
  assert.equal(restored.jobs.length, 2);
  assert.throws(() => second.claim({ id }), /not active/);
  second.close();
});

test('complete research pipeline preserves upstream results with the same scripted worker evidence', async t => {
  const engine = new WorkflowEngine({ sourceRoot });
  const workspace = fixture(t);
  const stackContext = await engine.stacks.context(workspace);
  const input = { question: 'Which local format?', options: ['JSON', 'YAML'] };
  const evidence = (prompt, options) => {
    switch (options.phase) {
      case 'Detect': return { repos: [{ role: 'fullstack', path: '.', stack: 'other' }], ...stackContext };
      case 'Frame': return { criteria: [{ name: 'Existing parser', weight: 'must' }], options: ['JSON', 'YAML'] };
      case 'Research': return options.label === 'codebase-fit' ? { fitNotes: ['Synthetic fixture already uses JSON'], conflicts: [] } : { option: options.label.slice(4), findings: [{ insight: 'Synthetic claim for parity test', source: 'https://example.com/fixture' }] };
      case 'Verify': return { real: false, reason: 'Synthetic claim is intentionally unverified' };
      case 'Decide': return { recommendation: 'JSON', options: [{ name: 'JSON', score: 80 }, { name: 'YAML', score: 60 }], runnerUp: 'YAML', confidence: 'low', openQuestions: ['Human sign-off required'] };
      case 'Document': return { path: '.ai/decisions/0001-fixture.md', adrId: '0001' };
      case 'Report': return 'Fixture report: recommendation only; human sign-off required.';
      case 'CompletionReview': return { verdict: 'PASS', reason: 'Synthetic parity fixture makes no real-world success claim' };
      default: throw new Error(`Unexpected phase ${options.phase}`);
    }
  };
  const upstreamSource = engine.source('tech-research').replace(/^export const meta\s*=/, 'const meta =').replaceAll('.claude', '.codex');
  const expected = await new vm.Script(`(async () => {${upstreamSource}\n})()`).runInNewContext({ args: input, log() {}, phase() {}, agent: async (prompt, options) => evidence(prompt, options), parallel: tasks => Promise.all(tasks.map(t => t())) });
  let status = await engine.start({ name: 'tech-research', workspace, args: input });
  let count = 0;
  while (status.status === 'running' && count++ < 30) {
    const job = engine.claim({ id: status.id });
    status = await engine.submit({ id: status.id, jobId: job.id, claim: job.claim, output: evidence(job.prompt, job.options) });
  }
  assert.equal(status.status, 'completed');
  assert.equal(status.result.droppedClaims, 2);
  assert.deepEqual(status.result, JSON.parse(JSON.stringify(expected)));
});

test('report correction gets a fresh review without changing machine verdicts or replaying work', async t => {
  const source = fixture(t), workspace = fixture(t);
  fs.mkdirSync(path.join(source, 'plugins/sdd-kit/workflows'), { recursive: true });
  fs.mkdirSync(path.join(workspace, '.ai/reports'), { recursive: true });
  const reportFile = path.join(workspace, '.ai/reports/check.md');
  fs.writeFileSync(reportFile, 'FIXED');
  fs.writeFileSync(path.join(source, 'plugins/sdd-kit/workflows/tech-research.js'), `export const meta = {};
    return {recommendation:'NOT-RESOLVED',reportPath:'.ai/reports/check.md',report:'FIXED'};`);
  const engine = new WorkflowEngine({ sourceRoot: source });
  const {id} = await engine.start({name:'tech-research',workspace});
  const first = engine.claim({id});
  await engine.submit({id,jobId:first.id,claim:first.claim,output:{verdict:'CHANGES_REQUIRED',reason:'Report contradicts machine verdict'}});
  await assert.rejects(engine.retryReview({id,correction:'Retry'}),/has not changed/);
  fs.writeFileSync(reportFile,'NOT-RESOLVED: repository warning remains; code fix and tests are documented separately.');
  const retry = await engine.retryReview({id,correction:'Aligned the report with the original conservative machine verdict.'});
  assert.equal(retry.status,'running');
  const second = engine.claim({id,worker:'reviewer-2'});
  assert.notEqual(second.id,first.id);
  engine.close();
  const resumed = new WorkflowEngine({sourceRoot:source});
  await resumed.resume({id,workspace});
  const reconnected=resumed.reconnect({id,jobId:second.id,worker:'reviewer-2'});
  const done=await resumed.submit({id,jobId:second.id,claim:reconnected.claim,output:{verdict:'PASS',reason:'Conservative verdict and current report agree'}});
  assert.equal(done.status,'completed');
  assert.equal(done.result.recommendation,'NOT-RESOLVED');
  assert.equal(done.result.report,fs.readFileSync(reportFile,'utf8'));
  assert.equal(done.jobs.length,2);
  resumed.close();
});

test('pending job prompts, roles and schemas cannot be replaced through saved state', async t => {
  const source=fixture(t), workspace=fixture(t);
  fs.mkdirSync(path.join(source,'plugins/sdd-kit/workflows'),{recursive:true});
  fs.writeFileSync(path.join(source,'plugins/sdd-kit/workflows/tech-research.js'),`export const meta={}; const value=await agent('trusted prompt',{schema:{type:'object',required:['value'],properties:{value:{type:'integer'}}}}); return await agent('next '+value.value,{});`);
  const first=new WorkflowEngine({sourceRoot:source});
  const {id}=await first.start({name:'tech-research',workspace});
  const job=first.claim({id,worker:'original-worker'});first.close();
  const file=path.join(workspace,'.ai/codex-workflows',`${id}.json`), data=JSON.parse(fs.readFileSync(file,'utf8'));
  data.jobs[job.id].prompt='untrusted replacement';data.jobs[job.id].role.instructions='untrusted role';data.jobs[job.id].options.schema.properties.value.type='string';
  fs.writeFileSync(file,JSON.stringify(data));
  const second=new WorkflowEngine({sourceRoot:source}), state=await second.resume({workspace,id});
  assert.equal(state.status,'failed');assert.equal(state.jobs.length,1);
  assert.throws(()=>second.reconnect({id,jobId:job.id,worker:'original-worker'}),/active claim/);
  second.close();
});

test('report correction supports explicit sibling repos but rejects unrelated files', async t => {
  const source=fixture(t), parent=fixture(t), web=path.join(parent,'web'), api=path.join(parent,'api'), outside=path.join(parent,'outside');
  for(const dir of [web,api,outside])fs.mkdirSync(dir);
  fs.mkdirSync(path.join(source,'plugins/sdd-kit/workflows'),{recursive:true});
  fs.writeFileSync(path.join(source,'plugins/sdd-kit/workflows/tech-research.js'),`export const meta={};return {recommendation:'BLOCKED',reportPath:'../api/report.md',report:'inconsistent'};`);
  fs.writeFileSync(path.join(api,'report.md'),'inconsistent');
  const engine=new WorkflowEngine({sourceRoot:source}),{id}=await engine.start({name:'tech-research',workspace:web,args:{repos:{backend:api}}});
  const review=engine.claim({id});await engine.submit({id,jobId:review.id,claim:review.claim,output:{verdict:'CHANGES_REQUIRED',reason:'report'}});
  fs.writeFileSync(path.join(api,'report.md'),'BLOCKED: consistent report');
  assert.equal((await engine.retryReview({id,correction:'Aligned verdict'})).status,'running');
  const next=engine.claim({id});await engine.submit({id,jobId:next.id,claim:next.claim,output:{verdict:'CHANGES_REQUIRED',reason:'exercise escape guard'}});
  fs.writeFileSync(path.join(outside,'report.md'),'unrelated');fs.unlinkSync(path.join(api,'report.md'));fs.symlinkSync(path.join(outside,'report.md'),path.join(api,'report.md'));
  await assert.rejects(engine.retryReview({id,correction:'Do not follow escape'}),/explicitly supplied/);
  engine.close();
});
