import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { createRequire } from 'node:module';
import { bundleDependencies } from '../adapters/codex/build.mjs';
import { parse as parseYaml } from 'yaml';
import { spawnSync } from 'node:child_process';
import { ROOT, build, parseBuildArgs } from '../scripts/build.mjs';
import { installPlan } from '../scripts/install-host.mjs';
import { installRoute } from '../cli/sdd-kit.mjs';

function tree(dir) {
  const result = {};
  function visit(at) {
    for (const item of fs.readdirSync(at, { withFileTypes: true })) {
      const file = path.join(at, item.name);
      if (item.isDirectory()) visit(file);
      else result[path.relative(dir, file)] = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    }
  }
  visit(dir); return result;
}
test('shared and native skill frontmatter parse without silently dropping metadata', () => {
  const folders = fs.readdirSync(path.join(ROOT, 'plugins')).map(name => path.join(ROOT, 'plugins', name, 'skills'));
  folders.push(path.join(ROOT, 'dist/codex/plugins/sdd-kit/skills'));
  for (const folder of folders) {
    if (!fs.existsSync(folder)) continue;
    for (const name of fs.readdirSync(folder)) {
      const file = path.join(folder, name, 'SKILL.md');
      if (!fs.existsSync(file)) continue;
      const header = fs.readFileSync(file, 'utf8').match(/^---\n([\s\S]*?)\n---/);
      assert.ok(header, file);
      const parsed = parseYaml(header[1]);
      assert.equal(parsed.name, name, file);
      assert.equal(typeof parsed.description, 'string', file);
      assert.ok(parsed.description.length > 0, file);
    }
  }
});
test('both hosts consume the same canonical plugins and shared resources', () => {
  for (const folder of ['plugins', 'share']) {
    const original = tree(path.join(ROOT, folder));
    assert.deepEqual(tree(path.join(ROOT, 'dist/claude', folder)), original);
    assert.deepEqual(tree(path.join(ROOT, 'dist/codex/plugins/sdd-kit/source', folder)), original);
  }
  assert.deepEqual(tree(path.join(ROOT, 'dist/claude/.claude-plugin')), tree(path.join(ROOT, '.claude-plugin')));
});
test('native package retains SDD Kit identity and resolves every shipped skill', () => {
  const native = path.join(ROOT, 'dist/codex/plugins/sdd-kit');
  const manifest = JSON.parse(fs.readFileSync(path.join(native, '.codex-plugin/plugin.json')));
  assert.equal(manifest.name, 'sdd-kit');
  assert.equal(manifest.version, JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'))).version);
  for (const plugin of fs.readdirSync(path.join(ROOT, 'plugins'))) {
    const dir = path.join(ROOT, 'plugins', plugin, 'skills');
    if (!fs.existsSync(dir)) continue;
    for (const skill of fs.readdirSync(dir)) {
      if (!fs.existsSync(path.join(dir, skill, 'SKILL.md'))) continue;
      const text = fs.readFileSync(path.join(native, 'skills', skill, 'SKILL.md'), 'utf8');
      assert.match(text, new RegExp(`^---\\nname: ${skill}\\n`));
      assert.ok(!text.includes('sdd-codex'));
    }
  }
  const mcp = JSON.parse(fs.readFileSync(path.join(native, '.mcp.json')));
  assert.deepEqual(Object.keys(mcp.mcpServers).sort(), ['context7', 'playwright', 'sdd-workflows']);
});
test('shared installer preserves every legacy Claude flag and routes Codex explicitly', () => {
  const flags = ['--project', '--stack=laravel,nextjs', '--dry-run', '--prune'];
  const legacy = installRoute(flags);
  assert.equal(legacy.command, 'bash');
  assert.deepEqual(legacy.args, [path.join(ROOT, 'install.sh'), ...flags]);
  assert.deepEqual(installRoute(['--host=claude', ...flags]), legacy);
  const native = installRoute(['--host', 'codex', '--dry-run']);
  assert.equal(native.command, process.execPath);
  const dry = spawnSync(native.command, native.args, { encoding: 'utf8' });
  assert.equal(dry.status, 0, dry.stderr);
  assert.equal(JSON.parse(dry.stdout).commands[1].at(-1), 'sdd-kit@sdd-kit');
  assert.throws(() => installRoute(['--host', 'unknown']), /Choose/);
  assert.throws(() => parseBuildArgs(['--host']), /Missing/);
});
test('Node selection rejects non-Node executables before writing and preserves equals in paths', () => {
  const before = tree(path.join(ROOT, 'dist/codex'));
  assert.throws(() => build({ host: 'codex', nodeBinary: '/bin/echo' }), /Node 20/);
  assert.deepEqual(tree(path.join(ROOT, 'dist/codex')), before);
  const node = '/opt/node=20/bin/node';
  assert.equal(parseBuildArgs([`--node=${node}`]).nodeBinary, node);
  assert.equal(installPlan([`--node=${node}`, '--dry-run']).nodeBinary, node);
  assert.throws(() => installPlan(['--node=']), /Missing/);
});
test('runtime dependencies resolve from a hoisted npm installation and include transitive packages', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-hoisted-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  for (const name of ['sdd-kit', 'dependency', 'transitive']) fs.mkdirSync(path.join(dir, 'node_modules', name), { recursive: true });
  const pkg = (name, value) => fs.writeFileSync(path.join(dir, 'node_modules', name, 'package.json'), JSON.stringify({ name, version: '1.0.0', ...value }));
  pkg('sdd-kit', { dependencies: { dependency: '1.0.0' } });
  pkg('dependency', { main: 'index.cjs', dependencies: { transitive: '1.0.0' } });
  pkg('transitive', { main: 'index.cjs' });
  fs.writeFileSync(path.join(dir, 'node_modules/dependency/index.cjs'), "module.exports = require('transitive')");
  fs.writeFileSync(path.join(dir, 'node_modules/transitive/index.cjs'), 'module.exports = 42');
  const out = path.join(dir, 'isolated');
  bundleDependencies(path.join(dir, 'node_modules/sdd-kit/package.json'), out);
  fs.rmSync(path.join(dir, 'node_modules'), { recursive: true });
  assert.equal(createRequire(path.join(out, 'package.json'))('dependency'), 42);
});
