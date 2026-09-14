import type { APIRoute } from "astro";
import { stripeRequest, toolPaymentConfig } from "../../../lib/tool-payments.mjs";

export const prerender = false;

export const GET: APIRoute = ({ locals }) => {
	const config = toolPaymentConfig(locals.runtime.env, "pdf");
	return Response.json({ enabled: config.enabled, mode: config.mode, amount: config.amount }, { headers: { "Cache-Control": "no-store" } });
};

export const POST: APIRoute = async ({ request, locals }) => {
	const env = locals.runtime.env as any;
	const config = toolPaymentConfig(env, "pdf");
	if (!config.enabled) {
		return Response.json({ error: "PDF checkout is not connected yet." }, { status: 503 });
	}
	if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Please start checkout from this website." }, { status: 403 });
	const origin = env.PUBLIC_SITE_URL || new URL(request.url).origin;
	const params = new URLSearchParams({
		mode: "payment",
		success_url: `${origin}/pdf-maker?session_id={CHECKOUT_SESSION_ID}`,
		cancel_url: `${origin}/pdf-maker?checkout=cancelled`,
		submit_type: "pay",
		allow_promotion_codes: "true",
		"line_items[0][quantity]": "1",
		"line_items[0][price_data][currency]": "gbp",
		"line_items[0][price_data][unit_amount]": String(config.amount),
		"line_items[0][price_data][product_data][name]": config.item.name,
		"line_items[0][price_data][product_data][description]": config.item.description,
		"metadata[product]": config.item.product,
	});
	try { const session: any = await stripeRequest(config.key, "checkout/sessions", params); return Response.json({ url: session.url }); }
	catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Stripe checkout could not be created." }, { status: 502 }); }
};
