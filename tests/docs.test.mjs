import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ROOT, buildCatalog, buildDocs, checkLinks, docLink, normalizeExampleLinks, renderMarkdown } from '../scripts/build-docs.mjs';
import { guideLocation, PAGES_URL } from '../cli/sdd-kit.mjs';

test('guide launcher chooses this checkout documentation before legacy and public copies', () => {
  assert.equal(guideLocation(), path.join(ROOT, 'docs/index.html'));
  assert.equal(guideLocation('board'), path.join(ROOT, 'docs/example-board.html'));
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-doc-guide-'));
  try {
    assert.equal(guideLocation(undefined, root), PAGES_URL);
    fs.mkdirSync(path.join(root, 'docs/guide'), { recursive: true });
    fs.writeFileSync(path.join(root, 'docs/guide/index.html'), 'legacy');
    assert.equal(guideLocation(undefined, root), path.join(root, 'docs/guide/index.html'));
    fs.writeFileSync(path.join(root, 'docs/index.html'), 'current');
    assert.equal(guideLocation(undefined, root), path.join(root, 'docs/index.html'));
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('Markdown keeps runnable commands literal and links to the corresponding local page', () => {
  const file = path.join(ROOT, 'docs/reference/installation.md');
  const result = renderMarkdown('# Install\n\n[Codex](../hosts/codex.md?host=codex#install)\n\n```sh\n$sdd "<ticket>"\n```\n\n| Host | Command |\n| --- | --- |\n| Codex | `$sdd` |\n', file);
  assert.match(result.html, /href="\.\.\/hosts\/codex\.html\?host=codex#install"/);
  assert.match(result.html, /\$sdd &quot;&lt;ticket&gt;&quot;/);
  assert.match(result.html, /<div class="table-wrap"><table>/);
  assert.equal(result.title, 'Install');
  assert.equal(docLink('https://example.org/a.md', file), 'https://example.org/a.md');
  assert.equal(docLink('../../scripts/install-host.mjs', file), 'https://github.com/BODYA7979/sdd-kit/blob/main/scripts/install-host.mjs');
});

test('headings have unique stable anchors and metadata is readable without executing raw HTML', () => {
  const result = renderMarkdown('---\nstatus: approved\n---\n# A & B\n\n## Next\n\n## Next\n\n<script>alert(1)</script>\n', path.join(ROOT, 'docs/test.md'));
  assert.deepEqual(result.headings.map(h => h.id), ['a--b', 'next', 'next-1']);
  assert.match(result.html, /<summary>Document metadata<\/summary>/);
  assert.match(result.html, /status: approved/);
  assert.ok(!result.html.includes('<script>alert'));
});

test('catalog derives current skills, native runtime availability and workflow metadata', () => {
  const catalog = buildCatalog();
  const runtime = catalog.skills.find(skill => skill.name === 'sdd-runtime');
  assert.deepEqual(runtime.hosts, ['codex']);
  assert.deepEqual(catalog.skills.find(skill => skill.name === 'sdd').hosts, ['claude', 'codex']);
  assert.equal(catalog.skills.find(skill => skill.name === 'deploy').invoke, 'manual');
  assert.match(catalog.skills.find(skill => skill.name === 'stack-trust').codexDescription, /Codex/);
  assert.doesNotMatch(catalog.skills.find(skill => skill.name === 'write-docs').codexDescription, /\.claude|CLAUDE\.md/);
  assert.equal(catalog.workflows.length, 6);
  assert.ok(catalog.workflows.find(workflow => workflow.name === 'fix-bug').phases.some(phase => phase.title === 'Acceptance'));
  assert.ok(catalog.agents.every(agent => agent.codexModel.includes('Inherited')));
});

test('link validation rejects missing pages and anchors while accepting valid local navigation', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-doc-links-'));
  try {
    fs.mkdirSync(path.join(root, 'docs'));
    fs.writeFileSync(path.join(root, 'docs/one.html'), '<a href="two.html#good">Good</a><a href="two.html#missing">Bad anchor</a><a href="missing.html">Missing</a>');
    fs.writeFileSync(path.join(root, 'docs/two.html'), '<h1 id="good">Good</h1>');
    const errors = checkLinks(root, new Map());
    assert.equal(errors.length, 2);
    assert.ok(errors.some(error => error.includes('missing anchor two.html#missing')));
    assert.ok(errors.some(error => error.includes('missing target missing.html')));
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('example link normalization preserves recorded fixture values and external links', () => {
  const source = '{"chapterHref":"../examples/job-board/02-greenfield-first-slice.md#result","status":"done","date":"2026-10-28","href":"https://example.org/source.md"}';
  const normalized = normalizeExampleLinks(source);
  assert.equal(normalized, '{"chapterHref":"examples/job-board/02-greenfield-first-slice.html#result","status":"done","date":"2026-10-28","href":"https://example.org/source.md"}');
  assert.equal(normalizeExampleLinks(normalized), normalized);
});

test('checked-in pages and catalog exactly match the current Markdown and source metadata', () => {
  const result = buildDocs({ check: true, links: false });
  assert.deepEqual(result.stale, [], 'Run npm run docs:build after updating Markdown or catalog sources');
});
