import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

const inside = (root, file) => file === root || file.startsWith(root + path.sep);
const readJSON = file => JSON.parse(fs.readFileSync(file, 'utf8'));
function canonicalPath(file) {
  const suffix = []; let cursor = path.resolve(file);
  while (!fs.existsSync(cursor)) { suffix.unshift(path.basename(cursor)); cursor = path.dirname(cursor); }
  return path.join(fs.realpathSync(cursor), ...suffix);
}
function directory(dir) {
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  if (fs.realpathSync(dir) !== path.resolve(dir)) throw new Error(`Symlinked trust directory refused: ${dir}`);
}

export class NativeStacks {
  constructor(sourceRoot, { userRoot = path.join(os.userInfo().homedir, '.codex') } = {}) {
    this.sourceRoot = sourceRoot;
    this.userRoot = canonicalPath(userRoot);
    this.store = path.join(this.userRoot, 'sdd-kit/trusted-stacks.json');
  }

  async helpers() {
    return import(pathToFileURL(path.join(this.sourceRoot, 'plugins/sdd-kit/skills/stack-trust/scripts/trust-store.mjs')).href);
  }

  async list(workspace) {
    const helpers = await this.helpers();
    const root = fs.realpathSync(workspace);
    const entries = [], errors = [];
    const add = (file, source, firstParty = false) => {
      try {
        if (fs.statSync(file).size > 65536) throw new Error('manifest exceeds 64 KiB');
        const raw = fs.readFileSync(file, 'utf8'), parsed = JSON.parse(raw);
        const sha256 = helpers.manifestHash(parsed);
        const rejected = firstParty ? null : helpers.workflowRejection(raw, source.replaceAll('.codex', '.claude'));
        entries.push({ source, file, raw, sha256, keys: (Array.isArray(parsed) ? parsed : [parsed]).map(v => v?.name),
          firstParty, rejected, commands: helpers.commandFields(parsed), trusted: firstParty });
      } catch (error) { errors.push(`${source}: ${error instanceof SyntaxError ? 'invalid JSON' : error.message}`); }
    };
    const scan = (dir, source) => {
      if (!fs.existsSync(dir)) return;
      try { for (const name of fs.readdirSync(dir).sort()) if (name.endsWith('.json')) add(path.join(dir, name), source + name); }
      catch (error) { errors.push(`${source}: ${error.code || 'unreadable'}`); }
    };
    scan(path.join(root, '.codex/stacks'), 'project:.codex/stacks/');
    // Never allow repository-controlled paths to stand in for user trust/config.
    if (inside(root, this.userRoot)) errors.push('user config directory inside project');
    else scan(path.join(this.userRoot, 'stacks'), 'user:~/.codex/stacks/');
    const addonDir = path.join(root, '.codex/stack-addons');
    if (fs.existsSync(addonDir)) for (const name of fs.readdirSync(addonDir).sort()) {
      const file = path.join(addonDir, name, 'stack.json');
      if (fs.existsSync(file)) add(file, `plugin:${name}@inline`);
    }
    for (const name of fs.readdirSync(path.join(this.sourceRoot, 'plugins')).sort()) {
      const file = path.join(this.sourceRoot, 'plugins', name, 'stack.json');
      if (fs.existsSync(file)) add(file, `plugin:${name}@sdd-kit-codex`, true);
    }
    let trusted = [];
    if (inside(root, this.userRoot)) errors.push('trustStore unreadable');
    else if (fs.existsSync(this.store)) {
      try {
        if (fs.realpathSync(this.store) !== this.store) throw new Error('symlinked trust store');
        const data = readJSON(this.store);
        if (data.version !== 1 || !Array.isArray(data.trusted)) throw new Error('invalid trust store');
        trusted = data.trusted;
      } catch { errors.push('trustStore unreadable'); }
    }
    for (const entry of entries) entry.trusted ||= !entry.rejected && trusted.some(record => record.sha256 === entry.sha256 && record.source === entry.source);
    return { entries, errors, trustStore: JSON.stringify({ version: 1, trusted }),
      discovery: { mode: 'plugin', method: 'stacks-dir', errors } };
  }

  async context(workspace) {
    const listed = await this.list(workspace);
    return { stackManifests: listed.entries.map(({ source, raw }) => ({ source, raw })),
      trustStore: listed.trustStore, discovery: { ...listed.discovery,
        errors: [...listed.errors, ...listed.entries.filter(e => e.rejected).map(e => `${e.source}: ${e.rejected}`)] } };
  }

  async approve({ workspace, source, sha256 }) {
    const { entries } = await this.list(workspace);
    const entry = entries.find(e => e.source === source);
    if (!entry) throw new Error('Manifest not found');
    if (entry.firstParty) return { source, sha256: entry.sha256, trusted: true, firstParty: true };
    if (entry.rejected) throw new Error(`Manifest rejected: ${entry.rejected}`);
    if (entry.sha256 !== sha256) throw new Error('Manifest changed; show commands and obtain approval again');
    const root = fs.realpathSync(workspace);
    if (inside(root, this.userRoot)) throw new Error('Trust store must be outside the repository');
    directory(this.userRoot); directory(path.dirname(this.store));
    const lock = `${this.store}.lock`;
    let fd;
    try { fd = fs.openSync(lock, 'wx', 0o600); } catch { throw new Error('Trust store busy; retry after the other approval completes'); }
    try {
      let previous = { version: 1, trusted: [] };
      if (fs.existsSync(this.store)) {
        if (fs.lstatSync(this.store).isSymbolicLink()) throw new Error('Symlinked trust store refused');
        previous = readJSON(this.store);
        if (previous.version !== 1 || !Array.isArray(previous.trusted)) throw new Error('Invalid trust store; repair it before approving');
      }
      const record = { source, sha256, keys: entry.keys, approvedAt: new Date().toISOString() };
      const temp = `${this.store}.${crypto.randomUUID()}.tmp`;
      fs.writeFileSync(temp, JSON.stringify({ version: 1, trusted: [...previous.trusted.filter(t => t.source !== source), record] }, null, 2), { flag: 'wx', mode: 0o600 });
      fs.renameSync(temp, this.store);
      return record;
    } finally { fs.closeSync(fd); fs.unlinkSync(lock); }
  }
}
