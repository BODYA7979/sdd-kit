import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import Ajv from 'ajv';
import { NativeStacks } from './stacks.mjs';

const ajv = new Ajv({ strict: false, allErrors: true });
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const clone = value => JSON.parse(JSON.stringify(value));
const ENGINE_REVISION = 'native-v3';
export const WORKFLOWS = ['create-spec', 'fix-bug', 'greenfield-build', 'qa-and-docs', 'ship-feature', 'tech-research'];

function safeDirectory(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  if (fs.lstatSync(dir).isSymbolicLink() || !fs.statSync(dir).isDirectory()) throw new Error(`Unsafe state directory: ${dir}`);
}

export class WorkflowEngine {
  constructor({ sourceRoot, maxActive = 3, maxJobs = 1000, userRoot }) {
    this.sourceRoot = fs.realpathSync(sourceRoot);
    this.maxActive = maxActive;
    this.maxJobs = maxJobs;
    this.runs = new Map();
    this.stacks = fs.existsSync(path.join(this.sourceRoot, 'plugins/sdd-kit/skills/stack-trust/scripts/trust-store.mjs')) ? new NativeStacks(this.sourceRoot, { userRoot }) : null;
  }

  source(name) {
    if (!WORKFLOWS.includes(name)) throw new Error('Unknown workflow');
    return fs.readFileSync(path.join(this.sourceRoot, 'plugins/sdd-kit/workflows', `${name}.js`), 'utf8');
  }

  persist(run) {
    this.assertOwned(run);
    if (fs.realpathSync(path.dirname(run.file)) !== path.dirname(run.file)) throw new Error('State directory changed');
    if (run.diskHash && digest(fs.readFileSync(run.file, 'utf8')) !== run.diskHash) throw new Error('Run state changed outside its owner');
    const temporary = `${run.file}.${crypto.randomUUID()}.tmp`;
    const serialized = JSON.stringify(run.data, null, 2);
    fs.writeFileSync(temporary, serialized, { mode: 0o600, flag: 'wx' });
    fs.renameSync(temporary, run.file);
    run.diskHash = digest(serialized);
  }

