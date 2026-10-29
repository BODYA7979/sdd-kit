import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NativeStacks } from '../runtime/stacks.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
function setup(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-stacks-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const workspace = path.join(dir, 'repo'), userRoot = path.join(dir, 'user');
  fs.mkdirSync(path.join(workspace, '.codex/stacks'), { recursive: true });
  const file = path.join(workspace, '.codex/stacks/custom.json');
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'plugins/sdd-kit-drupal/stack.json'), 'utf8'));
  manifest.name = 'custom'; manifest.gates = [{ name: 'Tests', command: 'npm test', kind: 'test' }];
  fs.writeFileSync(file, JSON.stringify(manifest));
  return { workspace, userRoot, file, manifest, stacks: new NativeStacks(root, { userRoot }) };
}
test('custom native stack requires exact approval; changed commands lose trust', async t => {
  const { stacks, workspace, manifest, file } = setup(t);
  let entry = (await stacks.list(workspace)).entries.find(e => !e.firstParty);
  assert.equal(entry.source, 'project:.codex/stacks/custom.json');
  assert.equal(entry.trusted, false); assert.equal(entry.rejected, null);
  await assert.rejects(stacks.approve({ workspace, source: entry.source, sha256: 'stale' }), /changed/);
  await stacks.approve({ workspace, source: entry.source, sha256: entry.sha256 });
  assert.equal((await stacks.list(workspace)).entries.find(e => !e.firstParty).trusted, true);
  manifest.gates[0].command = 'npm run other'; fs.writeFileSync(file, JSON.stringify(manifest));
  assert.equal((await stacks.list(workspace)).entries.find(e => !e.firstParty).trusted, false);
  assert.equal(fs.statSync(stacks.store).mode & 0o777, 0o600);
});
test('repository-controlled user trust root cannot grant trust', async t => {
  const { workspace } = setup(t);
  const stacks = new NativeStacks(root, { userRoot: path.join(workspace, '.codex') });
  const result = await stacks.list(workspace);
  assert.ok(result.errors.includes('trustStore unreadable'));
  const entry = result.entries.find(e => !e.firstParty);
  await assert.rejects(stacks.approve({ workspace, source: entry.source, sha256: entry.sha256 }), /outside/);
});
test('invalid manifests are reported and never approved', async t => {
  const { stacks, workspace, file } = setup(t);
  fs.writeFileSync(file, JSON.stringify({ name: 'invalid', gates: [{ command: 'whatever' }] }));
  const entry = (await stacks.list(workspace)).entries.find(e => !e.firstParty);
  assert.ok(entry.rejected);
  await assert.rejects(stacks.approve({ workspace, source: entry.source, sha256: entry.sha256 }), /rejected/);
});
