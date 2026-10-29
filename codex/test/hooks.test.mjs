import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { normalize } from '../hooks/normalize.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
test('a multi-file patch retains every added line and the destination of a move', () => {
  const events = normalize({ cwd: '/project', tool_name: 'apply_patch', tool_input: { command: '*** Begin Patch\n*** Add File: a.ts\n+test.skip();\n*** Update File: b.ts\n*** Move to: c.ts\n@@\n-old\n+new\n*** Delete File: d.ts\n*** End Patch' } });
  assert.equal(events.length, 2);
  assert.equal(events[0].tool_input.file_path, '/project/a.ts');
  assert.equal(events[0].tool_input.content, 'test.skip();');
  assert.equal(events[1].tool_input.file_path, '/project/c.ts');
  assert.equal(events[1].tool_input.new_string, 'new');
});
test('malformed patch input fails instead of silently skipping guards', () => {
  assert.throws(() => normalize({ tool_name: 'apply_patch', tool_input: {} }), /Invalid/);
  assert.throws(() => normalize({ tool_name: 'apply_patch', tool_input: { command: '*** Begin Patch\n*** End Patch' } }), /no files/);
});
test('normalized Codex edits trigger original secret and test-first guards', t => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-hook-'));
  t.after(() => fs.rmSync(cwd, { recursive: true, force: true }));
  const file = path.join(cwd, 'app/Http/Controllers/Probe.php');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const content = 'AKIA' + '0'.repeat(16);
  fs.writeFileSync(file, content);
  const [event] = normalize({ cwd, tool_name: 'apply_patch', tool_input: { command: `*** Begin Patch\n*** Add File: ${file}\n+${content}\n*** End Patch` } });
  for (const script of ['plugins/sdd-kit/scripts/scan-secrets.sh', 'plugins/sdd-kit-laravel/scripts/laravel-test-first.sh']) {
    const r = spawnSync('bash', [path.join(root, script)], { input: JSON.stringify(event), encoding: 'utf8', cwd, env: { ...process.env, CLAUDE_PROJECT_DIR: cwd } });
    assert.equal(r.status, 2, r.stderr);
  }
});
