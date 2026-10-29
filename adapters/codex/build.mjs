import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

// npm/npx can hoist dependencies outside this package. Bundle only the resolved
// production closure, preserving nested resolution rather than copying a checkout's node_modules.
export function bundleDependencies(fromPackage, destination) {
  const manifest = JSON.parse(fs.readFileSync(fromPackage, 'utf8'));
  const resolve = createRequire(fromPackage);
  for (const name of Object.keys(manifest.dependencies || {})) {
    let source;
    try { source = path.dirname(resolve.resolve(`${name}/package.json`)); }
    catch {
      source = path.dirname(resolve.resolve(name));
      while (!fs.existsSync(path.join(source, 'package.json')) || JSON.parse(fs.readFileSync(path.join(source, 'package.json'))).name !== name) {
        const parent = path.dirname(source);
        if (parent === source) throw new Error(`Cannot locate dependency ${name}`);
        source = parent;
      }
    }
    const target = path.join(destination, 'node_modules', name);
    fs.cpSync(source, target, { recursive: true, filter: file => file !== path.join(source, 'node_modules') });
    bundleDependencies(path.join(source, 'package.json'), target);
  }
}

export function buildCodex({ root: upstream, out, nodeBinary = null }) {
const adapter = path.dirname(fileURLToPath(import.meta.url));
const {version} = JSON.parse(fs.readFileSync(path.join(upstream, 'package.json'), 'utf8'));
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const [dest, source] of Object.entries({runtime:'runtime', hooks:'hooks', skills:'skill-overlays'})) fs.cpSync(path.join(adapter, source), path.join(out, dest), { recursive: true });
bundleDependencies(path.join(upstream, 'package.json'), out);
fs.mkdirSync(path.join(out, 'source'), { recursive: true });
fs.cpSync(path.join(upstream, 'plugins'), path.join(out, 'source/plugins'), { recursive: true });
fs.cpSync(path.join(upstream, 'share'), path.join(out, 'source/share'), { recursive: true });
fs.cpSync(path.join(upstream, 'plugins/sdd-kit/workflows'), path.join(out, 'workflows'), { recursive: true });
fs.cpSync(path.join(upstream, 'plugins/sdd-kit/scripts'), path.join(out, 'scripts'), { recursive: true });
// The native equivalent is the deep-review skill, which delegates to native subagents.
fs.rmSync(path.join(out, 'scripts/review'), { recursive: true, force: true });
fs.copyFileSync(path.join(upstream, 'LICENSE'), path.join(out, 'LICENSE'));
fs.mkdirSync(path.join(out, 'docs'), { recursive: true });
fs.copyFileSync(path.join(upstream, 'docs/architecture.md'), path.join(out, 'docs/architecture.md'));
fs.writeFileSync(path.join(out, 'README.md'), fs.readFileSync(path.join(upstream, 'docs/hosts/codex.md'), 'utf8').replace('(../architecture.md)', '(docs/architecture.md)').replace('(../../adapters/codex/skill-overlays/sdd-runtime/references/compatibility.md)', '(skills/sdd-runtime/references/compatibility.md)'));
const runtimePackage = { name: 'sdd-kit', version, private: true, type: 'module', engines: { node: '>=20' }, dependencies: JSON.parse(fs.readFileSync(path.join(upstream, 'package.json'), 'utf8')).dependencies };
fs.writeFileSync(path.join(out, 'package.json'), JSON.stringify(runtimePackage, null, 2));
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
      return `---\n${fields}\n---\n\nCodex: first read the installed \`sdd-runtime\` skill's provider mapping. Resolve SDD_SKILL_DIR to this skill's actual directory and SDD_PLUGIN_ROOT to the containing installed plugin; these are path notation, not pre-set shell variables.\n${paths ? `\nUpstream path applicability:\n${paths}\n` : ''}`;
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
fs.cpSync(path.join(adapter, 'skill-overlays'), path.join(out, 'skills'), { recursive: true });
const trustFile = path.join(out, 'skills/stack-trust/scripts/trust-store.mjs');
const oldHash = crypto.createHash('sha256').update(fs.readFileSync(trustFile)).digest('hex');
fs.writeFileSync(trustFile, '#!/usr/bin/env node\nimport { main } from "../../../runtime/stacks-cli.mjs";\nmain().catch(error => { console.error(error.message); process.exitCode = 1; });\n');
fs.writeFileSync(path.join(out, 'skills/new-stack/scripts/new-stack.mjs'), '#!/usr/bin/env node\nimport { main } from "../../../runtime/new-stack.mjs";\nmain().catch(error => { console.error(error.message); process.exitCode = 1; });\n');
const newHash = crypto.createHash('sha256').update(fs.readFileSync(trustFile)).digest('hex');
const gates = path.join(out, 'skills/verification-gates/SKILL.md');
fs.writeFileSync(gates, fs.readFileSync(gates, 'utf8').replaceAll(oldHash, newHash));
fs.appendFileSync(path.join(out, 'skills/progress/SKILL.md'), '\n## Native workflow activity\n\nInclude the run id, name, phase and status from `.ai/codex-workflows/*.json` when present. Read these files without taking ownership or deleting locks. For a run already connected to this session, `workflow_status` provides current activity. Recover work only on request with `workflow_resume` and `workflow_reconnect`; never redispatch an uncertain claimed job.\n');
fs.mkdirSync(path.join(out, '.codex-plugin'), { recursive: true });
fs.writeFileSync(path.join(out, '.codex-plugin/plugin.json'), JSON.stringify({ name: 'sdd-kit', version, description: 'SDD Kit workflows, skills and safeguards for native Codex subagents.', skills: './skills/', mcpServers: './.mcp.json', hooks: './hooks/hooks.json' }, null, 2));
const mcp = JSON.parse(fs.readFileSync(path.join(upstream, 'plugins/sdd-kit/.mcp.json'), 'utf8'));
mcp.mcpServers['sdd-workflows'] = { command: 'node', args: ['${CLAUDE_PLUGIN_ROOT}/runtime/server.mjs'] };
if (nodeBinary) for (const server of Object.values(mcp.mcpServers)) {
  server.env = { ...(server.env || {}), PATH: path.dirname(nodeBinary) + path.delimiter + (process.env.PATH || '/usr/bin:/bin') };
  if (server.command === 'node') server.command = nodeBinary;
}
fs.writeFileSync(path.join(out, '.mcp.json'), JSON.stringify(mcp, null, 2));
const nodeCommand = nodeBinary ? "'" + nodeBinary.replaceAll("'", "'\\''") + "'" : 'node';
const hook = (script, matcher) => ({ matcher, hooks: [{ type: 'command', command: `${nodeCommand} "${'${CLAUDE_PLUGIN_ROOT}'}/hooks/dispatch.mjs" ${script}`, timeout: 15 }] });
const lifecycle = matcher => ({ ...(matcher ? { matcher } : {}), hooks: [{ type: 'command', command: `${nodeCommand} "${'${PLUGIN_ROOT}'}/hooks/lifecycle.mjs"`, timeout: 10 }] });
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
const market = path.resolve(out, '../../.agents/plugins');
fs.mkdirSync(market, { recursive: true });
fs.writeFileSync(path.join(market, 'marketplace.json'), JSON.stringify({ name: 'sdd-kit', plugins: [{ name: 'sdd-kit', source: { source: 'local', path: './plugins/sdd-kit' }, policy: { installation: 'AVAILABLE', authentication: 'ON_INSTALL' }, category: 'Developer Tools' }] }, null, 2));
return {host:'codex', path:out};

}
