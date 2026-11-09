const CATEGORIES = new Set(["Login or account access", "Quotes", "Jobs", "Invoices", "Office Mailroom", "Accountant", "Payments", "Documents", "Technical problem", "General help"]);
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const SUPPORT_EMAIL = "support@trades-go-digital.co.uk";

const clean = (value, max) => typeof value === "string" ? value.trim().slice(0, max) : "";
const emailOk = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const phoneOk = value => !value || (/^[+()\d\s.-]{7,30}$/.test(value) && value.replace(/\D/g, "").length >= 7);

function response(body, status = 200) {
 return Response.json(body, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}

export async function createSupportTicket(request, env, send = fetch) {
 const url = new URL(request.url);
 if (request.headers.get("Origin") !== url.origin) return response({ error: "This support request was not accepted." }, 403);
 if (!request.headers.get("Content-Type")?.startsWith("application/json")) return response({ error: "Unsupported request." }, 415);
 if (Number(request.headers.get("Content-Length") || 0) > 8_000_000) return response({ error: "The screenshots are too large." }, 413);
 if (env.TRAFFIC_MAP_RATE_LIMITER) {
  const limited = await env.TRAFFIC_MAP_RATE_LIMITER.limit({ key: `support:${request.headers.get("CF-Connecting-IP") || "unknown"}` });
  if (!limited.success) return response({ error: "Too many requests. Please wait before trying again." }, 429);
 }
 let body;
 try { body = await request.json(); } catch { return response({ error: "Please check the form and try again." }, 400); }
 if (body.website) return response({ error: "This support request was not accepted." }, 400);
 const values = {
  customer_name: clean(body.customer_name, 120), business_name: clean(body.business_name, 160),
  account_email: clean(body.account_email, 254).toLowerCase(), phone: clean(body.phone, 30),
  category: clean(body.category, 80), page_name: clean(body.page_name, 120), subject: clean(body.subject, 160),
  description: clean(body.description, 5000), steps: clean(body.steps, 3000), preferred_reply: clean(body.preferred_reply, 20) || "email",
 };
 const emergency = body.priority === "emergency";
 if (!values.customer_name || !emailOk(values.account_email) || !CATEGORIES.has(values.category) || !values.subject || values.description.length < 20) return response({ error: "Please complete your name, account email, category, title and a clear description." }, 400);
 if (!phoneOk(values.phone) || (emergency && !values.phone)) return response({ error: emergency ? "Please provide a contact telephone number for an emergency report." : "Please check the telephone number." }, 400);
 if (!env.FULFILMENT_DB || !env.FULFILMENT_FILES) return response({ error: "Ticket storage is temporarily unavailable. Please email support@trades-go-digital.co.uk." }, 503);
 const screenshots = Array.isArray(body.screenshots) ? body.screenshots.slice(0, 3) : [];
 const parsed = [];
 for (const item of screenshots) {
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(item || "");
  if (!match || !IMAGE_TYPES.has(match[1])) return response({ error: "Screenshots must be PNG, JPEG or WebP images." }, 400);
  const bytes = Uint8Array.from(atob(match[2]), c => c.charCodeAt(0));
  if (bytes.length > 2_000_000) return response({ error: "Each screenshot must be 2 MB or smaller." }, 413);
  parsed.push({ type: match[1], bytes });
 }
 const now = new Date().toISOString();
 const id = crypto.randomUUID();
 const ticketNumber = `TGD-${now.slice(0, 10).replaceAll("-", "")}-${id.slice(0, 6).toUpperCase()}`;
 const keys = [];
 for (let i = 0; i < parsed.length; i++) {
  const ext = parsed[i].type === "image/png" ? "png" : parsed[i].type === "image/webp" ? "webp" : "jpg";
  const key = `support/${id}/${i + 1}.${ext}`;
  await env.FULFILMENT_FILES.put(key, parsed[i].bytes, { httpMetadata: { contentType: parsed[i].type } }); keys.push(key);
 }
 await env.FULFILMENT_DB.prepare(`INSERT INTO support_tickets (id,ticket_number,account_email,customer_name,business_name,phone,category,page_name,subject,description,steps,preferred_reply,priority,status,screenshot_keys,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'new',?,?,?)`).bind(id,ticketNumber,values.account_email,values.customer_name,values.business_name,values.phone,values.category,values.page_name,values.subject,values.description,values.steps,values.preferred_reply,emergency ? "emergency" : "standard",JSON.stringify(keys),now,now).run();
 if (env.RESEND_API_KEY) {
  const text = [`Ticket: ${ticketNumber}`,`Priority: ${emergency ? "EMERGENCY" : "Standard"}`,`Account: ${values.account_email}`,`Customer: ${values.customer_name}`,`Business: ${values.business_name || "Not supplied"}`,`Phone: ${values.phone || "Not supplied"}`,`Category: ${values.category}`,`Page: ${values.page_name || "Not supplied"}`,`Subject: ${values.subject}`,`Description:\n${values.description}`,`Steps:\n${values.steps || "Not supplied"}`,`Screenshots: ${keys.length}`].join("\n\n");
  await send("https://api.resend.com/emails", { method:"POST", headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,"Content-Type":"application/json"}, body:JSON.stringify({from:"TGD Support <orders@tgd.trades-go-digital.co.uk>",to:[SUPPORT_EMAIL],reply_to:values.account_email,subject:`${emergency ? "EMERGENCY — " : ""}${ticketNumber}: ${values.subject}`,text}), signal:AbortSignal.timeout(15000) }).catch(()=>null);
 }
 return response({ created:true, ticket_number:ticketNumber, priority:emergency ? "emergency" : "standard", status:"new", created_at:now, qr_value:`TGD-SUPPORT:${ticketNumber}:${values.account_email}` }, 201);
}
