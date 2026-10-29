import fs from 'node:fs';
import path from 'node:path';

/** Claude continues to consume the existing, authoritative plugin packages. */
export function buildClaude({ root, out }) {
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  for (const name of ['.claude-plugin', 'plugins', 'share']) fs.cpSync(path.join(root, name), path.join(out, name), { recursive: true });
  for (const name of ['LICENSE', 'VERSION']) fs.copyFileSync(path.join(root, name), path.join(out, name));
  return { host: 'claude', path: out };
}
