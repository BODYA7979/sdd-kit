#!/usr/bin/env node
// Launcher for running SDD Kit tools straight from GitHub with npx, without
// cloning the repo or opening an agent host. Each subcommand runs the same
// script a checkout would run; this file only resolves paths and forwards
// arguments, exit codes and signals.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DIST_REPO = 'stasmarkov/sdd-kit';
export const PAGES_URL = 'https://stasmarkov.github.io/sdd-kit/';
export const NPX = `npx github:${DIST_REPO}`;
const SPEC_BOARD_CANDIDATES = [
  path.join(ROOT, 'src', 'skills', 'spec-board', 'scripts', 'spec-board.mjs'),
  path.join(ROOT, 'plugins', 'sdd-kit', 'skills', 'spec-board', 'scripts', 'spec-board.mjs'),
];
const INSTALLER = path.join(ROOT, 'install.sh');

const USAGE = `SDD Kit launcher (${readVersion()})

Usage: ${NPX} <command> [options]

Commands:
  spec-board [dirs...] [--serve | --out [file] | --json]
                 Kanban board of the specs under .ai/specs (default: live
                 server on http://127.0.0.1:4477). Example:
                   ${NPX} spec-board api/.ai/specs web/.ai/specs --serve
  build [--host all|claude|codex] [--node /absolute/path/to/node]
                 Build host packages from the shared sources.
  install [--host claude|codex] [options]
                 Defaults to Claude's existing install.sh (file-copy mode); --project installs
                 into the current directory. Needs bash, git, jq and Node 18+.
                 Flags include --stack=<list|none>, --with=<add-ons> and --prune.
                 Examples:
                   ${NPX} install --project --dry-run
                   ${NPX} install --project --stack=laravel,nextjs
                 Codex native plugin from this checkout (Node 20+, Codex CLI and jq):
                   node cli/sdd-kit.mjs install --host codex
                   node cli/sdd-kit.mjs install --host codex --dry-run
                 Until upstream release, use a revision containing host support.
  guide [board]  Open the interactive guide (or the worked example's spec
                 board) in your browser and print its path. Example:
                   ${NPX} guide
  help           Show this help.

Options:
  --version      Print the kit version.

Pin a release by adding a tag: ${NPX}#v${readVersion()} spec-board
Run "<command> --help" for command details, e.g. spec-board --help.
`;

function readVersion() {
  try {
    return fs.readFileSync(path.join(ROOT, 'VERSION'), 'utf8').trim();
  } catch {
    return 'unknown';
  }
}

function exitCodeFor(code, signal) {
  if (typeof code === 'number') return code;
  const num = signal ? os.constants.signals[signal] : undefined;
  return num ? 128 + num : 1;
}

/**
 * Runs a child process with the caller's terminal and working directory and
 * resolves with its exit code. Ctrl+C reaches the child directly (same process
 * group), so the parent ignores SIGINT and waits for the child to finish its
 * own shutdown; SIGTERM/SIGHUP are forwarded explicitly.
 */
function run(command, args, { onMissing } = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: 'inherit', cwd: process.cwd() });
    const forward = (sig) => () => {
      if (child.exitCode === null && child.signalCode === null) child.kill(sig);
    };
    const handlers = { SIGINT: () => {}, SIGTERM: forward('SIGTERM'), SIGHUP: forward('SIGHUP') };
    for (const [sig, fn] of Object.entries(handlers)) process.on(sig, fn);
    const cleanup = () => {
      for (const [sig, fn] of Object.entries(handlers)) process.off(sig, fn);
    };
    child.on('error', (err) => {
      cleanup();
      if (err && err.code === 'ENOENT' && onMissing) {
        process.stderr.write(`${onMissing}\n`);
      } else {
        process.stderr.write(`error: could not start ${command}: ${err && err.message ? err.message : err}\n`);
      }
      resolve(1);
    });
    child.on('exit', (code, signal) => {
      cleanup();
      resolve(exitCodeFor(code, signal));
    });
  });
}

