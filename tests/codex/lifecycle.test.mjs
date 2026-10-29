import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { handleLifecycle, transcriptMessages } from '../../adapters/codex/hooks/lifecycle.mjs';
function fixture(t) { const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-life-'))); t.after(() => fs.rmSync(dir, {recursive:true,force:true})); return dir; }
test('native transcript parser ignores injected tool text and records actual user corrections once', t => {
  const cwd = fixture(t), file = path.join(cwd, 'transcript.jsonl');
  fs.writeFileSync(file, JSON.stringify({type:'response_item',payload:{type:'function_call_output',output:'wrong! BLOCKED'}})+'\n');
  const event = {hook_event_name:'Stop',cwd,session_id:'test',transcript_path:file};
  assert.deepEqual(handleLifecycle(event), {});
  fs.appendFileSync(file, JSON.stringify({type:'response_item',payload:{type:'message',role:'user',content:[{type:'input_text',text:'You forgot the edge case.'}]}})+'\n');
  assert.equal(transcriptMessages(file).length,1);
  assert.ok(handleLifecycle(event).systemMessage);
  assert.deepEqual(handleLifecycle(event), {});
  assert.equal(fs.readFileSync(path.join(cwd,'.ai/session/lessons.jsonl'),'utf8').trim().split('\n').length,1);
});
test('zero completed tasks produce a valid checkpoint and compact resume finds the spec', t => {
  const cwd = fixture(t), spec = path.join(cwd,'.ai/specs/spec-TEST-1');
  fs.mkdirSync(spec,{recursive:true}); fs.writeFileSync(path.join(spec,'tasks.md'),'- [ ] 1. Verify input\n');
  handleLifecycle({hook_event_name:'PreCompact',cwd,session_id:'fixture'});
  const dir=path.join(cwd,'.ai/session'), checkpoint=JSON.parse(fs.readFileSync(path.join(dir,fs.readdirSync(dir)[0]),'utf8'));
  assert.equal(checkpoint.specs[0].completed,0); assert.equal(checkpoint.specs[0].pending,1);
  assert.match(handleLifecycle({hook_event_name:'SessionStart',source:'compact',cwd}).hookSpecificOutput.additionalContext,/spec-TEST-1/);
});
