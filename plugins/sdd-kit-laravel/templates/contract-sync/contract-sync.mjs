#!/usr/bin/env node
/**
 * contract-sync — compares the Laravel API's routes with what the Next.js side
 * expects (a BFF endpoint registry or an OpenAPI document) and reports:
 *
 *   missing-in-backend   the frontend calls METHOD path, the API has no such route   (error)
 *   method-mismatch      the path exists on both sides with different methods          (error)
 *   unused-by-frontend   the API exposes a route the frontend never references        (warning)
 *
 * Exit codes: 0 = in sync, 1 = errors (or warnings with --strict), 2 = bad input.
 * Node 18+, no dependencies.
 *
 * Usage:
 *   node contract-sync.mjs                          # uses CONFIG below
 *   node contract-sync.mjs --routes-file routes.json --registry ../web/src/lib/api/endpoints.ts
 *   node contract-sync.mjs --format openapi --registry openapi.json --json
 */

import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const out = (text) => process.stdout.write(`${text}\n`);

// ---------------------------------------------------------------------------
// Configuration — edit for your project. Every key can be overridden by the
// matching CONTRACT_SYNC_* environment variable or CLI flag.
// ---------------------------------------------------------------------------
const CONFIG = {
  // Laravel side: either a command that prints `route:list --json`, or a file
  // holding its output (preferred in CI, where the PHP app may not boot).
  routesCommand: 'php artisan route:list --json',   // e.g. 'ddev php artisan route:list --json'
  routesCwd: '.',                                   // backend repo root for routesCommand
  routesFile: '',                                   // if set, read instead of running routesCommand

  // Frontend side.
  registry: '../frontend/src/lib/api/endpoints.ts', // path to the registry or OpenAPI file
  format: 'auto',                                   // auto | registry-ts | registry-json | openapi

  // Normalization.
  backendPrefix: 'api',     // stripped from Laravel URIs ("api/invoices" -> "/invoices")
  frontendPrefix: '/api',   // stripped from registry/OpenAPI paths when present
  ignore: [                 // regexes matched against the normalized path
    '^/sanctum/',
    '^/_ignition',
    '^/telescope',
    '^/horizon',
    '^/up$',
    '^/broadcasting/',
  ],
  onlyBackendUris: '^api/', // only compare Laravel routes whose raw URI matches (empty = all)

  strict: false,            // treat unused-by-frontend as an error
};

// ---------------------------------------------------------------------------

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];

function parseArgs(argv) {
  const opts = { ...CONFIG, json: false };
  const env = process.env;
  if (env.CONTRACT_SYNC_ROUTES_COMMAND) opts.routesCommand = env.CONTRACT_SYNC_ROUTES_COMMAND;
  if (env.CONTRACT_SYNC_ROUTES_CWD) opts.routesCwd = env.CONTRACT_SYNC_ROUTES_CWD;
  if (env.CONTRACT_SYNC_ROUTES_FILE) opts.routesFile = env.CONTRACT_SYNC_ROUTES_FILE;
  if (env.CONTRACT_SYNC_REGISTRY) opts.registry = env.CONTRACT_SYNC_REGISTRY;
  if (env.CONTRACT_SYNC_FORMAT) opts.format = env.CONTRACT_SYNC_FORMAT;
  if (env.CONTRACT_SYNC_STRICT) opts.strict = env.CONTRACT_SYNC_STRICT === '1' || env.CONTRACT_SYNC_STRICT === 'true';

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => {
      const value = argv[++i];
      if (value === undefined) fail(`${arg} needs a value`);
      return value;
    };
    switch (arg) {
      case '--routes-command': opts.routesCommand = next(); break;
      case '--routes-cwd': opts.routesCwd = next(); break;
      case '--routes-file': opts.routesFile = next(); break;
      case '--registry': opts.registry = next(); break;
      case '--format': opts.format = next(); break;
      case '--backend-prefix': opts.backendPrefix = next(); break;
      case '--frontend-prefix': opts.frontendPrefix = next(); break;
      case '--strict': opts.strict = true; break;
      case '--json': opts.json = true; break;
      case '-h':
      case '--help':
        out(readFileSync(new URL(import.meta.url)).toString().split('\n').slice(2, 16).join('\n').replace(/^ \* ?/gm, ''));
        process.exit(0);
      default: fail(`unknown argument: ${arg} (see --help)`);
    }
  }
  return opts;
}

function fail(message) {
  console.error(`contract-sync: ${message}`);
  process.exit(2);
}

