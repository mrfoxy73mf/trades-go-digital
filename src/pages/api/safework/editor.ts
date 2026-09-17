import type { APIRoute } from 'astro';
import { authorisedOrder, json } from '../../../lib/safework/orders.mjs';
import { editorKey, normalisePackEdits } from '../../../lib/safework/editor.mjs';
export const prerender = false;

export const GET: APIRoute = async ({request,locals}) => {
 const order=await authorisedOrder(request,locals.runtime.env.FULFILMENT_DB);
 if(!order || order.status!=='ready') return json({error:'The paid work pack is not available.'},404);
 const stored=await locals.runtime.env.FULFILMENT_FILES.get(editorKey(order.id),'json').catch(()=>null);
 return json({edits:stored?.edits&&typeof stored.edits==='object'?stored.edits:{},savedAt:Number(stored?.savedAt)||null});
};

export const PUT: APIRoute = async ({request,locals}) => {
 const order=await authorisedOrder(request,locals.runtime.env.FULFILMENT_DB);
 if(!order || order.status!=='ready') return json({error:'The paid work pack is not available.'},404);
 try {
  const body=await request.json();
  const edits=normalisePackEdits(body?.edits);
  const savedAt=Date.now();
  await locals.runtime.env.FULFILMENT_FILES.put(editorKey(order.id),JSON.stringify({edits,savedAt}));
  return json({saved:true,savedAt});
 } catch(error) {
  return json({error:error instanceof Error?error.message:'The pack could not be saved.'},400);
 }
};
