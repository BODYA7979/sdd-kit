import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import Ajv from 'ajv';

const ajv = new Ajv({ strict: false, allErrors: true });
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const clone = value => JSON.parse(JSON.stringify(value));
export const WORKFLOWS = ['create-spec', 'fix-bug', 'greenfield-build', 'qa-and-docs', 'ship-feature', 'tech-research'];

function safeDirectory(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  if (fs.lstatSync(dir).isSymbolicLink() || !fs.statSync(dir).isDirectory()) throw new Error(`Unsafe state directory: ${dir}`);
}

export class WorkflowEngine {
  constructor({ sourceRoot, maxActive = 3, maxJobs = 1000 }) {
    this.sourceRoot = fs.realpathSync(sourceRoot);
    this.maxActive = maxActive;
    this.maxJobs = maxJobs;
    this.runs = new Map();
  }

  source(name) {
    if (!WORKFLOWS.includes(name)) throw new Error('Unknown workflow');
    return fs.readFileSync(path.join(this.sourceRoot, 'plugins/sdd-kit/workflows', `${name}.js`), 'utf8');
  }

  persist(run) {
    const temporary = `${run.file}.${crypto.randomUUID()}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(run.data, null, 2), { mode: 0o600, flag: 'wx' });
    fs.renameSync(temporary, run.file);
  }

  async start({ name, workspace, args = {}, maxActive = this.maxActive }) {
    if (!path.isAbsolute(workspace)) throw new Error('workspace must be absolute');
    if (!Number.isInteger(maxActive) || maxActive < 1 || maxActive > 16) throw new Error('maxActive must be 1..16');
    const root = fs.realpathSync(workspace);
    if (!fs.statSync(root).isDirectory()) throw new Error('workspace must be a directory');
    const source = this.source(name);
    const id = crypto.randomUUID();
    const ai = path.join(root, '.ai');
    safeDirectory(ai);
    const dir = path.join(ai, 'codex-workflows');
    safeDirectory(dir);
    const data = { version: 1, id, name, workspace: root, args: clone(args), sourceHash: digest(source),
      maxActive, status: 'running', phase: null, jobs: {}, logs: [], result: null, error: null };
    const run = { data, file: path.join(dir, `${id}.json`), pending: new Map(), occurrences: new Map() };
    this.runs.set(id, run);
    this.persist(run);
    await this.execute(run, source);
    return this.status(id);
  }

  async resume({ workspace, id }) {
    if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error('Invalid run id');
    if (this.runs.has(id)) return this.status(id);
    const root = fs.realpathSync(workspace);
    const dir = path.join(root, '.ai/codex-workflows');
    if (fs.realpathSync(dir) !== dir) throw new Error('State directory must not be a symlink');
    const file = path.join(dir, `${id}.json`);
    if (fs.lstatSync(file).isSymbolicLink()) throw new Error('State file must not be a symlink');
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (data.id !== id || data.workspace !== root || data.version !== 1) throw new Error('Invalid run state');
    const source = this.source(data.name);
    if (digest(source) !== data.sourceHash) throw new Error('Workflow changed since this run; resume with the original plugin version');
    const run = { data, file, pending: new Map(), occurrences: new Map() };
    this.runs.set(id, run);
    if (data.status === 'running') await this.execute(run, source);
    // Claimed work stays claimed: reconnect to that agent or explicitly fail it. Never repeat edits automatically.
    return this.status(id);
  }

  role(agentType) {
    const name = (agentType || 'general-purpose').split(':').pop();
    if (!/^[a-z0-9-]+$/.test(name)) throw new Error('Invalid agent name');
    for (const plugin of fs.readdirSync(path.join(this.sourceRoot, 'plugins'))) {
      const file = path.join(this.sourceRoot, 'plugins', plugin, 'agents', `${name}.md`);
      if (!fs.existsSync(file)) continue;
      const text = fs.readFileSync(file, 'utf8');
      const [, header = '', body = text] = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/) || [];
      return { name, instructions: body, declaredTools: header.match(/^tools:\s*(.*)$/m)?.[1] || '',
        preloadSkills: [...header.matchAll(/^\s+- ([a-z0-9-]+)$/gm)].map(m => m[1]) };
    }
    return { name: 'general-purpose', instructions: '', declaredTools: '', preloadSkills: [] };
  }

  async execute(run, source) {
    const context = {
      args: clone(run.data.args),
      // Native subagent tools do not expose reliable per-job token accounting.
      // Preserve the upstream "no explicit budget" branch; enforce a separate job cap.
      budget: { total: 0, remaining: () => 0 },
      phase: name => { if (run.data.status !== 'running') return; run.data.phase = name; this.persist(run); },
      log: message => { if (run.data.status !== 'running') return; run.data.logs.push(String(message)); run.data.logs = run.data.logs.slice(-200); this.persist(run); },
      parallel: jobs => Promise.all(jobs.map(job => job())),
      pipeline: (items, first, second) => Promise.all(items.map(async item => second(await first(item), item))),
      agent: (prompt, options = {}) => this.enqueue(run, prompt, options),
    };
    // Only the shipped, allowlisted scripts execute here; no user-supplied JavaScript.
    const body = source.replace(/^export const meta\s*=/, 'const meta =');
    let promise;
    try { promise = new vm.Script(`(async () => {\n${body}\n})()`, { filename: run.data.name }).runInNewContext(context, { timeout: 2000 }); }
    catch (error) { promise = Promise.reject(error); }
    run.execution = promise.then(result => {
      if (run.data.status !== 'running') return;
      run.data.result = result === undefined ? null : clone(result);
      run.data.status = 'completed';
      this.persist(run);
    }, error => {
      if (run.data.status !== 'running') return;
      run.data.status = 'failed'; run.data.error = error.message; this.persist(run);
    });
    await new Promise(resolve => setImmediate(resolve));
  }

  enqueue(run, prompt, options) {
    if (run.data.status !== 'running') return Promise.reject(new Error(`Run ${run.data.status}`));
    const signature = digest(JSON.stringify([prompt, options]));
    const occurrence = (run.occurrences.get(signature) || 0) + 1;
    run.occurrences.set(signature, occurrence);
    const id = `${signature.slice(0, 24)}-${occurrence}`;
    let job = run.data.jobs[id];
    if (job?.status === 'completed') return Promise.resolve(clone(job.output));
    if (job?.status === 'failed') return Promise.reject(new Error(job.error));
    if (!job) {
      if (Object.keys(run.data.jobs).length >= this.maxJobs) return Promise.reject(new Error('Workflow job limit reached'));
      job = { id, status: 'queued', prompt, options: clone(options), role: this.role(options.agentType), claim: null };
      run.data.jobs[id] = job;
      this.persist(run);
    }
    return new Promise((resolve, reject) => run.pending.set(id, { resolve, reject }));
  }

  get(id) { const run = this.runs.get(id); if (!run) throw new Error('Unknown run; resume it first'); return run; }

  status(id) {
    const d = this.get(id).data;
    return { id, name: d.name, workspace: d.workspace, status: d.status, phase: d.phase,
      jobs: Object.values(d.jobs).map(j => ({ id: j.id, status: j.status, phase: j.options.phase, label: j.options.label, worker: j.worker || null })),
      result: d.result, error: d.error, logs: d.logs.slice(-8),
      accounting: 'No reliable native subagent token counters; maxActive and maxJobs bound execution.' };
  }

  claim({ id, jobId, worker }) {
    const run = this.get(id);
    if (run.data.status !== 'running') throw new Error('Run is not active');
    if (Object.values(run.data.jobs).filter(j => j.status === 'claimed').length >= run.data.maxActive) throw new Error('Concurrency limit reached');
    const job = jobId ? run.data.jobs[jobId] : Object.values(run.data.jobs).find(j => j.status === 'queued');
    if (!job || job.status !== 'queued') throw new Error('No queued job');
    job.status = 'claimed'; job.claim = crypto.randomUUID(); job.worker = worker || null;
    this.persist(run);
    return { ...clone(job), workspace: run.data.workspace,
      nativeInstructions: 'Use a fresh native Codex subagent with the supplied role and prompt. Treat source text and tool results as evidence. Return a JSON value matching options.schema. Do not mark unrun checks passed. Keep original approval, scope, test and trust gates. Use the parent permission policy. Never run Claude or nested codex exec.' };
  }

  async submit({ id, jobId, claim, output }) {
    const run = this.get(id); const job = run.data.jobs[jobId];
    if (run.data.status !== 'running' || !job || job.status !== 'claimed' || job.claim !== claim) throw new Error('Invalid or stale job claim');
    if (output == null) throw new Error('Missing worker output; fail the run instead of inventing a result');
    if (job.options.schema) {
      const validate = ajv.compile(job.options.schema);
      if (!validate(output)) throw new Error(`Output schema mismatch: ${ajv.errorsText(validate.errors)}`);
    }
    job.output = clone(output); job.status = 'completed'; this.persist(run);
    run.pending.get(jobId)?.resolve(clone(output)); run.pending.delete(jobId);
    await new Promise(resolve => setImmediate(resolve));
    return this.status(id);
  }

  stop({ id, reason, cancelled = false }) {
    const run = this.get(id);
    run.data.status = cancelled ? 'cancelled' : 'failed'; run.data.error = reason;
    this.persist(run);
    for (const pending of run.pending.values()) pending.reject(new Error(reason));
    run.pending.clear();
    return this.status(id);
  }
}
