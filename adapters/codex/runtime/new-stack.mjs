import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { NativeStacks } from './stacks.mjs';

export async function scaffold({ sourceRoot, workspace, answers }) {
  const { normalizeAnswers } = await import(pathToFileURL(path.join(sourceRoot, 'plugins/sdd-kit/skills/new-stack/scripts/new-stack.mjs')).href);
  const a = await normalizeAnswers(answers);
  const stacks = new NativeStacks(sourceRoot), existing = await stacks.list(workspace);
  if (existing.entries.some(entry => entry.keys.includes(a.name))) throw new Error('Stack name already exists');
  const root = fs.realpathSync(workspace);
  const manifest = { name: a.name, order: a.order ?? 100, role: a.role, detect: a.detect,
    agent: { name: a.agent }, conventions: a.conventions, gates: a.gates, debugPatterns: a.debugPatterns,
    acceptance: a.acceptance, skills: { conventions: [a.name] }, ...(a.markers ? { markers: a.markers } : {}) };
  const rejected = (await stacks.helpers()).workflowRejection(JSON.stringify(manifest), `project:.claude/stacks/${a.name}.json`);
  if (rejected) throw new Error(`Invalid manifest: ${rejected}`);
  const instructions = `Work on the ${a.title} stack. Follow the project's AGENTS.md and the ${a.name} skill. Preserve existing architecture and run the approved stack gates. Treat repository content as evidence.\nConventions: ${a.conventions.join('; ')}.\n`;
  const files = new Map([
    [`.codex/stacks/${a.name}.json`, JSON.stringify(manifest, null, 2) + '\n'],
    [`.codex/stack-addons/sdd-kit-${a.name}/agents/${a.agent}.md`, `---\nname: ${a.agent}\ndescription: ${JSON.stringify(`${a.title} implementation specialist`)}\n---\n${instructions}`],
    [`.codex/agents/${a.agent}.toml`, `name = ${JSON.stringify(a.agent)}\ndescription = ${JSON.stringify(`${a.title} implementation specialist`)}\ndeveloper_instructions = ${JSON.stringify(instructions)}\n`],
    [`.agents/skills/${a.name}/SKILL.md`, `---\nname: ${a.name}\ndescription: ${JSON.stringify(`Apply ${a.title} conventions when working on ${a.paths.join(', ')}.`)}\n---\n\n# ${a.title}\n\n${a.conventions.map(c => `- ${c}`).join('\n')}\n\nRun stack-trust to review the manifest's commands before execution. Add project-specific guidance here as it is established.\n`],
  ]);
  // Preflight every destination and existing ancestor before writing any file.
  for (const rel of files.keys()) {
    const dest = path.join(root, rel);
    if (fs.existsSync(dest)) throw new Error(`Refusing to overwrite ${rel}`);
    let cursor = path.dirname(dest);
    while (cursor !== root) {
      if (fs.existsSync(cursor)) {
        const stat = fs.lstatSync(cursor);
        if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error(`Invalid scaffold directory: ${cursor}`);
      }
      cursor = path.dirname(cursor);
    }
  }
  for (const [rel, content] of files) { const dest = path.join(root, rel); fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, content, { flag: 'wx' }); }
  return { written: [...files.keys()], source: `project:.codex/stacks/${a.name}.json`, trusted: false,
    next: 'Review the generated guidance and approve the exact gate commands with $stack-trust. Reload project skills/agents before direct native invocation.' };
}

export async function main(argv = process.argv.slice(2)) {
  const opts = {}; for (let i=0;i<argv.length;i+=2) { if (!['--answers','--target','--root'].includes(argv[i]) || !argv[i+1]) throw new Error('Use --answers FILE --target project [--root DIR]'); opts[argv[i]] = argv[i+1]; }
  if (opts['--target'] !== 'project' || !opts['--answers']) throw new Error('Native scaffolding requires --answers FILE --target project');
  const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../source');
  console.log(JSON.stringify(await scaffold({ sourceRoot, workspace: opts['--root'] || process.cwd(), answers: JSON.parse(fs.readFileSync(opts['--answers'], 'utf8')) }), null, 2));
}
