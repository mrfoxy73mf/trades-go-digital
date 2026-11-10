const RECIPIENT = "hello@trades-go-digital.co.uk";
const FAILURE = "Your message could not be sent. Please try again or email hello@trades-go-digital.co.uk.";
const fields = { Name: 120, "Business name": 160, Trade: 120, Contact: 200, Message: 4000 };

function respond(request, body, status = 200) {
 const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
 if (request.headers.get("Accept")?.includes("application/json")) {
  return Response.json(body, { status, headers });
 }
 if (body.sent) return new Response(null, { status: 303, headers: { ...headers, Location: "/contact/?enquiry=sent#tgd-enquiry" } });
 return new Response(`${body.error}\n\nReturn to https://trades-go-digital.co.uk/contact/#tgd-enquiry to try again.`, { status, headers: { ...headers, "Content-Type": "text/plain; charset=utf-8" } });
}

export async function handleEnquiry(request, env, send = fetch) {
 const fail = (status, error = FAILURE) => respond(request, { sent: false, error }, status);
 const url = new URL(request.url);
 if (request.headers.get("Origin") !== url.origin) return fail(403);
 const type = request.headers.get("Content-Type") || "";
 if (!type.startsWith("multipart/form-data") && !type.startsWith("application/x-www-form-urlencoded")) return fail(415);
 if (Number(request.headers.get("Content-Length")) > 16000) return fail(413, "Your message is too long. Please shorten it and try again.");
 if (!env.RESEND_API_KEY) return fail(503);
 try {
  if (env.TRAFFIC_MAP_RATE_LIMITER) {
   const key = `enquiry:${request.headers.get("CF-Connecting-IP") || "unknown"}`;
   const limit = await env.TRAFFIC_MAP_RATE_LIMITER.limit({ key });
   if (!limit.success) return fail(429, "Too many messages. Please wait a minute before trying again.");
  }
  const raw = await request.text();
  if (raw.length > 16000) return fail(413, "Your message is too long. Please shorten it and try again.");
  const data = await new Request(url, { method: "POST", headers: { "Content-Type": type }, body: raw }).formData();
  if (data.get("Website")) return fail(400);
  const values = {};
  for (const [name, max] of Object.entries(fields)) {
   const value = data.get(name);
   if (typeof value !== "string" || value.length > max) return fail(400, "Please check your enquiry and keep within the field limits.");
   values[name] = value.trim();
  }
  if (!values.Name || !values.Trade || !values.Contact || !values.Message) return fail(400, "Please enter your name, trade, contact details and message.");
  const contact = values.Contact;
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
  const phone = /^[+()\d\s.-]{7,30}$/.test(contact) && contact.replace(/\D/g, "").length >= 7;
  if (!email && !phone) return fail(400, "Please enter a valid email address or phone number so we can reply.");
  const response = await send("https://api.resend.com/emails", {
   method: "POST",
   headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
   body: JSON.stringify({
    from: "TGD Trades <orders@tgd.trades-go-digital.co.uk>",
    to: [RECIPIENT],
    ...(email ? { reply_to: contact } : {}),
    subject: "TGD Trades website enquiry",
    text: Object.keys(fields).map((name) => `${name}: ${values[name] || "Not supplied"}`).join("\n\n"),
   }),
   signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) return fail(502);
  const result = await response.json().catch(() => null);
  if (!result?.id) return fail(502);
  return respond(request, { sent: true });
 } catch {
  return fail(502);
 }
}
