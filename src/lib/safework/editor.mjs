const FIELD_ID = /^field-[1-9][0-9]{0,3}$/;

export function normalisePackEdits(value) {
 if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('The saved pack details are invalid.');
 const entries = Object.entries(value);
 if (entries.length > 1200) throw new Error('This pack contains too many edited fields.');
 const edits = {};
 let total = 0;
 for (const [id, raw] of entries) {
  if (!FIELD_ID.test(id) || typeof raw !== 'string') throw new Error('The saved pack details are invalid.');
  const text = raw.replace(/\r\n?/g, '\n').trim().slice(0, 1200);
  total += text.length;
  if (total > 150000) throw new Error('This pack contains too much entered text.');
  if (text) edits[id] = text;
 }
 return edits;
}

export function editorKey(orderId) {
 return `safework-editor:${orderId}`;
}
