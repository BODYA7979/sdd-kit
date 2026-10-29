// Shared host preference. The query parameter makes examples shareable and also
// preserves the choice when browser storage is unavailable.
(function () {
  'use strict';
  var KEY = 'sdd-guide-host';
  var labels = { compare: 'Compare both', claude: 'Claude Code', codex: 'Codex' };
  var url = new URL(window.location.href);
  var selected = url.searchParams.get('host');
  if (!Object.prototype.hasOwnProperty.call(labels, selected)) {
    try { selected = localStorage.getItem(KEY); } catch (e) { selected = null; }
  }
  if (!Object.prototype.hasOwnProperty.call(labels, selected)) selected = 'compare';
  document.documentElement.dataset.host = selected;

  function skill(name) {
    return (window.CATALOG && window.CATALOG.skills || []).filter(function (s) { return s.name === name; })[0];
  }
  function pluginFor(s) {
    return s.plugin || (s.ships === 'core' ? 'sdd-kit' : 'sdd-kit-' + s.ships.replace(/ plugin$/, ''));
  }
  function command(code, host) {
    // Only registered skill invocations are mapped. Paths, shell commands,
    // built-in commands and Workflow(...) examples are never rewritten.
    return String(code).replace(/(^|[\s·])\/([a-z][a-z0-9-]*)(?=\s|$)/g, function (all, before, name) {
      var s = skill(name);
      if (!s) return all;
      return before + (host === 'codex' ? '$' + name : '/' + pluginFor(s) + ':' + name);
    });
  }
  function prose(text) {
    if (selected === 'compare') return text;
    return String(text).replace(/(^|[\s(])\/([a-z][a-z0-9-]*)(?=[\s.,;)!?]|$)/g, function (all, before, name) {
      return skill(name) ? before + command('/' + name, selected) : all;
    });
  }
  function variants(code) {
    var claude = command(code, 'claude'), codex = command(code, 'codex');
    if (claude === codex) return [{ label: '', code: code }];
    if (selected === 'compare') return [{ label: 'Claude Code · plugin', code: claude }, { label: 'Codex', code: codex }];
    return [{ label: selected === 'claude' ? 'Claude Code · plugin' : 'Codex', code: selected === 'claude' ? claude : codex }];
  }
  window.SDDHost = { choice: selected, label: labels[selected], command: command, variants: variants, prose: prose };
  if (window.GUIDE && window.GUIDE_HOSTS) {
    var profile = window.GUIDE_HOSTS[selected];
    Object.keys(profile).forEach(function (key) { window.GUIDE[key] = profile[key]; });
  }
  var select = document.getElementById('host-select');
  if (select) {
    select.value = selected;
    select.addEventListener('change', function () {
      if (!Object.prototype.hasOwnProperty.call(labels, select.value)) return;
      try { localStorage.setItem(KEY, select.value); } catch (e) { /* URL remains authoritative. */ }
      var next = new URL(window.location.href);
      next.searchParams.set('host', select.value);
      window.location.assign(next.href);
    });
  }
  // Propagate explicit choice even when storage is blocked. Keep source downloads,
  // external URLs and fragment-only navigation intact.
  document.addEventListener('click', function (event) {
    var a = event.target.closest && event.target.closest('a[href]');
    if (!a || a.hasAttribute('download')) return;
    var href = a.getAttribute('href');
    if (!href || href.charAt(0) === '#' || /^(?:[a-z]+:|\/\/)/i.test(href)) return;
    var target = new URL(href, window.location.href);
    if (!/\.html$/.test(target.pathname)) return;
    // A deliberate host link wins over the current preference.
    if (!target.searchParams.has('host')) target.searchParams.set('host', selected);
    a.href = target.href;
  });
  var note = document.getElementById('host-context');
  if (note) {
    var pageHost = document.body.dataset.docHost;
    note.textContent = pageHost && labels[pageHost]
      ? 'This page documents ' + labels[pageHost] + '. The selector sets your guide preference; this host-specific page keeps its own instructions.'
      : 'Shared documentation for Claude Code and Codex. Host-specific commands and paths are labeled; reference pages keep both variants visible.';
  }
})();
