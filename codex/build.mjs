import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const root = path.dirname(fileURLToPath(import.meta.url));
const upstream = path.resolve(root, '..');
const { version } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const nodeFlag = process.argv.indexOf('--node');
const nodeBinary = nodeFlag >= 0 ? process.argv[nodeFlag + 1] : null;
if (nodeFlag >= 0) {
  if (!nodeBinary || !path.isAbsolute(nodeBinary)) throw new Error('--node requires an absolute Node binary path');
  const check = spawnSync(nodeBinary, ['--version'], { encoding: 'utf8' });
  if (check.status !== 0 || Number(check.stdout.trim().replace(/^v/, '').split('.')[0]) < 20) throw new Error('--node must select Node 20 or newer');
}
const out = path.join(root, 'dist/sdd-kit-codex');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const dir of ['runtime', 'hooks', 'skills']) fs.cpSync(path.join(root, dir), path.join(out, dir), { recursive: true });
fs.cpSync(path.join(root, 'node_modules'), path.join(out, 'node_modules'), { recursive: true });
fs.mkdirSync(path.join(out, 'source'), { recursive: true });
fs.cpSync(path.join(upstream, 'plugins'), path.join(out, 'source/plugins'), { recursive: true });
fs.cpSync(path.join(upstream, 'share'), path.join(out, 'source/share'), { recursive: true });
fs.cpSync(path.join(upstream, 'plugins/sdd-kit/workflows'), path.join(out, 'workflows'), { recursive: true });
fs.cpSync(path.join(upstream, 'plugins/sdd-kit/scripts'), path.join(out, 'scripts'), { recursive: true });
// The native equivalent is the deep-review skill, which delegates to native subagents.
fs.rmSync(path.join(out, 'scripts/review'), { recursive: true, force: true });
fs.copyFileSync(path.join(upstream, 'LICENSE'), path.join(out, 'LICENSE'));
fs.copyFileSync(path.join(root, 'README.md'), path.join(out, 'README.md'));
fs.copyFileSync(path.join(root, 'package.json'), path.join(out, 'package.json'));
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
    // Rebuild supported frontmatter rather than leaving nested Claude-only fields behind.
    // Upstream has plain descriptions containing ': ', which must be quoted for native YAML parsers.
    const mapped = original.replace(/^---\n([\s\S]*?)\n---/, (_, header) => {
      let description = header.match(/^description:\s*(.+)$/m)?.[1] || `SDD ${name} workflow`;
      if (description.startsWith('"') && description.endsWith('"')) { try { description = JSON.parse(description); } catch {} }
      description = description.replace(/[<>]/g, '');
      if (description.length > 1024) description = description.slice(0, 1000).replace(/\s+\S*$/, '') + '…';
      const license = header.match(/^license:\s*(.+)$/m)?.[1];
      const fields = `name: ${name}\ndescription: ${JSON.stringify(description)}${license ? `\nlicense: ${JSON.stringify(license)}` : ''}\nmetadata:\n  upstream-plugin: ${plugin}\n  upstream-skill: ${name}`;
      const paths = header.match(/^paths:\s*\n((?:[ \t]+.*\n?)*)/m)?.[1]?.trim();
      return `---\n${fields}\n---\n\nCodex: first read the installed \`sdd-codex\` skill's provider mapping. Resolve SDD_SKILL_DIR to this skill's actual directory and SDD_PLUGIN_ROOT to the containing installed plugin; these are path notation, not pre-set shell variables.\n${paths ? `\nUpstream path applicability:\n${paths}\n` : ''}`;
    });
    fs.writeFileSync(path.join(target, 'SKILL.md'), mapped);
  }
}
// Adapt provider-owned paths in instruction text, while keeping originals under source/ for provenance.
function mapDocs(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) mapDocs(file);
    else if (entry.name.endsWith('.md')) fs.writeFileSync(file, fs.readFileSync(file, 'utf8')
      .replaceAll('CLAUDE.md', 'AGENTS.md').replaceAll('.claude', '.codex')
      .replaceAll('CLAUDE_SKILL_DIR', 'SDD_SKILL_DIR').replaceAll('CLAUDE_PLUGIN_ROOT', 'SDD_PLUGIN_ROOT')
      .replaceAll('claude -p "/deep-review --depth=standard --format=json" > review.json', '# In a native Codex session invoke $deep-review --depth=standard --format=json and save its JSON report.'));
  }
}
mapDocs(path.join(out, 'skills'));
// Native overrides take precedence over the bundled compatibility text.
fs.cpSync(path.join(root, 'skills'), path.join(out, 'skills'), { recursive: true });
const trustFile = path.join(out, 'skills/stack-trust/scripts/trust-store.mjs');
const oldHash = crypto.createHash('sha256').update(fs.readFileSync(trustFile)).digest('hex');
fs.writeFileSync(trustFile, '#!/usr/bin/env node\nimport { main } from "../../../runtime/stacks-cli.mjs";\nmain().catch(error => { console.error(error.message); process.exitCode = 1; });\n');
fs.writeFileSync(path.join(out, 'skills/new-stack/scripts/new-stack.mjs'), '#!/usr/bin/env node\nimport { main } from "../../../runtime/new-stack.mjs";\nmain().catch(error => { console.error(error.message); process.exitCode = 1; });\n');
const newHash = crypto.createHash('sha256').update(fs.readFileSync(trustFile)).digest('hex');
const gates = path.join(out, 'skills/verification-gates/SKILL.md');
fs.writeFileSync(gates, fs.readFileSync(gates, 'utf8').replaceAll(oldHash, newHash));
fs.appendFileSync(path.join(out, 'skills/progress/SKILL.md'), '\n## Native workflow activity\n\nInclude the run id, name, phase and status from `.ai/codex-workflows/*.json` when present. Read these files without taking ownership or deleting locks. For a run already connected to this session, `workflow_status` provides current activity. Recover work only on request with `workflow_resume` and `workflow_reconnect`; never redispatch an uncertain claimed job.\n');
fs.mkdirSync(path.join(out, '.codex-plugin'), { recursive: true });
fs.writeFileSync(path.join(out, '.codex-plugin/plugin.json'), JSON.stringify({ name: 'sdd-kit-codex', version, description: 'SDD Kit workflows, skills and safeguards for native Codex subagents.', skills: './skills/', mcpServers: './.mcp.json', hooks: './hooks/hooks.json' }, null, 2));
const mcp = JSON.parse(fs.readFileSync(path.join(upstream, 'plugins/sdd-kit/.mcp.json'), 'utf8'));
mcp.mcpServers['sdd-workflows'] = { command: 'node', args: ['${CLAUDE_PLUGIN_ROOT}/runtime/server.mjs'] };
if (nodeBinary) for (const server of Object.values(mcp.mcpServers)) {
  server.env = { ...(server.env || {}), PATH: path.dirname(nodeBinary) + path.delimiter + (process.env.PATH || '/usr/bin:/bin') };
  if (server.command === 'node') server.command = nodeBinary;
}
fs.writeFileSync(path.join(out, '.mcp.json'), JSON.stringify(mcp, null, 2));
const hook = (script, matcher) => ({ matcher, hooks: [{ type: 'command', command: `node "${'${CLAUDE_PLUGIN_ROOT}'}/hooks/dispatch.mjs" ${script}`, timeout: 15 }] });
const lifecycle = matcher => ({ ...(matcher ? { matcher } : {}), hooks: [{ type: 'command', command: `node "${'${PLUGIN_ROOT}'}/hooks/lifecycle.mjs"`, timeout: 10 }] });
fs.writeFileSync(path.join(out, 'hooks/hooks.json'), JSON.stringify({ hooks: {
  SessionStart: [lifecycle()],
  UserPromptSubmit: [hook('prompt-preflight.sh', '')],
  PreCompact: [lifecycle()],
  SessionEnd: [lifecycle()],
  Stop: [lifecycle()],
  SubagentStop: [lifecycle()],
  PreToolUse: [hook('block-dangerous.sh', 'Bash'), hook('check-commit-msg.sh', 'Bash'), hook('token-budget.sh', 'Bash'), hook('laravel-test-first.sh', 'apply_patch'), hook('nextjs-test-first.sh', 'apply_patch')],
  PostToolUse: [hook('scan-secrets.sh', 'apply_patch'), hook('gate-guard.sh', 'apply_patch'), hook('laravel-lint.sh', 'apply_patch'), hook('nextjs-lint.sh', 'apply_patch'), hook('scan-injection.sh', 'Bash|mcp__.*|web.*')],
} }, null, 2));
const market = path.join(root, 'dist/.agents/plugins');
fs.mkdirSync(market, { recursive: true });
fs.writeFileSync(path.join(market, 'marketplace.json'), JSON.stringify({ name: 'sdd-kit-codex-local', plugins: [{ name: 'sdd-kit-codex', source: { source: 'local', path: './sdd-kit-codex' }, policy: { installation: 'AVAILABLE', authentication: 'ON_INSTALL' }, category: 'Developer Tools' }] }, null, 2));
console.log(out);
