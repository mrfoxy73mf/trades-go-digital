import type { APIRoute } from "astro";
export const prerender = false;
const denied = () => Response.json({ error: "Not authorised" }, { status: 401 });
export const GET: APIRoute = async ({ request, locals }) => {
 const env = locals.runtime.env as Env & { SUPPORT_CONTROL_KEY?: string };
 if (!env.SUPPORT_CONTROL_KEY || request.headers.get("X-TGD-Support-Key") !== env.SUPPORT_CONTROL_KEY) return denied();
 const rows = await env.FULFILMENT_DB.prepare("SELECT ticket_number,account_email,customer_name,business_name,phone,category,page_name,subject,description,steps,preferred_reply,priority,status,screenshot_keys,created_at,updated_at FROM support_tickets ORDER BY CASE priority WHEN 'emergency' THEN 0 ELSE 1 END, created_at DESC LIMIT 200").all();
 return Response.json({ tickets: rows.results || [] }, { headers: { "Cache-Control": "no-store" } });
};
