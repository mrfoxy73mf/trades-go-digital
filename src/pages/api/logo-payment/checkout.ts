import type { APIRoute } from "astro";
import { stripeRequest, toolPaymentConfig } from "../../../lib/tool-payments.mjs";
export const prerender = false;
const bundleKey = (type = "") => type === "permit" ? "bundlePermit" : type === "rams" ? "bundleRams" : type === "standard" || type === "1" ? "bundle" : "logo";
export const GET: APIRoute = ({ request, locals }) => { const c = toolPaymentConfig(locals.runtime.env, bundleKey(new URL(request.url).searchParams.get("bundle") || "")); return Response.json({ enabled: c.enabled, mode: c.mode, amount: c.amount }, { headers: { "Cache-Control": "no-store" } }); };
export const POST: APIRoute = async ({ request, locals }) => {
	const env = locals.runtime.env as any, body = await request.json().catch(() => ({})) as { bundle?: boolean, bundleType?: string }, bundleType = body.bundleType || (body.bundle ? "standard" : ""), c = toolPaymentConfig(env, bundleKey(bundleType));
	if (bundleType && !["standard", "permit", "rams"].includes(bundleType)) return Response.json({ error: "Unknown bundle type." }, { status: 400 });
	if (!c.enabled) return Response.json({ error: "Logo checkout is not connected yet." }, { status: 503 });
	if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Please start checkout from this website." }, { status: 403 });
	const origin = env.PUBLIC_SITE_URL || new URL(request.url).origin;
	const params = new URLSearchParams({ mode: "payment", "adaptive_pricing[enabled]": "true", success_url: `${origin}/logo-maker?session_id={CHECKOUT_SESSION_ID}${bundleType ? `&bundle=${encodeURIComponent(bundleType)}` : ""}`, cancel_url: `${origin}/logo-maker?checkout=cancelled`, submit_type: "pay", allow_promotion_codes: "true", "line_items[0][quantity]": "1", "line_items[0][price_data][currency]": "gbp", "line_items[0][price_data][unit_amount]": String(c.amount), "line_items[0][price_data][product_data][name]": c.item.name, "line_items[0][price_data][product_data][description]": c.item.description, "metadata[product]": c.item.product, "metadata[bundle_type]": bundleType });
	try { const session: any = await stripeRequest(c.key, "checkout/sessions", params); return Response.json({ url: session.url }); }
	catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Stripe checkout could not be created." }, { status: 502 }); }
};
