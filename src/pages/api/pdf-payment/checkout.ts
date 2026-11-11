import type { APIRoute } from "astro";
import { stripeRequest, toolPaymentConfig } from "../../../lib/tool-payments.mjs";

export const prerender = false;

const paymentKey = (documentType = "") => documentType === "rams" ? "pdfRams" : documentType === "permit" ? "pdfPermit" : "pdf";

export const GET: APIRoute = ({ request, locals }) => {
	const config = toolPaymentConfig(locals.runtime.env, paymentKey(new URL(request.url).searchParams.get("document_type") || ""));
	return Response.json({ enabled: config.enabled, mode: config.mode, amount: config.amount }, { headers: { "Cache-Control": "no-store" } });
};

export const POST: APIRoute = async ({ request, locals }) => {
	const env = locals.runtime.env as any;
	const body = await request.json().catch(() => ({})) as { documentType?: string };
	const documentType = body.documentType || "quote";
	const config = toolPaymentConfig(env, paymentKey(documentType));
	if (!config.enabled) {
		return Response.json({ error: "PDF checkout is not connected yet." }, { status: 503 });
	}
	if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Please start checkout from this website." }, { status: 403 });
	const origin = env.PUBLIC_SITE_URL || new URL(request.url).origin;
	const params = new URLSearchParams({
		mode: "payment",
		"adaptive_pricing[enabled]": "true",
		success_url: `${origin}/pdf-maker?session_id={CHECKOUT_SESSION_ID}&document_type=${encodeURIComponent(documentType)}`,
		cancel_url: `${origin}/pdf-maker?checkout=cancelled`,
		submit_type: "pay",
		allow_promotion_codes: "true",
		"line_items[0][quantity]": "1",
		"line_items[0][price_data][currency]": "gbp",
		"line_items[0][price_data][unit_amount]": String(config.amount),
		"line_items[0][price_data][product_data][name]": config.item.name,
		"line_items[0][price_data][product_data][description]": config.item.description,
		"metadata[product]": config.item.product,
		"metadata[document_type]": documentType,
	});
	try { const session: any = await stripeRequest(config.key, "checkout/sessions", params); return Response.json({ url: session.url }); }
	catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Stripe checkout could not be created." }, { status: 502 }); }
};
