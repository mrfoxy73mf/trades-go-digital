import type { APIRoute } from 'astro';
import { authorisedOrder, json } from '../../../lib/safework/orders.mjs';
export const prerender = false;
export const GET: APIRoute = async ({request,locals}) => {
 const order=await authorisedOrder(request,locals.runtime.env.FULFILMENT_DB);
 if(!order || order.status!=='ready') return json({error:'Your document is not available yet.'},404);
 let company='customer';
 try { company=JSON.parse(order.input_json).company || company; } catch {}
 const slug=String(company).normalize('NFKD').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,48) || 'customer';
 const filename=`SafeWork-${slug}-${String(order.id).slice(0,8)}.html`;
 return new Response(order.document_html,{headers:{'Content-Type':'text/html; charset=utf-8','Content-Disposition':`attachment; filename="${filename}"`,'X-SafeWork-Filename':filename,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox allow-modals"}});
};