/** Collapses route parameters of every flavor to "{}" so both sides compare by shape. */
function normalizePath(raw, prefix) {
  let path = String(raw).trim().split('?')[0];
  path = path.replace(/^https?:\/\/[^/]+/, '');
  if (!path.startsWith('/')) path = `/${path}`;

  const cleanPrefix = prefix ? `/${prefix.replace(/^\/+|\/+$/g, '')}` : '';
  if (cleanPrefix && (path === cleanPrefix || path.startsWith(`${cleanPrefix}/`))) {
    path = path.slice(cleanPrefix.length) || '/';
  }

  path = path
    .replace(/\{[^}]+\}/g, '{}')        // Laravel / OpenAPI: {invoice}, {id?}
    .replace(/\$\{[^}]+\}/g, '{}')      // template literals: ${id}
    .replace(/\[{1,2}\.{0,3}[^\]]+\]{1,2}/g, '{}') // Next.js: [id], [...slug], [[...slug]]
    .replace(/:[A-Za-z_][A-Za-z0-9_]*/g, '{}');     // Express-style: :id

  path = path.replace(/\/+$/, '') || '/';
  return path.toLowerCase();
}

function loadBackendRoutes(opts) {
  let text;
  if (opts.routesFile) {
    if (!existsSync(opts.routesFile)) fail(`routes file not found: ${opts.routesFile}. Generate it with: php artisan route:list --json > ${opts.routesFile}`);
    text = readFileSync(opts.routesFile, 'utf8');
  } else {
    try {
      text = execSync(opts.routesCommand, { cwd: resolve(opts.routesCwd), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (error) {
      fail(`"${opts.routesCommand}" failed in ${opts.routesCwd}: ${(error.stderr || error.message).toString().trim().split('\n')[0]}. Set routesFile to a saved route:list --json output instead.`);
    }
  }

  let routes;
  try {
    routes = JSON.parse(text.slice(text.indexOf('[')));
  } catch {
    fail('could not parse route:list output as JSON — is it `php artisan route:list --json`?');
  }

  const onlyRe = opts.onlyBackendUris ? new RegExp(opts.onlyBackendUris) : null;
  const entries = [];
  for (const route of routes) {
    const uri = route.uri ?? '';
    if (onlyRe && !onlyRe.test(uri)) continue;
    const methods = String(route.method ?? '').split('|').map((m) => m.toUpperCase()).filter((m) => m && m !== 'HEAD');
    for (const method of methods) {
      entries.push({ method, path: normalizePath(uri, opts.backendPrefix), source: route.action || route.name || uri });
    }
  }
  return entries;
}

function detectFormat(file, text) {
  if (/\.(m?[jt]sx?)$/.test(file)) return 'registry-ts';
  try {
    const doc = JSON.parse(text);
    return doc && typeof doc === 'object' && (doc.openapi || doc.swagger) ? 'openapi' : 'registry-json';
  } catch {
    fail(`cannot detect the format of ${file}; pass --format registry-ts | registry-json | openapi (OpenAPI must be JSON — convert YAML first, e.g. npx yaml-to-json or yq -o=json)`);
  }
}

function loadFrontendEndpoints(opts) {
  const file = opts.registry;
  if (!existsSync(file)) fail(`registry not found: ${file}. Set CONFIG.registry or pass --registry <path>.`);
  const text = readFileSync(file, 'utf8');
  const format = opts.format === 'auto' ? detectFormat(file, text) : opts.format;
  const entries = [];
  const add = (method, path, source) => {
    const m = String(method).toUpperCase();
    if (HTTP_METHODS.includes(m) && path) entries.push({ method: m, path: normalizePath(path, opts.frontendPrefix), source });
  };

  if (format === 'openapi') {
    const doc = JSON.parse(text);
    for (const [path, item] of Object.entries(doc.paths ?? {})) {
      for (const method of Object.keys(item)) add(method, path, item[method]?.operationId || `${method.toUpperCase()} ${path}`);
    }
  } else if (format === 'registry-json') {
    // Accepts [{ method, path }] or { name: { method, path } }.
    const doc = JSON.parse(text);
    const list = Array.isArray(doc) ? doc.map((e) => [e.name ?? '', e]) : Object.entries(doc);
    for (const [name, entry] of list) add(entry.method ?? 'GET', entry.path ?? entry.url, name || entry.path);
  } else if (format === 'registry-ts') {
    // Matches object literals that carry both a method and a path/url, in either order:
    //   listInvoices: { method: 'GET', path: '/api/invoices' }
    //   { url: `/api/invoices/${id}`, method: "PATCH" }
    const objectRe = /\{(?:[^{}'"`]|'[^']*'|"[^"]*"|`[^`]*`)*\}/g;
    const methodRe = /\bmethod\s*:\s*['"`]([A-Za-z]+)['"`]/;
    const pathRe = /\b(?:path|url|endpoint)\s*:\s*(['"`])([^'"`]+)\1/;
    let match;
    while ((match = objectRe.exec(text)) !== null) {
      const body = match[0];
      const method = body.match(methodRe);
      const path = body.match(pathRe);
      if (method && path) {
        const line = text.slice(0, match.index).split('\n').length;
        add(method[1], path[2], `${file}:${line}`);
      }
    }
  } else {
    fail(`unknown format "${format}" (expected registry-ts | registry-json | openapi)`);
  }

  if (entries.length === 0) fail(`no endpoints found in ${file} as ${format}. Check the format or the registry shape described in the README.`);
  return entries;
}

function indexByPath(entries, ignoreRes) {
  const map = new Map();
  for (const entry of entries) {
    if (ignoreRes.some((re) => re.test(entry.path))) continue;
    if (!map.has(entry.path)) map.set(entry.path, new Map());
    map.get(entry.path).set(entry.method, entry.source);
  }
  return map;
}

function compare(backend, frontend) {
  const findings = [];
  const mismatched = new Set();
  for (const [path, feMethods] of frontend) {
    const beMethods = backend.get(path);
    if (!beMethods) {
      for (const [method, source] of feMethods) findings.push({ level: 'error', kind: 'missing-in-backend', method, path, frontend: source });
      continue;
    }
    const missing = [...feMethods.keys()].filter((m) => !beMethods.has(m));
    if (missing.length > 0) {
      mismatched.add(path);
      findings.push({
        level: 'error',
        kind: 'method-mismatch',
        path,
        frontendMethods: [...feMethods.keys()].sort(),
        backendMethods: [...beMethods.keys()].sort(),
        frontend: missing.map((m) => feMethods.get(m)).join(', '),
      });
    }
  }
  for (const [path, beMethods] of backend) {
    const feMethods = frontend.get(path);
    // A path already reported as a method mismatch needs no second, overlapping warning.
    if (mismatched.has(path)) continue;
    for (const [method, source] of beMethods) {
      if (!feMethods?.has(method)) findings.push({ level: 'warning', kind: 'unused-by-frontend', method, path, backend: source });
    }
  }
  return findings;
}

function report(findings, opts, counts) {
  const errors = findings.filter((f) => f.level === 'error');
  const warnings = findings.filter((f) => f.level === 'warning');
  const failed = errors.length > 0 || (opts.strict && warnings.length > 0);

  if (opts.json) {
    out(JSON.stringify({ ok: !failed, counts, errors, warnings }, null, 2));
    return failed;
  }

  out(`contract-sync: ${counts.backend} backend routes, ${counts.frontend} frontend endpoints compared`);
  const section = (title, items, render) => {
    if (items.length === 0) return;
    out(`\n${title} (${items.length})`);
    for (const item of items) out(`  ${render(item)}`);
  };
  section('Missing in backend — frontend calls a route the API does not have', errors.filter((f) => f.kind === 'missing-in-backend'),
    (f) => `${f.method.padEnd(6)} ${f.path}   <- ${f.frontend}`);
  section('Method mismatch — same path, different methods', errors.filter((f) => f.kind === 'method-mismatch'),
    (f) => `${f.path}   frontend: ${f.frontendMethods.join(',')}   backend: ${f.backendMethods.join(',')}   <- ${f.frontend}`);
  section(`Unused by frontend${opts.strict ? '' : ' (warning)'} — API route with no registry entry`, warnings,
    (f) => `${f.method.padEnd(6)} ${f.path}   -> ${f.backend}`);

  if (!failed) out('\nIn sync.');
  else out('\nFix: add the missing Laravel route (or remove the stale registry entry), align methods, then re-run. Paths compare after prefix stripping and parameter normalization ({id}, [id], :id, ${id} -> {}).');
  return failed;
}

const opts = parseArgs(process.argv.slice(2));
const ignoreRes = (opts.ignore ?? []).map((pattern) => new RegExp(pattern));
const backendEntries = loadBackendRoutes(opts);
const frontendEntries = loadFrontendEndpoints(opts);
const backend = indexByPath(backendEntries, ignoreRes);
const frontend = indexByPath(frontendEntries, ignoreRes);
const failed = report(compare(backend, frontend), opts, { backend: backendEntries.length, frontend: frontendEntries.length });
process.exit(failed ? 1 : 0);
