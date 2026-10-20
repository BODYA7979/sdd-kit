#!/usr/bin/env node
// Direct entry for the spec board, so `npx -p <kit> spec-board` and
// `npm exec --package=. -- spec-board` work without the sdd-kit subcommand.
import { runSpecBoard } from './sdd-kit.mjs';

runSpecBoard(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (err) => {
    process.stderr.write(`error: ${err && err.message ? err.message : err}\n`);
    process.exit(1);
  },
);
