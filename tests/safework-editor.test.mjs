import test from 'node:test';
import assert from 'node:assert/strict';
import { editorKey, normalisePackEdits } from '../src/lib/safework/editor.mjs';

test('normalises tablet editor fields and drops blank entries',()=>{
 assert.deepEqual(normalisePackEdits({'field-1':'  Mark Fox  ','field-2':'   '}),{'field-1':'Mark Fox'});
 assert.equal(editorKey('order-1'),'safework-editor:order-1');
});

test('rejects malformed tablet editor fields',()=>{
 assert.throws(()=>normalisePackEdits({'wrong':'text'}),/invalid/);
 assert.throws(()=>normalisePackEdits({'field-1':42}),/invalid/);
});
