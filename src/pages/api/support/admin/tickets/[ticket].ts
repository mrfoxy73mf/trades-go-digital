import type { APIRoute } from "astro";
export const prerender = false;
const STATUSES = new Set(["new", "reviewing", "waiting_for_customer", "resolved", "closed"]);
export const PATCH: APIRoute = async ({ request, locals, params }) => {
 const env = locals.runtime.env as Env & { SUPPORT_CONTROL_KEY?: string };
 if (!env.SUPPORT_CONTROL_KEY || request.headers.get("X-TGD-Support-Key") !== env.SUPPORT_CONTROL_KEY) return Response.json({ error:"Not authorised" },{status:401});
 const body = await request.json().catch(()=>null) as { status?:string, reply?:string } | null;
 if (!body || !STATUSES.has(body.status || "")) return Response.json({ error:"Invalid status" },{status:400});
 const row = await env.FULFILMENT_DB.prepare("SELECT ticket_number,account_email,subject FROM support_tickets WHERE ticket_number = ?").bind(params.ticket).first<{ticket_number:string,account_email:string,subject:string}>();
 if (!row) return Response.json({ error:"Ticket not found" },{status:404});
 const now = new Date().toISOString();
 await env.FULFILMENT_DB.prepare("UPDATE support_tickets SET status=?, updated_at=? WHERE ticket_number=?").bind(body.status,now,params.ticket).run();
 const reply = String(body.reply || "").trim().slice(0,5000);
 if (reply && env.RESEND_API_KEY) await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({from:"TGD Support <orders@tgd.trades-go-digital.co.uk>",to:[row.account_email],subject:`${row.ticket_number}: ${row.subject}`,text:`Support ticket: ${row.ticket_number}\n\n${reply}\n\nStatus: ${body.status}\n\nTrades Go Digital Support`}),signal:AbortSignal.timeout(15000)});
 return Response.json({updated:true,status:body.status,updated_at:now});
};
