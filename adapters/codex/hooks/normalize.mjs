import path from 'node:path';

/** Convert a Codex patch into the per-file Write/Edit input consumed by SDD hooks. */
export function normalize(event) {
  if (event.tool_name !== 'apply_patch') return [event];
  const patch = event.tool_input?.command;
  if (typeof patch !== 'string' || !patch.startsWith('*** Begin Patch\n') || !patch.trimEnd().endsWith('*** End Patch')) throw new Error('Invalid apply_patch hook input');
  const files = []; let file = null;
  for (const line of patch.split('\n')) {
    const header = line.match(/^\*\*\* (Add|Update|Delete) File: (.+)$/);
    if (header) {
      file = { action: header[1], name: header[2], added: [] }; files.push(file); continue;
    }
    if (line.startsWith('*** Move to: ')) {
      if (!file || file.action !== 'Update') throw new Error('Invalid patch move');
      file.name = line.slice(13); continue;
    }
    if (file && line.startsWith('+')) file.added.push(line.slice(1));
  }
  if (!files.length) throw new Error('Patch contains no files');
  return files.filter(f => f.action !== 'Delete').map(f => ({ ...event, tool_name: f.action === 'Add' ? 'Write' : 'Edit',
    tool_input: { file_path: path.resolve(event.cwd || process.cwd(), f.name),
      ...(f.action === 'Add' ? { content: f.added.join('\n') } : { new_string: f.added.join('\n') }) } }));
}
