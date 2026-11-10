import type { APIRoute } from "astro";
import { matchesToolPayment, stripeRequest, toolPaymentConfig } from "../../../lib/tool-payments.mjs";

export const prerender = false;
const paymentKey = (documentType = "") => documentType === "rams" ? "pdfRams" : documentType === "permit" ? "pdfPermit" : "pdf";

export const GET: APIRoute = async ({ request, locals }) => {
	const env = locals.runtime.env as any;
	const url = new URL(request.url);
	const config = toolPaymentConfig(env, paymentKey(url.searchParams.get("document_type") || ""));
	const sessionId = url.searchParams.get("session_id") || "";
	if (!config.enabled) return Response.json({ paid: false, error: "Payment verification is not connected." }, { status: 503 });
	if (!/^cs_(test_|live_)/.test(sessionId)) return Response.json({ paid: false, error: "Invalid checkout session." }, { status: 400 });
	try { const session: any = await stripeRequest(config.key, `checkout/sessions/${encodeURIComponent(sessionId)}`); return Response.json({ paid: matchesToolPayment(session, config) }, { headers: { "Cache-Control": "no-store" } }); }
	catch (error) { return Response.json({ paid: false, error: error instanceof Error ? error.message : "Payment could not be verified." }, { status: 502 }); }
};
