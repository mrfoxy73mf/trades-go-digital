import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
	const env = locals.runtime.env as any;
	if (!env.STRIPE_SECRET_KEY) {
		return Response.json({ error: "PDF checkout is not connected yet." }, { status: 503 });
	}
	const origin = env.PUBLIC_SITE_URL || new URL(request.url).origin;
	const amount = Number(env.PDF_DOWNLOAD_PRICE_PENCE || 499);
	const params = new URLSearchParams({
		mode: "payment",
		success_url: `${origin}/pdf-maker?session_id={CHECKOUT_SESSION_ID}`,
		cancel_url: `${origin}/pdf-maker?checkout=cancelled`,
		submit_type: "pay",
		allow_promotion_codes: "true",
		"line_items[0][quantity]": "1",
		"line_items[0][price_data][currency]": "gbp",
		"line_items[0][price_data][unit_amount]": String(amount),
		"line_items[0][price_data][product_data][name]": "Watermark-free PDF download",
		"line_items[0][price_data][product_data][description]": "One finished, print-ready PDF designed with Trades Go Digital.",
		"metadata[product]": "tgd_pdf_download",
	});
	const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
		method: "POST",
		headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, "Content-Type": "application/x-www-form-urlencoded" },
		body: params,
	});
	const session: any = await stripeResponse.json();
	if (!stripeResponse.ok) return Response.json({ error: session.error?.message || "Stripe checkout could not be created." }, { status: 502 });
	return Response.json({ url: session.url });
};
