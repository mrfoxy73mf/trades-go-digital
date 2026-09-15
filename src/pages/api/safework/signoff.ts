import type { APIRoute } from 'astro';
import { authorisedOrder, json } from '../../../lib/safework/orders.mjs';
export const prerender = false;

const clean = (value: unknown, max = 150) => typeof value === 'string' ? value.trim().slice(0, max) : '';

export const GET: APIRoute = async ({request,locals}) => {
 const order=await authorisedOrder(request,locals.runtime.env.FULFILMENT_DB);
 if(!order || order.status!=='ready') return json({error:'The paid work pack is not available.'},404);
 const input=JSON.parse(order.input_json);
 return json({workerCount:input.workerCount||1,signed:Boolean(order.approval_json),approval:order.approval_json?JSON.parse(order.approval_json):null});
};

export const POST: APIRoute = async ({request,locals}) => {
 const db=locals.runtime.env.FULFILMENT_DB;
 const order=await authorisedOrder(request,db);
 if(!order || order.status!=='ready') return json({error:'The paid work pack is not available.'},404);
 if(order.approval_json) return json({error:'This pack already has a locked digital sign-off.'},409);
 const input=JSON.parse(order.input_json); const workerCount=Math.min(50,Math.max(1,Number(input.workerCount)||1));
 const body=await request.json().catch(()=>null) as any;
 const supervisorName=clean(body?.supervisorName); const supervisorRole=clean(body?.supervisorRole);
 const workers=Array.isArray(body?.workers)?body.workers.map((name:unknown)=>clean(name)).filter(Boolean):[];
 if(!supervisorName || !supervisorRole || body?.approved!==true) return json({error:'Enter the approving supervisor’s name and role, then confirm the declaration.'},400);
 if(workers.length!==workerCount || body?.workersConfirmed!==true) return json({error:`Enter all ${workerCount} worker names and confirm their acknowledgement.`},400);
 const signedAt=Date.now();
 const approval={supervisorName,supervisorRole,workers,signedAt,declaration:'Reviewed, amended where necessary, approved and briefed to the named workforce.'};
 const result=await db.prepare('UPDATE safework_orders SET approval_json=?,approved_at=? WHERE id=? AND approval_json IS NULL').bind(JSON.stringify(approval),signedAt,order.id).run();
 if(!result.meta.changes) return json({error:'This pack already has a locked digital sign-off.'},409);
 return json({signed:true,approval});
};
