import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function load(host = '', { stored = null, blocked = false } = {}) {
  const events = {}, selectEvents = {};
  const select = { value: '', addEventListener: (name, fn) => { selectEvents[name] = fn; } };
  const location = { href: `https://docs.example/index.html${host ? '?host=' + host : ''}#quickstart`, assign(value) { this.href = value; } };
  const document = {
    documentElement: { dataset: {} }, body: { dataset: {} },
    getElementById: id => id === 'host-select' ? select : null,
    addEventListener: (name, fn) => { events[name] = fn; }
  };
  const context = vm.createContext({ URL, document, window: { location }, localStorage: {
    getItem: () => { if (blocked) throw new Error('disabled'); return stored; },
    setItem: (key, value) => { if (blocked) throw new Error('disabled'); stored = value; }
  } });
  for (const file of ['guide-data', 'host-data', 'catalog', 'host']) {
    vm.runInContext(fs.readFileSync(new URL(`../docs/${file}.js`, import.meta.url), 'utf8'), context);
  }
  return { host: context.window.SDDHost, guide: context.window.GUIDE, events, selectEvents, select, location };
}

test('selected host maps real skill commands without changing shell paths, built-ins or workflows', () => {
  const { host } = load('codex');
  assert.equal(host.command('/sdd PROJ-123', 'codex'), '$sdd PROJ-123');
  assert.equal(host.command('/deploy staging', 'claude'), '/sdd-kit-ops:deploy staging');
  for (const code of ['/hooks', '/workflows', '/fix-bug "error"', 'Workflow({name: "ship-feature"})', 'cat /tmp/sdd /home/user/.claude/skills/sdd/SKILL.md', 'node cli/sdd-kit.mjs install --host codex']) {
    assert.equal(host.command(code, 'codex'), code);
  }
  assert.equal(host.prose('Run /sdd, then /progress.'), 'Run $sdd, then $progress.');
});

test('compare mode returns independently copyable host commands and correct addon namespaces', () => {
  const { host } = load('compare');
  assert.deepEqual(Array.from(host.variants('/design-ui profile'), item => item.code), ['/sdd-kit-design:design-ui profile', '$design-ui profile']);
  assert.equal(host.variants('npm ci --ignore-scripts').length, 1);
});

test('explicit URL wins; invalid preference and unavailable storage fall back safely', () => {
  assert.equal(load('codex', { stored: 'claude' }).host.choice, 'codex');
  assert.equal(load('', { stored: 'claude' }).host.choice, 'claude');
  assert.equal(load('invalid', { stored: 'invalid' }).host.choice, 'compare');
  const loaded = load('codex', { blocked: true });
  loaded.select.value = 'claude';
  loaded.selectEvents.change();
  assert.equal(loaded.location.href, 'https://docs.example/index.html?host=claude#quickstart');
});

test('local page links preserve host without overwriting a deliberate host destination', () => {
  const { events } = load('codex', { blocked: true });
  function link(href) {
    const anchor = { href, getAttribute: () => href, hasAttribute: () => false };
    events.click({ target: { closest: () => anchor } });
    return anchor.href;
  }
  assert.equal(link('reference/installation.html#choose'), 'https://docs.example/reference/installation.html?host=codex#choose');
  assert.equal(link('hosts/claude.html?host=claude'), 'https://docs.example/hosts/claude.html?host=claude');
  assert.equal(link('reference/installation.md'), 'reference/installation.md');
  assert.equal(link('#install'), '#install');
});

test('Codex and Claude installation paths cannot silently substitute each other', () => {
  const codex = load('codex').guide;
  const commands = codex.install.plugin.steps.map(step => step.code).join('\n');
  assert.match(commands, /install --host codex --dry-run/);
  assert.doesNotMatch(commands, /--project|--stack|\/plugin install/);
  assert.equal(codex.install.fileCopy, undefined);
  assert.ok(codex.workflowsDirect.examples.every(example => !example.code.includes('Workflow(')));
  const claude = load('claude').guide;
  assert.ok(claude.install.fileCopy);
  assert.match(claude.install.plugin.steps[0].code, /^\/plugin marketplace/);
  assert.ok(load('compare').guide.install.codex);
});
