import type { APIRoute } from 'astro';
import { config, json, validateInput, token, digest, stripe, PRODUCT, rateLimit, INCLUDED_TRIAL_HOLE_SHEETS, EXTRA_TRIAL_HOLE_SHEET_PENCE } from '../../../lib/safework/orders.mjs';
export const prerender = false;
export const GET: APIRoute = ({locals}) => { const c = config(locals.runtime.env); return json({enabled:c.enabled, mode:c.mode, amount:Number.isSafeInteger(c.amount) ? c.amount : null,includedTrialHoleSheets:INCLUDED_TRIAL_HOLE_SHEETS,extraTrialHoleSheetPence:EXTRA_TRIAL_HOLE_SHEET_PENCE}); };
export const POST: APIRoute = async ({request,locals}) => {
 const env = locals.runtime.env; const c = config(env);
 if (!c.enabled) return json({error:'Online sales are not open yet. No payment has been taken.'},503);
 if(request.headers.get('origin') !== new URL(request.url).origin) return json({error:'Please start checkout from this website.'},403);
 if(Number(request.headers.get('content-length') || 0) > 24000) return json({error:'Job details are too long.'},413);
 let input; try { const raw = await request.text(); if(raw.length>24000) return json({error:'Job details are too long.'},413); input=validateInput(JSON.parse(raw)); } catch(e) { return json({error:e instanceof Error ? e.message : 'Invalid details'},400); }
 try {
  const extraTrialHoleSheets=Math.max(0,input.trialHoleSheets-INCLUDED_TRIAL_HOLE_SHEETS);
  const orderAmount=c.amount+(extraTrialHoleSheets*EXTRA_TRIAL_HOLE_SHEET_PENCE);
  const db=env.FULFILMENT_DB;
  if(!await rateLimit(db,request.headers.get('cf-connecting-ip') || 'local')) return json({error:'Too many checkout requests. Please try again later.'},429);
  const id=crypto.randomUUID(); const access=token();
  await db.prepare('INSERT INTO safework_orders(id,token_hash,input_json,amount,mode,created_at) VALUES(?,?,?,?,?,?)').bind(id,await digest(access),JSON.stringify(input),orderAmount,c.mode,Date.now()).run();
  const origin=new URL(request.url).origin;
  const returnUrl=`${origin}/safework/order?id=${id}#${access}`;
  const session=await stripe(c.key,'checkout/sessions',new URLSearchParams({mode:'payment',success_url:returnUrl,cancel_url:returnUrl, 'payment_method_types[0]':'card','line_items[0][quantity]':'1','line_items[0][price_data][currency]':'gbp','line_items[0][price_data][unit_amount]':String(orderAmount),'line_items[0][price_data][product_data][name]':'SafeWork AI draft work pack','line_items[0][price_data][product_data][description]':`One job-specific draft work pack with ${input.trialHoleSheets} trial-hole sheet${input.trialHoleSheets===1?'':'s'} and repeat downloads.`, 'metadata[product]':PRODUCT,'metadata[order_id]':id,'metadata[trial_hole_sheets]':String(input.trialHoleSheets)}),`safework-${id}`);
  await db.prepare('UPDATE safework_orders SET session_id=?,checkout_url=? WHERE id=?').bind(session.id,session.url,id).run();
  return json({url:session.url, returnUrl});
 } catch {return json({error:'Checkout could not be opened. Please try again.'},502);}
};
