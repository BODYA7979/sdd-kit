#!/usr/bin/env node
// Rebuild the static documentation from checked-in Markdown and package metadata.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import MarkdownIt from 'markdown-it';
import { parse as parseYaml } from 'yaml';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = 'https://github.com/BODYA7979/sdd-kit/blob/main/';
const slash = value => value.split(path.sep).join('/');
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function filesIn(dir, suffix) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'en')).flatMap(entry => {
    if (entry.name === '.git' || entry.name === 'node_modules') return [];
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? filesIn(file, suffix) : entry.isFile() && file.endsWith(suffix) ? [file] : [];
  });
}

export function slug(text) {
  return text.toLowerCase().replace(/[^\p{L}\p{N}_\-\s]/gu, '').replace(/\s/g, '-');
}

function frontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  return match ? { data: parseYaml(match[1]), raw: match[1], body: text.slice(match[0].length) } : { data: {}, raw: '', body: text };
}

export function docLink(href, sourceFile, root = ROOT) {
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(href)) return href;
  const match = href.match(/^([^?#]*)([?#].*)?$/);
  const originalPath = decodeURIComponent(match[1]);
  const suffix = match[2] || '';
  const target = path.resolve(path.dirname(sourceFile), originalPath);
  const docsRoot = path.join(root, 'docs');
  const relative = path.relative(docsRoot, target);
  const inDocs = relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
  if (inDocs) return match[1].replace(/\.md$/i, '.html') + suffix;
  const repoPath = path.relative(root, target);
  if (repoPath === '..' || repoPath.startsWith(`..${path.sep}`) || path.isAbsolute(repoPath)) return href;
  // GitHub Pages serves docs/, so source links must leave the documentation site.
  return SOURCE + slash(repoPath).split('/').map(encodeURIComponent).join('/') + suffix;
}

export function renderMarkdown(text, sourceFile, root = ROOT) {
  const md = new MarkdownIt({ html: false, linkify: false });
  const seen = new Map();
  const headings = [];
  md.core.ruler.push('doc-headings-and-links', state => {
    for (let i = 0; i < state.tokens.length; i++) {
      const token = state.tokens[i];
      if (token.type === 'heading_open') {
        const inline = state.tokens[i + 1];
        const title = (inline.children || []).filter(child => child.type !== 'html_inline').map(child => child.content).join('');
        const base = slug(title);
        const count = seen.get(base) || 0;
        const id = base + (count ? `-${count}` : '');
        seen.set(base, count + 1);
        token.attrSet('id', id);
        headings.push({ title, id, level: Number(token.tag.slice(1)) });
      }
      for (const child of token.children || []) {
        if (child.type === 'link_open') child.attrSet('href', docLink(child.attrGet('href'), sourceFile, root));
        if (child.type === 'image') child.attrSet('src', docLink(child.attrGet('src'), sourceFile, root));
      }
    }
  });
  md.renderer.rules.table_open = () => '<div class="table-wrap"><table>\n';
  md.renderer.rules.table_close = () => '</table></div>\n';
  const parsed = frontmatter(text);
  const body = md.render(parsed.body);
  const metadata = parsed.raw ? `<details class="doc-metadata"><summary>Document metadata</summary><pre><code class="language-yaml">${escape(parsed.raw)}</code></pre></details>\n` : '';
  return { html: metadata + body, title: headings.find(h => h.level === 1)?.title || parsed.data.title || path.basename(sourceFile, '.md'), headings };
}

const themeBootstrap = `(function(){var root=document.documentElement,stored=null;try{stored=localStorage.getItem('sdd-guide-theme')}catch(e){}var theme=stored==='light'||stored==='dark'?stored:(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');root.dataset.theme=theme;root.style.colorScheme=theme})();`;
const themeControl = `(function(){var KEY='sdd-guide-theme',NEXT={system:'light',light:'dark',dark:'system'},root=document.documentElement,os=matchMedia('(prefers-color-scheme: dark)'),button=document.getElementById('theme-toggle'),choice='system';try{var v=localStorage.getItem(KEY);if(v==='light'||v==='dark')choice=v}catch(e){}function apply(){var theme=choice==='system'?(os.matches?'dark':'light'):choice;root.dataset.theme=theme;root.style.colorScheme=theme;button.querySelector('.btn-label').textContent='Theme: '+choice;button.setAttribute('aria-label','Theme: '+choice+'. Switch to '+NEXT[choice]+'.')}button.addEventListener('click',function(){choice=NEXT[choice];try{if(choice==='system')localStorage.removeItem(KEY);else localStorage.setItem(KEY,choice)}catch(e){}apply()});if(os.addEventListener)os.addEventListener('change',function(){if(choice==='system')apply()});apply()})();`;

export function renderPage(sourceFile, root = ROOT) {
  const docsRoot = path.join(root, 'docs');
  const relative = slash(path.relative(docsRoot, sourceFile));
  const prefix = slash(path.relative(path.dirname(sourceFile), docsRoot));
  const url = target => (prefix ? `${prefix}/` : '') + target;
  const { html, title } = renderMarkdown(fs.readFileSync(sourceFile, 'utf8'), sourceFile, root);
  const host = relative === 'hosts/codex.md' ? 'codex' : relative === 'hosts/claude.md' ? 'claude' : 'shared';
  const version = fs.readFileSync(path.join(root, 'VERSION'), 'utf8').trim();
  return `<!doctype html>
<!-- Generated by scripts/build-docs.mjs. Edit ${relative}, then run npm run docs:build. -->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)} · SDD Kit</title>
<link rel="icon" href="data:,">
<script>${themeBootstrap}</script>
<link rel="stylesheet" href="${url('guide.css')}">
</head>
<body class="doc-page" data-doc-host="${host}">
<a class="skip-link" href="#content">Skip to content</a>
<header class="site-header">
  <div class="brand"><a class="brand-name" href="${url('index.html')}">SDD Kit</a><span class="badge">v${escape(version)}</span></div>
  <div class="header-actions">
    <label class="host-picker" for="host-select">Agent <select id="host-select"><option value="compare">Compare</option><option value="claude">Claude Code</option><option value="codex">Codex</option></select></label>
    <a class="btn" href="${url('index.html')}" aria-label="Interactive guide"><span aria-hidden="true">←</span><span class="btn-label">Guide</span></a>
    <button type="button" class="btn theme-toggle" id="theme-toggle" aria-label="Change color theme"><svg class="icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 2a6 6 0 0 1 0 12z" fill="currentColor"/></svg><span class="btn-label">Theme</span></button>
  </div>
</header>
<main id="content" class="doc-main">
  <nav class="doc-nav linkrow" aria-label="Documentation"><a href="${url('reference/getting-started.html')}">Quickstart</a><a href="${url('reference/installation.html')}">Install</a><a href="${url('hosts/claude.html?host=claude')}">Claude Code</a><a href="${url('hosts/codex.html?host=codex')}">Codex</a><a href="${url('hosts/compare.html?host=compare')}">Compare</a></nav>
  <p id="host-context" class="host-context">${host === 'shared' ? 'Shared documentation. Host-specific instructions are labeled in the text.' : `This page documents ${host === 'claude' ? 'Claude Code' : 'Codex'}. The agent selector sets your preference for the interactive guide.`}</p>
  <p class="doc-path mono">${escape(relative)}</p>
  <article class="doc-body">
${html}  </article>
  <p class="doc-source"><a href="${escape(path.basename(sourceFile))}">View the Markdown source</a></p>
</main>
<script>${themeControl}</script>
<script src="${url('host.js')}"></script>
</body>
</html>
`;
}

export function buildCatalog(root = ROOT) {
  const skills = [], agents = [], workflows = [];
  const pluginsRoot = path.join(root, 'plugins');
  for (const plugin of fs.readdirSync(pluginsRoot).sort()) {
    const ships = plugin === 'sdd-kit' ? 'core' : plugin.replace(/^sdd-kit-/, '') + ' plugin';
    for (const file of filesIn(path.join(pluginsRoot, plugin, 'skills'), 'SKILL.md')) {
      const { data } = frontmatter(fs.readFileSync(file, 'utf8'));
      const overlay = path.join(root, 'adapters/codex/skill-overlays', data.name, 'SKILL.md');
      const codexDescription = fs.existsSync(overlay)
        ? frontmatter(fs.readFileSync(overlay, 'utf8')).data.description
        : data.description.replaceAll('CLAUDE.md', 'AGENTS.md').replaceAll('.claude', '.codex');
      skills.push({ name: data.name, plugin, ships, category: data.metadata?.category || (plugin === 'sdd-kit' ? 'core' : plugin.replace(/^sdd-kit-/, '')), invoke: data['disable-model-invocation'] ? 'manual' : data['user-invocable'] === false ? 'auto' : 'both', description: data.description, codexDescription, hosts: ['claude', 'codex'], source: slash(path.relative(root, file)) });
    }
    for (const file of filesIn(path.join(pluginsRoot, plugin, 'agents'), '.md')) {
      const { data } = frontmatter(fs.readFileSync(file, 'utf8'));
      agents.push({ name: data.name, plugin, ships, category: data.metadata?.category || (plugin === 'sdd-kit' ? 'core' : plugin.replace(/^sdd-kit-/, '')), model: data.model || '', effort: data.effort || '', description: data.description, hosts: ['claude', 'codex'], source: slash(path.relative(root, file)), codexModel: 'Inherited from the parent unless explicitly mapped' });
    }
  }
  const nativeFile = path.join(root, 'adapters/codex/skill-overlays/sdd-runtime/SKILL.md');
  const { data: native } = frontmatter(fs.readFileSync(nativeFile, 'utf8'));
  skills.push({ name: native.name, plugin: 'sdd-kit', ships: 'core', category: 'runtime', invoke: 'both', description: native.description, hosts: ['codex'], source: slash(path.relative(root, nativeFile)) });
  const workflowsRoot = path.join(root, 'plugins/sdd-kit/workflows');
  for (const file of filesIn(workflowsRoot, '.js').filter(file => path.dirname(file) === workflowsRoot)) {
    const text = fs.readFileSync(file, 'utf8');
    const match = text.match(/^export const meta = (\{[\s\S]*?^\})/m);
    if (!match) throw new Error(`Workflow metadata not found: ${file}`);
    // Evaluate only the metadata literal, never the workflow body or its host calls.
    const meta = vm.runInNewContext(`(${match[1]})`, Object.create(null), { timeout: 100 });
    workflows.push({ name: meta.name, description: meta.description, whenToUse: meta.whenToUse, phases: meta.phases.map(({ title, detail }) => ({ title, detail })), hosts: ['claude', 'codex'], source: slash(path.relative(root, file)) });
  }
  const sort = rows => rows.sort((a, b) => a.name.localeCompare(b.name, 'en'));
  return { skills: sort(skills), agents: sort(agents), workflows: sort(workflows) };
}

export function generatedFiles(root = ROOT) {
  const output = new Map();
  // Example specs live under .ai/: keep them when GitHub Pages serves this tree.
  output.set(path.join(root, 'docs/.nojekyll'), '');
  for (const file of filesIn(path.join(root, 'docs'), '.md')) output.set(file.replace(/\.md$/, '.html'), renderPage(file, root));
  output.set(path.join(root, 'docs/catalog.js'), '// Generated by scripts/build-docs.mjs from canonical frontmatter and workflow metadata. Do not edit by hand.\nwindow.CATALOG = ' + JSON.stringify(buildCatalog(root), null, 2) + ';\n');
  const example = path.join(root, 'docs/example-data.js');
  if (fs.existsSync(example)) output.set(example, normalizeExampleLinks(fs.readFileSync(example, 'utf8')));
  return output;
}

export function normalizeExampleLinks(text) {
  // Preserve the fixture and its historical evidence byte-for-byte except URL values.
  return text.replace('// Generated by tools/gen-guide-example.mjs from docs/examples/job-board. Do not edit by hand.', '// Historical worked-example snapshot; scripts/build-docs.mjs maintains local links only. See maintaining-docs.md.')
    .replace(/("(?:href|[a-zA-Z]+Href)"\s*:\s*)"([^"\n]*)"/g, (match, key, value) => {
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(value)) return match;
    const url = value.replace(/^\.\.\/examples\/job-board\//, 'examples/job-board/').replace(/\.md(?=[?#]|$)/, '.html');
    return key + '"' + url + '"';
  });
}

