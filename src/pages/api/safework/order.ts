import type { APIRoute } from 'astro';
import { authorisedOrder, json, stripe, markPaid } from '../../../lib/safework/orders.mjs';
export const prerender = false;
export const GET: APIRoute = async ({request,locals}) => {
 try {
  const env=locals.runtime.env; const db=env.FULFILMENT_DB; let order=await authorisedOrder(request,db);
  if(!order) return json({error:'Order not found. Open your private order link.'},404);
  if(order.status==='unpaid' && order.session_id) {
   const key=order.mode==='live'?env.STRIPE_SECRET_KEY:env.STRIPE_TEST_SECRET_KEY;
   if(key) { const session=await stripe(key,`checkout/sessions/${encodeURIComponent(order.session_id)}`); await markPaid(db,session); order=await authorisedOrder(request,db); }
  }
  return json({id:order.id,status:order.status,amount:order.amount,mode:order.mode,checkoutUrl:order.status==='unpaid'?order.checkout_url:null, retryAvailable:order.attempts<3,working:order.lease_until>Date.now(),title:JSON.parse(order.input_json).company});
 } catch {return json({error:'Could not retrieve the order. Please retry.'},502);}
};