export function runSpecBoard(args) {
  if (args.includes('-h') || args.includes('--help')) {
    process.stdout.write(`Via npx: ${NPX} spec-board [dirs...] [options]\n\n`);
  }
  const script = SPEC_BOARD_CANDIDATES.find((candidate) => fs.existsSync(candidate));
  if (!script) {
    process.stderr.write(
      `error: spec-board script not found. Looked for:\n  ${SPEC_BOARD_CANDIDATES.join('\n  ')}\n`,
    );
    return Promise.resolve(1);
  }
  return run(process.execPath, [script, ...args]);
}

export function installRoute(args) {
  let host = 'claude';
  const rest = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--host') host = args[++i];
    else if (args[i].startsWith('--host=')) host = args[i].slice(7);
    else rest.push(args[i]);
  }
  if (!['claude', 'codex'].includes(host)) throw new Error('Choose --host claude or codex');
  return host === 'codex'
    ? { command: process.execPath, args: [path.join(ROOT, 'scripts/install-host.mjs'), ...rest] }
    : { command: 'bash', args: [INSTALLER, ...rest] };
}

function runInstall(args) {
  const route = installRoute(args);
  return run(route.command, route.args, {
    onMissing: 'install needs bash (on Windows use Git Bash or WSL); or use the plugin: /plugin install sdd-kit@sdd-kit',
  });
}

function openInBrowser(file) {
  const opener =
    process.platform === 'darwin'
      ? ['open', [file]]
      : process.platform === 'win32'
        ? ['cmd', ['/c', 'start', '', file]]
        : ['xdg-open', [file]];
  try {
    const child = spawn(opener[0], opener[1], { stdio: 'ignore', detached: true });
    child.on('error', () => {});
    child.unref();
  } catch {
    // No opener available (headless machine); the printed path is enough.
  }
}

export function guideLocation(target, root = ROOT) {
  const filename = target === 'board' ? 'example-board.html' : 'index.html';
  const candidates = [path.join(root, 'docs', filename), path.join(root, 'docs', 'guide', filename)];
  return candidates.find(file => fs.existsSync(file)) || (target === 'board' ? `${PAGES_URL}example-board.html` : PAGES_URL);
}

function runGuide(args) {
  const [target, ...rest] = args;
  if (target === '-h' || target === '--help') {
    process.stdout.write(`Usage: ${NPX} guide [board]\nOpens the packaged docs/index.html, or with "board" docs/example-board.html. Uses the published guide only when local documentation is absent.\n`);
    return 0;
  }
  if (rest.length || (target !== undefined && target !== 'board')) {
    process.stderr.write(`Unknown guide target "${args.join(' ')}". Use: ${NPX} guide [board]\n`);
    return 2;
  }
  const file = guideLocation(target);
  process.stdout.write(`${file}\n`);
  openInBrowser(file);
  return 0;
}

export async function main(argv = process.argv.slice(2)) {
  const [command, ...args] = argv;
  switch (command) {
    case undefined:
    case 'help':
    case '-h':
    case '--help':
      process.stdout.write(USAGE);
      return 0;
    case '--version':
    case '-v':
      process.stdout.write(`${readVersion()}\n`);
      return 0;
    case 'spec-board':
      return runSpecBoard(args);
    case 'install':
      return runInstall(args);
    case 'build':
      return run(process.execPath, [path.join(ROOT, 'scripts/build.mjs'), ...args]);
    case 'guide':
      return runGuide(args);
    default:
      process.stderr.write(
        `Unknown command "${command}". Commands: spec-board, build, install, guide, help.\n` +
          `Example: ${NPX} spec-board --serve (run "${NPX} help" for all commands)\n`,
      );
      return 2;
  }
}

function isDirectRun() {
  if (!process.argv[1]) return false;
  try {
    return pathToFileURL(fs.realpathSync(process.argv[1])).href === import.meta.url;
  } catch {
    return false;
  }
}

if (isDirectRun()) {
  main().then(
    (code) => process.exit(code),
    (err) => {
      process.stderr.write(`error: ${err && err.message ? err.message : err}\n`);
      process.exit(1);
    },
  );
}