export function checkLinks(root = ROOT, generated = generatedFiles(root)) {
  const errors = [];
  const docsRoot = path.join(root, 'docs');
  const html = new Map(filesIn(docsRoot, '.html').map(file => [file, fs.readFileSync(file, 'utf8')]));
  for (const [file, text] of generated) if (file.endsWith('.html')) html.set(file, text);
  const exampleFile = path.join(docsRoot, 'example-data.js');
  const exampleText = generated.get(exampleFile) || (fs.existsSync(exampleFile) ? fs.readFileSync(exampleFile, 'utf8') : '');
  const exampleLinks = [...exampleText.matchAll(/"(?:href|[a-zA-Z]+Href)"\s*:\s*("(?:\\.|[^"\\])*")/g)].map(match => `<a href="${escape(JSON.parse(match[1]))}"></a>`).join('\n');
  if (exampleLinks) html.set(exampleFile, exampleLinks);
  const ids = new Map([...html].map(([file, text]) => [file, new Set([...text.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]))]));
  for (const [file, text] of html) {
    // Only HTML attributes; text and examples inside <code> are escaped by MarkdownIt.
    for (const match of text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<!--[\s\S]*?-->/g, '').matchAll(/\b(?:href|src)="([^"]+)"/g)) {
      const href = match[1].replaceAll('&amp;', '&');
      if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href) || !href) continue;
      let address;
      try { address = new URL(href, `file://${file}`); } catch { errors.push(`${slash(path.relative(root, file))}: invalid URL ${href}`); continue; }
      const target = fileURLToPath(address);
      if (!fs.existsSync(target) && !generated.has(target)) { errors.push(`${slash(path.relative(root, file))}: missing target ${href}`); continue; }
      if (address.hash && ids.has(target)) {
        const hash = decodeURIComponent(address.hash.slice(1));
        // The interactive guide and example board also have client-side routes.
        const dynamic = path.basename(target) === 'index.html' && /^(route|workflow|skill|agent|chapter|example|board|install|catalog)\//.test(hash)
          || path.basename(target) === 'index.html' && ['skills', 'agents', 'workflows'].includes(hash)
          || path.basename(target) === 'example-board.html' && /^spec\//.test(hash);
        if (!dynamic && !ids.get(target).has(hash)) errors.push(`${slash(path.relative(root, file))}: missing anchor ${href}`);
      }
    }
  }
  // Check source links before they become GitHub links: a valid URL is not proof a file exists.
  const md = new MarkdownIt({ html: false });
  for (const file of filesIn(docsRoot, '.md')) {
    const tokens = md.parse(frontmatter(fs.readFileSync(file, 'utf8')).body, {});
    for (const token of tokens) for (const child of token.children || []) {
      const href = child.type === 'link_open' ? child.attrGet('href') : child.type === 'image' ? child.attrGet('src') : null;
      if (!href || /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(href)) continue;
      const target = path.resolve(path.dirname(file), decodeURIComponent(href.split(/[?#]/)[0]));
      if (!fs.existsSync(target) && !generated.has(target)) errors.push(`${slash(path.relative(root, file))}: missing source ${href}`);
    }
  }
  return [...new Set(errors)];
}

export function buildDocs({ root = ROOT, check = false, links = true } = {}) {
  const output = generatedFiles(root);
  const stale = [];
  for (const [file, text] of output) {
    const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
    if (current === text) continue;
    if (check) stale.push(slash(path.relative(root, file)));
    else fs.writeFileSync(file, text);
  }
  const broken = links ? checkLinks(root, output) : [];
  return { pages: [...output.keys()].filter(file => file.endsWith('.html')).length, stale, broken };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.some(arg => arg !== '--check')) throw new Error('Usage: node scripts/build-docs.mjs [--check]');
    const result = buildDocs({ check: args.includes('--check') });
    console.log(`${args.includes('--check') ? 'Checked' : 'Built'} ${result.pages} documentation pages and catalog.js.`);
    for (const file of result.stale) console.error(`Stale generated output: ${file}`);
    for (const error of result.broken) console.error(error);
    if (result.stale.length || result.broken.length) process.exitCode = 1;
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
