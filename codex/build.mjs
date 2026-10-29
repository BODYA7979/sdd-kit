import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const upstream = path.resolve(root, '..');
const out = path.join(root, 'dist/sdd-kit-codex');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const dir of ['runtime', 'hooks', 'skills']) fs.cpSync(path.join(root, dir), path.join(out, dir), { recursive: true });
fs.cpSync(path.join(root, 'node_modules'), path.join(out, 'node_modules'), { recursive: true });
fs.mkdirSync(path.join(out, 'source'), { recursive: true });
fs.cpSync(path.join(upstream, 'plugins'), path.join(out, 'source/plugins'), { recursive: true });
fs.cpSync(path.join(upstream, 'share'), path.join(out, 'source/share'), { recursive: true });
fs.copyFileSync(path.join(upstream, 'LICENSE'), path.join(out, 'LICENSE'));
fs.copyFileSync(path.join(root, 'README.md'), path.join(out, 'README.md'));
for (const plugin of fs.readdirSync(path.join(upstream, 'plugins'))) {
  const skills = path.join(upstream, 'plugins', plugin, 'skills');
  if (!fs.existsSync(skills)) continue;
  for (const name of fs.readdirSync(skills)) {
    const folder = path.join(skills, name);
    if (!fs.existsSync(path.join(folder, 'SKILL.md'))) continue;
    const target = path.join(out, 'skills', name);
    fs.cpSync(folder, target, { recursive: true });
    const original = fs.readFileSync(path.join(target, 'SKILL.md'), 'utf8');
    if (/^disable-model-invocation:\s*true\s*$/m.test(original)) {
      fs.mkdirSync(path.join(target, 'agents'), { recursive: true });
      fs.writeFileSync(path.join(target, 'agents/openai.yaml'), 'policy:\n  allow_implicit_invocation: false\n');
    }
    // Keep upstream procedures and assets; remove host-only frontmatter fields.
    const mapped = original.replace(/^---\n([\s\S]*?)\n---/, (_, header) => `---\n${header.split('\n').filter(line => !/^(argument-hint|disable-model-invocation|user-invocable|context|agent|allowed-tools):/.test(line)).join('\n')}\n---\n\nCodex compatibility: first read the installed \`sdd-codex\` skill's provider mapping. This package is a preview; its compatibility reference lists outstanding parity gates.\n`);
    fs.writeFileSync(path.join(target, 'SKILL.md'), mapped);
  }
}
fs.mkdirSync(path.join(out, '.codex-plugin'), { recursive: true });
fs.writeFileSync(path.join(out, '.codex-plugin/plugin.json'), JSON.stringify({ name: 'sdd-kit-codex', version: '3.1.0-codex.1', description: 'Native Codex subagent bridge for SDD Kit. Compatibility preview; see the parity matrix before production use.', skills: './skills/', mcpServers: './.mcp.json', hooks: './hooks/hooks.json' }, null, 2));
fs.writeFileSync(path.join(out, '.mcp.json'), JSON.stringify({ mcpServers: { 'sdd-workflows': { command: 'node', args: ['${CLAUDE_PLUGIN_ROOT}/runtime/server.mjs'] } } }, null, 2));
const hook = (script, matcher) => ({ matcher, hooks: [{ type: 'command', command: `node "${'${CLAUDE_PLUGIN_ROOT}'}/hooks/dispatch.mjs" ${script}`, timeout: 15 }] });
fs.writeFileSync(path.join(out, 'hooks/hooks.json'), JSON.stringify({ hooks: {
  SessionStart: [hook('session-start.sh', ''), hook('post-compact-context.sh', 'compact')],
  UserPromptSubmit: [hook('prompt-preflight.sh', '')],
  PreCompact: [hook('pre-compact-save.sh', '')],
  SessionEnd: [hook('session-end.sh', '')],
  PreToolUse: [hook('block-dangerous.sh', 'Bash'), hook('check-commit-msg.sh', 'Bash'), hook('laravel-test-first.sh', 'apply_patch'), hook('nextjs-test-first.sh', 'apply_patch')],
  PostToolUse: [hook('scan-secrets.sh', 'apply_patch'), hook('gate-guard.sh', 'apply_patch'), hook('laravel-lint.sh', 'apply_patch'), hook('nextjs-lint.sh', 'apply_patch')],
} }, null, 2));
const market = path.join(root, 'dist/.agents/plugins');
fs.mkdirSync(market, { recursive: true });
fs.writeFileSync(path.join(market, 'marketplace.json'), JSON.stringify({ name: 'sdd-kit-codex-local', plugins: [{ name: 'sdd-kit-codex', source: { source: 'local', path: './sdd-kit-codex' }, policy: { installation: 'AVAILABLE', authentication: 'ON_INSTALL' }, category: 'Developer Tools' }] }, null, 2));
console.log(out);