  acquire(run) {
    run.lock = `${run.file}.lock`; run.owner = crypto.randomUUID();
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const fd = fs.openSync(run.lock, 'wx', 0o600);
        fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, owner: run.owner })); fs.closeSync(fd);
        run.owned = true; return;
      } catch (error) {
        if (error.code !== 'EEXIST') throw error;
        // Serialize stale-lock reclamation too: another process must never remove a newly acquired lock.
        const recovery = `${run.lock}.recovery`; let recoveryFd;
        try { recoveryFd = fs.openSync(recovery, 'wx', 0o600); }
        catch { throw new Error('Run lock recovery is in progress; inspect the recovery lock if its process crashed'); }
        try {
          if (!fs.existsSync(run.lock)) continue;
          const holder = JSON.parse(fs.readFileSync(run.lock, 'utf8'));
          if (!Number.isInteger(holder.pid) || holder.pid <= 0) throw new Error('Invalid run lock; inspect before recovery');
          try { process.kill(holder.pid, 0); throw new Error('Run is owned by another live engine'); }
          catch (check) { if (check.code !== 'ESRCH') throw check; }
          fs.unlinkSync(run.lock);
          const fd = fs.openSync(run.lock, 'wx', 0o600);
          fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, owner: run.owner })); fs.closeSync(fd);
          run.owned = true; return;
        } finally { fs.closeSync(recoveryFd); fs.unlinkSync(recovery); }
      }
    }
    throw new Error('Could not acquire run');
  }

  assertOwned(run) {
    if (!run.owned || JSON.parse(fs.readFileSync(run.lock, 'utf8')).owner !== run.owner) throw new Error('Run ownership lost');
  }

  close() {
    for (const run of this.runs.values()) {
      if (!run.owned) continue;
      this.assertOwned(run); fs.unlinkSync(run.lock); run.owned = false;
      for (const pending of run.pending.values()) pending.reject(new Error('Engine disconnected'));
      run.pending.clear();
    }
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
    try { fs.writeFileSync(path.join(dir, '.gitignore'), '*\n', { flag: 'wx', mode: 0o600 }); }
    catch (error) { if (error.code !== 'EEXIST') throw error; }
    const data = { version: 1, adapterVersion: ENGINE_REVISION, id, name, workspace: root, args: clone(args), sourceHash: digest(source),
      maxActive, status: 'running', phase: null, jobs: {}, logs: [], result: null, error: null,
      stackContext: this.stacks ? await this.stacks.context(root) : null };
    const run = { data, file: path.join(dir, `${id}.json`), pending: new Map(), occurrences: new Map() };
    this.runs.set(id, run);
    this.acquire(run);
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
    const run = { file, pending: new Map(), occurrences: new Map() };
    this.acquire(run);
    try {
      // Read only after ownership is acquired; the previous owner may have written while we waited.
      const serialized = fs.readFileSync(file, 'utf8'), data = JSON.parse(serialized);
      if (data.id !== id || data.workspace !== root || data.version !== 1) throw new Error('Invalid run state');
      if (data.adapterVersion !== ENGINE_REVISION) throw new Error('Adapter changed since this run; resume with the original plugin build');
      if (this.stacks && JSON.stringify(await this.stacks.context(root)) !== JSON.stringify(data.stackContext)) throw new Error('Stack definitions or approvals changed; start a new run after reviewing the current state');
      const source = this.source(data.name);
      if (digest(source) !== data.sourceHash) throw new Error('Workflow changed since this run; resume with the original plugin version');
      run.data = data; run.diskHash = digest(serialized);
      this.runs.set(id, run);
      if (data.status === 'running') await this.execute(run, source);
    } catch (error) {
      fs.unlinkSync(run.lock); run.owned = false; this.runs.delete(id); throw error;
    }
    // Claimed work stays claimed: reconnect to that agent or explicitly fail it. Never repeat edits automatically.
    return this.status(id);
  }

  role(agentType, workspace) {
    const name = (agentType || 'general-purpose').split(':').pop();
    if (!/^[a-z0-9-]+$/.test(name)) throw new Error('Invalid agent name');
    const candidates = fs.readdirSync(path.join(this.sourceRoot, 'plugins')).map(plugin => path.join(this.sourceRoot, 'plugins', plugin, 'agents', `${name}.md`));
    const ruleFolders = fs.readdirSync(path.join(this.sourceRoot, 'plugins')).map(plugin => path.join(this.sourceRoot, 'plugins', plugin, 'rules'));
    if (workspace) ruleFolders.push(path.join(workspace, '.codex/rules'));
    const rulePaths = ruleFolders.filter(folder => fs.existsSync(folder) && fs.statSync(folder).isDirectory()).flatMap(folder => fs.readdirSync(folder).filter(file => file.endsWith('.md')).map(file => path.join(folder, file)));
    const addons = workspace && path.join(workspace, '.codex/stack-addons');
    if (addons && fs.existsSync(addons)) for (const addon of fs.readdirSync(addons).sort()) candidates.push(path.join(addons, addon, 'agents', `${name}.md`));
    for (const file of candidates) {
      if (!fs.existsSync(file)) continue;
      const text = fs.readFileSync(file, 'utf8');
      const [, header = '', body = text] = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/) || [];
      const instructions = name === 'code-explorer' ? body.replace(/# Stack discovery \(workflow Detect\)[\s\S]*?(?=# Exploration Recipes)/,
        '# Native stack discovery\nThe bridge supplies stackContext from native .codex/stacks, user stacks, project .codex/stack-addons and bundled first-party manifests. Use those manifests to detect the project. Do not run Claude commands or inspect Claude config. The bridge injects manifest and trust fields into the Detect result; you cannot grant trust. Verify per-repo gate availability, unless globs, wrappers and package versions against the actual files.\n\n') : body;
      const skills = header.match(/^skills:\s*\n((?:[ \t]+- [^\n]+\n?)*)/m)?.[1] || '';
      const preloadSkills = [...skills.matchAll(/^\s+- ([a-z0-9-]+)$/gm)].map(m => m[1]);
      const preloadSkillPaths = preloadSkills.flatMap(skill => {
        const native = path.resolve(this.sourceRoot, '../skills', skill, 'SKILL.md');
        if (fs.existsSync(native)) return [native];
        const match = fs.readdirSync(path.join(this.sourceRoot, 'plugins')).map(plugin => path.join(this.sourceRoot, 'plugins', plugin, 'skills', skill, 'SKILL.md')).find(file => fs.existsSync(file));
        return match ? [match] : [];
      });
      const memoryFile = /^memory:\s*project\s*$/m.test(header) && workspace ? path.join(workspace, '.ai/agents', `${name}.md`) : null;
      return { name, instructions: instructions.replaceAll('.claude', '.codex').replaceAll('CLAUDE.md', 'AGENTS.md').replaceAll('CLAUDE_SKILL_DIR', 'SDD_SKILL_DIR').replaceAll('CLAUDE_PLUGIN_ROOT', 'SDD_PLUGIN_ROOT'), declaredTools: header.match(/^tools:\s*(.*)$/m)?.[1] || '',
        preloadSkills, preloadSkillPaths, memoryFile, rulePaths };
    }
    return { name: 'general-purpose', instructions: '', declaredTools: '', preloadSkills: [], rulePaths };
  }

  async execute(run, source) {
    const context = {
      args: clone(run.data.args),
      // Native subagent tools do not expose reliable per-job token accounting.
      // Preserve the upstream "no explicit budget" branch; enforce a separate job cap.
      budget: { total: 0, remaining: () => 0 },
      phase: name => { if (!run.owned || run.data.status !== 'running') return; run.data.phase = name; this.persist(run); },
      log: message => { if (!run.owned || run.data.status !== 'running') return; run.data.logs.push(String(message)); run.data.logs = run.data.logs.slice(-200); this.persist(run); },
      parallel: jobs => Promise.all(jobs.map(job => job())),
      pipeline: (items, first, second) => Promise.all(items.map(async item => second(await first(item), item))),
      agent: (prompt, options = {}) => this.enqueue(run, prompt, options),
    };
    // Only the shipped, allowlisted scripts execute here; no user-supplied JavaScript.
    const body = source.replace(/^export const meta\s*=/, 'const meta =').replaceAll('.claude', '.codex').replaceAll('CLAUDE.md', 'AGENTS.md');
    let promise;
    try { promise = new vm.Script(`(async () => {\n${body}\n})()`, { filename: run.data.name }).runInNewContext(context, { timeout: 2000 }); }
    catch (error) { promise = Promise.reject(error); }
    run.execution = promise.then(result => this.reviewCompletion(run, result)).catch(error => {
      if (!run.owned || run.data.status !== 'running') return;
      run.data.status = 'failed'; run.data.error = error.message; this.persist(run);
    });
    await new Promise(resolve => setImmediate(resolve));
  }

  async reviewCompletion(run, result) {
      if (!run.owned || run.data.status !== 'running') return;
      run.data.result = result === undefined ? null : clone(result);
      if (run.data.reportCorrection) {
        const text = this.readReport(run);
        if (digest(text) !== run.data.reportCorrection.hash) throw new Error('Report changed again; request a new review after checking the file');
        run.data.result.report = text;
      }
      run.data.phase = 'CompletionReview';
      this.persist(run);
      const review = await this.enqueue(run,
        `Independently verify this SDD ${run.data.name} outcome against actual files and execution evidence. Work read-only in ${run.data.workspace}. Check claimed changes, tests and artifacts; do not equate unrun checks with passes. An honestly blocked/incomplete upstream result is a valid report, but a false success claim is not. Return PASS only when the reported outcome is supported, otherwise CHANGES_REQUIRED or BLOCKED with the concrete unmet requirement.\nOutcome: ${JSON.stringify(run.data.result)}`,
        { phase: 'CompletionReview', agentType: 'outcomes-grader', effort: 'high', readOnly: true,
          schema: { type: 'object', required: ['verdict', 'reason'], additionalProperties: false,
            properties: { verdict: { type: 'string', enum: ['PASS', 'CHANGES_REQUIRED', 'BLOCKED'] }, reason: { type: 'string' } } } });
      if (!run.owned || run.data.status !== 'running') return;
      run.data.completionReview = review;
      run.data.status = review.verdict === 'PASS' ? 'completed' : 'blocked';
      if (review.verdict !== 'PASS') run.data.error = review.reason;
      this.persist(run);

  }

  readReport(run) {
    const report = run.data.result?.reportPath;
    if (typeof report !== 'string') throw new Error('This workflow has no report artifact to refresh');
    const file = fs.realpathSync(path.resolve(run.data.workspace, report));
    const hints = run.data.args?.repos;
    const values = Array.isArray(hints) ? hints : hints && typeof hints === 'object' ? Object.values(hints) : [];
    const roots = [run.data.workspace];
    for (const hint of values) {
      const value = typeof hint === 'string' ? hint : hint?.path;
      if (typeof value !== 'string') continue;
      const candidate = fs.realpathSync(path.resolve(run.data.workspace, value));
      if (fs.statSync(candidate).isDirectory()) roots.push(candidate);
    }
    if (!roots.some(root => file.startsWith(root + path.sep))) throw new Error('Report must stay inside the workspace or an explicitly supplied repository');
    if (fs.statSync(file).size > 512 * 1024) throw new Error('Report exceeds 512 KiB');
    return fs.readFileSync(file, 'utf8');
  }

  async retryReview({ id, correction }) {
    const run = this.get(id);
    if (run.data.status !== 'blocked' || !run.data.completionReview) throw new Error('Only a blocked completion review can be retried');
    if (typeof correction !== 'string' || !correction.trim()) throw new Error('Describe the report correction');
    const text = this.readReport(run);
    if (text === run.data.result.report) throw new Error('Report artifact has not changed');
    run.data.reviewHistory = [...(run.data.reviewHistory || []), { review: run.data.completionReview, correction, at: new Date().toISOString() }];
    run.data.reportCorrection = { hash: digest(text), correction };
    run.data.status = 'running'; run.data.error = null; run.data.completionReview = null;
    this.persist(run);
    run.execution = this.reviewCompletion(run, run.data.result).catch(error => {
      if (!run.owned || run.data.status !== 'running') return;
      run.data.status = 'failed'; run.data.error = error.message; this.persist(run);
    });
    await new Promise(resolve => setImmediate(resolve));
    return this.status(id);
  }

  enqueue(run, prompt, options) {
    this.assertOwned(run);
    if (run.data.status !== 'running') return Promise.reject(new Error(`Run ${run.data.status}`));
    const signature = digest(JSON.stringify([prompt, options]));
    const occurrence = (run.occurrences.get(signature) || 0) + 1;
    run.occurrences.set(signature, occurrence);
    const id = `${signature.slice(0, 24)}-${occurrence}`;
    let job = run.data.jobs[id];
    const role = this.role(options.agentType, run.data.workspace);
    if (job && (job.id !== id || job.prompt !== prompt || JSON.stringify(job.options) !== JSON.stringify(options) || JSON.stringify(job.role) !== JSON.stringify(role))) {
      this.stop({ id: run.data.id, reason: 'Stored job metadata differs from the trusted workflow; refusing replay' });
      return Promise.reject(new Error('Stored job metadata differs from the trusted workflow'));
    }
    if (job?.status === 'completed') {
      if (options.phase === 'Detect' && run.data.stackContext && Object.keys(run.data.stackContext).some(key => JSON.stringify(job.output?.[key]) !== JSON.stringify(run.data.stackContext[key]))) {
        this.stop({ id: run.data.id, reason: 'Cached Detect context was modified; trust evidence cannot come from workflow state' });
        return Promise.reject(new Error('Cached Detect context was modified'));
      }
      if (options.schema && !ajv.validate(options.schema, job.output)) {
        this.stop({ id: run.data.id, reason: 'Cached output no longer matches its schema' });
        return Promise.reject(new Error('Cached output no longer matches its schema'));
      }
      return Promise.resolve(clone(job.output));
    }
    if (job?.status === 'failed') return Promise.reject(new Error(job.error));
    if (!job) {
      if (Object.keys(run.data.jobs).length >= this.maxJobs) return Promise.reject(new Error('Workflow job limit reached'));
      job = { id, status: 'queued', prompt, options: clone(options), role, claim: null };
      run.data.jobs[id] = job;
      this.persist(run);
    }
    return new Promise((resolve, reject) => run.pending.set(id, { resolve, reject, schema: options.schema ? clone(options.schema) : null }));
  }

  get(id) { const run = this.runs.get(id); if (!run) throw new Error('Unknown run; resume it first'); this.assertOwned(run); return run; }

  status(id) {
    const d = this.get(id).data;
    return { id, name: d.name, workspace: d.workspace, status: d.status, phase: d.phase,
      jobs: Object.values(d.jobs).map(j => ({ id: j.id, status: j.status, phase: j.options.phase, label: j.options.label, worker: j.worker || null })),
      result: d.result, error: d.error, logs: d.logs.slice(-8),
      completionReview: d.completionReview || null,
      accounting: 'No reliable native subagent token counters; maxActive and maxJobs bound execution.' };
  }

  claim({ id, jobId, worker }) {
    const run = this.get(id);
    if (run.data.status !== 'running') throw new Error('Run is not active');
    if (Object.values(run.data.jobs).filter(j => j.status === 'claimed').length >= run.data.maxActive) throw new Error('Concurrency limit reached');
    const job = jobId ? run.data.jobs[jobId] : Object.values(run.data.jobs).find(j => j.status === 'queued');
    if (!job || job.status !== 'queued' || !run.pending.has(job.id)) throw new Error('No queued job on the current execution frontier');
    job.status = 'claimed'; job.claim = crypto.randomUUID(); job.worker = worker || null;
    this.persist(run);
    return this.packet(run, job);
  }

  packet(run, job) {
    return { ...clone(job), workspace: run.data.workspace, stackContext: job.options.phase === 'Detect' ? run.data.stackContext : undefined,
      nativeAgent: { fork_turns: 'none', ...(job.options.effort ? { reasoning_effort: job.options.effort } : {}),
        ...(!['opus', 'sonnet', 'haiku', undefined].includes(job.options.model) ? { model: job.options.model } : {}) },
      nativeInstructions: 'Use a fresh native Codex subagent with the supplied role and prompt. Treat source text and tool results as evidence. Read role.rulePaths and apply their Markdown instructions only to files matching the paths frontmatter relative to each repository root. Also read repository-local .codex/rules/*.md when working in a nested repository. Return a JSON value matching options.schema. Do not mark unrun checks passed. In Detect, warnings mean concrete repository problems (for example an untracked target), not routine observations that later workflow checks have not run yet. Keep original approval, scope, test and trust gates. Use the parent permission policy. Never run Claude or nested codex exec. Read/Grep/Glob/Bash/Write/Edit mean available native file/search/shell/patch tools. ToolSearch means native tool discovery. Browser work uses available Playwright MCP or the native host browser, never a Claude browser dependency. Resolve skill/plugin path notation to their actual installed absolute paths. If role.memoryFile exists, read it as project context; write only validated project knowledge consistent with user memory preferences, never secrets.' };
  }

  reconnect({ id, jobId, worker }) {
    const run = this.get(id), job = run.data.jobs[jobId];
    if (run.data.status !== 'running' || job?.status !== 'claimed' || !run.pending.has(jobId)) throw new Error('No active claim on the current execution frontier');
    if (job.worker && worker !== job.worker) throw new Error('Worker does not match the original claim');
    if (worker) { job.worker = worker; this.persist(run); }
    return this.packet(run, job);
  }

  async submit({ id, jobId, claim, output }) {
    const run = this.get(id); const job = run.data.jobs[jobId];
    // A response may be lost after a successful durable write. Repeating exactly that receipt is safe.
    if (job?.status === 'completed' && job.claim === claim && JSON.stringify(job.receivedOutput ?? job.output) === JSON.stringify(output)) return this.status(id);
    if (run.data.status !== 'running' || !job || job.status !== 'claimed' || job.claim !== claim) throw new Error('Invalid or stale job claim');
    const pending = run.pending.get(jobId);
    if (!pending) throw new Error('Job is not on the current execution frontier');
    if (output == null) throw new Error('Missing worker output; fail the run instead of inventing a result');
    const receivedOutput = clone(output);
    if (job.options.phase === 'Detect' && run.data.stackContext) output = { ...output, ...run.data.stackContext };
    if (pending.schema) {
      const validate = ajv.compile(pending.schema);
      if (!validate(output)) throw new Error(`Output schema mismatch: ${ajv.errorsText(validate.errors)}`);
    }
    job.output = clone(output); job.receivedOutput = receivedOutput; job.status = 'completed'; this.persist(run);
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
