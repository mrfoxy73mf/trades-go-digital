import type { APIRoute } from 'astro';
import { authorisedOrder, json } from '../../../lib/safework/orders.mjs';
export const prerender = false;
export const GET: APIRoute = async ({request,locals}) => {
 const order=await authorisedOrder(request,locals.runtime.env.FULFILMENT_DB);
 if(!order || order.status!=='ready') return json({error:'Your document is not available yet.'},404);
 return new Response(order.document_html,{headers:{'Content-Type':'text/html; charset=utf-8','Content-Disposition':'attachment; filename="SafeWork-draft-work-pack.html"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox allow-modals"}});
};
