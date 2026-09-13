import type { APIRoute } from 'astro';
import { authorisedOrder, json } from '../../../lib/safework/orders.mjs';
import { generatePack } from '../../../lib/safework/generate';
import { packAsA4Html, type WorkPack } from '../../../lib/safework/render';
import { EMPTY_COMPANY_PROFILE } from '../../../lib/safework/company-profile';
export const prerender = false;
export const POST: APIRoute = async ({request,locals}) => {
 const env=locals.runtime.env; const db=env.FULFILMENT_DB;
 const order=await authorisedOrder(request,db);
 if(!order) return json({error:'Order not found.'},404);
 if(order.status==='ready') return json({ready:true});
 if(order.status==='unpaid') return json({error:'Payment must be confirmed first.'},402);
 if(!env.OPENAI_API_KEY) return json({error:'Generation is temporarily unavailable. Your payment is saved; please retry later.'},503);
 const lease=crypto.randomUUID();
 const claim=await db.prepare("UPDATE safework_orders SET lease_id=?,lease_until=?,attempts=attempts+1 WHERE id=? AND status='paid' AND lease_until < ? AND attempts < 3").bind(lease,Date.now()+240000,order.id,Date.now()).run();
 if(!claim.meta.changes) return json({error:'A generation is already running or this order needs support. Do not pay again.'},409);
 try {
  const input=JSON.parse(order.input_json);
  const workerCount=Number.isSafeInteger(input.workerCount)&&input.workerCount>=1&&input.workerCount<=50?input.workerCount:1;
  const payload={description:`${input.description}\nConfirmed workforce: ${workerCount} ${workerCount === 1 ? 'worker' : 'workers'}.${input.emergency ? `\nConfirmed emergency information: ${input.emergency}` : ''}`,address:input.address};
  const response=await generatePack(new Request('https://internal.invalid/generate',{method:'POST',body:JSON.stringify(payload)}),env.OPENAI_API_KEY,env.SAFEWORK_MODEL || 'gpt-5.4');
  if(!response.ok) throw new Error('Generation failed');
  const data=await response.json() as {workPack: WorkPack};
  const document=packAsA4Html(data.workPack,{...EMPTY_COMPANY_PROFILE,name:input.company,address:input.companyAddress,phone:input.contact},{siteContact:input.emergency,sitePhone:'',firstAider:'',firstAiderPhone:'',hospitals:[]},workerCount);
  await db.prepare("UPDATE safework_orders SET document_html=?,status='ready',lease_until=0 WHERE id=? AND lease_id=?").bind(document,order.id,lease).run();
  return json({ready:true});
 } catch {
  await db.prepare('UPDATE safework_orders SET lease_until=0 WHERE id=? AND lease_id=?').bind(order.id,lease).run();
  return json({error:'The pack could not be completed. Your payment is saved. Retry this order without paying again, or contact support.'},502);
 }
};
