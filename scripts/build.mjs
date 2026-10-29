#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildClaude } from '../adapters/claude/build.mjs';
import { buildCodex } from '../adapters/codex/build.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export function build({ host = 'all', nodeBinary = null } = {}) {
  if (!['all', 'claude', 'codex'].includes(host)) throw new Error('Choose --host claude, codex, or all');
  if (nodeBinary) {
    if (!path.isAbsolute(nodeBinary)) throw new Error('--node requires an absolute executable path');
    const result = spawnSync(nodeBinary, ['--version'], { encoding: 'utf8' });
    const version = result.stdout?.trim().match(/^v(\d+)\.\d+\.\d+(?:-[\w.-]+)?$/);
    if (result.status !== 0 || !version || Number(version[1]) < 20) throw new Error('--node must select Node 20 or newer');
  }
  for (const rel of ['dist', 'dist/claude', 'dist/codex', 'dist/codex/plugins']) {
    const dir = path.join(ROOT, rel);
    if (fs.existsSync(dir) && (fs.lstatSync(dir).isSymbolicLink() || !fs.statSync(dir).isDirectory())) throw new Error(`Unsafe build directory: ${rel}`);
  }
  const results = [];
  if (host !== 'codex') results.push(buildClaude({ root: ROOT, out: path.join(ROOT, 'dist/claude') }));
  if (host !== 'claude') results.push(buildCodex({ root: ROOT, out: path.join(ROOT, 'dist/codex/plugins/sdd-kit'), nodeBinary }));
  return results;
}

export function parseBuildArgs(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i++) {
    const split = argv[i].indexOf('=');
    const flag = split < 0 ? argv[i] : argv[i].slice(0, split);
    const inline = split < 0 ? undefined : argv[i].slice(split + 1);
    if (!['--host', '--node'].includes(flag)) throw new Error(`Unknown build option: ${flag}`);
    const value = inline ?? argv[++i];
    if (!value) throw new Error(`Missing value for ${flag}`);
    options[flag === '--host' ? 'host' : 'nodeBinary'] = value;
  }
  return options;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { for (const result of build(parseBuildArgs(process.argv.slice(2)))) console.log(`${result.host}: ${result.path}`); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
