import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { NativeStacks } from './stacks.mjs';

export async function main(argv = process.argv.slice(2)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../source');
  const stacks = new NativeStacks(root);
  const json = argv.includes('--json');
  const [command, arg, expectedHash] = argv.filter(v => v !== '--json');
  const list = await stacks.list(process.cwd());
  if (command === '--list' || command === '--list-untrusted') {
    const rows = list.entries.filter(e => command === '--list' || !e.trusted);
    if (list.errors.length) process.stderr.write(list.errors.join('\n') + '\n');
    console.log(json ? JSON.stringify(rows, null, 2) : rows.map(e => `${e.trusted ? 'trusted' : e.rejected ? 'rejected' : 'untrusted'}\t${e.source}\t${e.sha256}`).join('\n'));
  } else if (command === '--show') {
    const entry = list.entries.find(e => e.source === arg);
    if (!entry) throw new Error('Manifest not found');
    console.log(JSON.stringify(entry, null, 2));
  } else if (command === '--approve') {
    if (!expectedHash) throw new Error('Pass the exact SHA-256 shown and approved by the user');
    console.log(JSON.stringify(await stacks.approve({ workspace: process.cwd(), source: arg, sha256: expectedHash })));
  } else if (command === '--hash') {
    console.log((await stacks.helpers()).manifestHash(JSON.parse(fs.readFileSync(arg, 'utf8'))));
  } else if (command === 'check') {
    const file = fs.realpathSync(arg), entry = list.entries.find(e => fs.realpathSync(e.file) === file);
    console.log(entry?.trusted ? 'trusted' : 'untrusted'); process.exitCode = entry?.trusted ? 0 : 1;
  } else if (command === '--read-rules') {
    console.log('Read access is governed by native Codex permissions; no Claude allow rules are required.');
  } else throw new Error('Use --list, --list-untrusted, --show SOURCE, --approve SOURCE SHA256, --hash FILE, or check FILE');
}
