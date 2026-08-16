import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = async ({ request, locals }) => {
	const env = locals.runtime.env as any;
	const sessionId = new URL(request.url).searchParams.get("session_id") || "";
	if (!env.STRIPE_SECRET_KEY) return Response.json({ paid: false, error: "Payment verification is not connected." }, { status: 503 });
	if (!sessionId.startsWith("cs_")) return Response.json({ paid: false, error: "Invalid checkout session." }, { status: 400 });
	const stripeResponse = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
		headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` },
	});
	const session: any = await stripeResponse.json();
	if (!stripeResponse.ok) return Response.json({ paid: false, error: session.error?.message || "Payment could not be verified." }, { status: 502 });
	return Response.json({ paid: session.payment_status === "paid" && session.metadata?.product === "tgd_pdf_download" });
};
