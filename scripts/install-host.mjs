#!/usr/bin/env node
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { build, ROOT } from './build.mjs';

export function installPlan(argv) {
  let host = 'codex', dryRun = false, nodeBinary = null;
  for (let i = 0; i < argv.length; i++) {
    const split = argv[i].indexOf('=');
    const flag = split < 0 ? argv[i] : argv[i].slice(0, split);
    const inline = split < 0 ? undefined : argv[i].slice(split + 1);
    if (flag === '--dry-run') dryRun = true;
    else if (flag === '--host') host = inline ?? argv[++i];
    else if (flag === '--node') nodeBinary = inline ?? argv[++i];
    else throw new Error(`Unsupported ${host} installation option: ${flag}. Codex uses native plugin installation; Claude file-copy flags are unchanged under --host claude.`);
  }
  if (host !== 'codex') throw new Error('This installer handles native Codex plugins; the common CLI routes Claude to install.sh');
  if (argv.some(arg => arg === '--node' || arg.startsWith('--node=')) && !nodeBinary) throw new Error('Missing value for --node');
  return { host, dryRun, nodeBinary, commands: [
    ['codex', 'plugin', 'marketplace', 'add', path.join(ROOT, 'dist/codex')],
    ['codex', 'plugin', 'add', 'sdd-kit@sdd-kit'],
  ] };
}

export function install(argv) {
  const plan = installPlan(argv);
  if (plan.dryRun) { console.log(JSON.stringify(plan, null, 2)); return 0; }
  if (!plan.nodeBinary && Number(process.versions.node.split('.')[0]) < 20) throw new Error('Codex installation requires Node 20+. Select it with --node /absolute/path/to/node.');
  build({ host: 'codex', nodeBinary: plan.nodeBinary });
  for (const [command, ...args] of plan.commands) {
    const result = spawnSync(command, args, { stdio: 'inherit' });
    if (result.error) throw result.error;
    if (result.status !== 0) return result.status ?? 1;
  }
  console.log('SDD Kit installed for Codex. Start a fresh session and review the exact hook definitions with /hooks.');
  return 0;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.exitCode = install(process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
