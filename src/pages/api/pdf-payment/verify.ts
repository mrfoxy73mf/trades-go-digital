import type { APIRoute } from "astro";
import { matchesToolPayment, stripeRequest, toolPaymentConfig } from "../../../lib/tool-payments.mjs";

export const prerender = false;
const paymentKey = (documentType = "") => documentType === "rams" ? "pdfRams" : documentType === "permit" ? "pdfPermit" : "pdf";

export const GET: APIRoute = async ({ request, locals }) => {
	const env = locals.runtime.env as any;
	const url = new URL(request.url);
	const documentType = url.searchParams.get("document_type") || "", bundle = url.searchParams.get("bundle") === "1";
	if (bundle && ["rams", "permit"].includes(documentType)) return Response.json({ paid: false, error: "The bundle covers a standard PDF only." }, { status: 400 });
	const config = toolPaymentConfig(env, bundle ? "bundle" : paymentKey(documentType));
	const sessionId = url.searchParams.get("session_id") || "";
	if (!config.enabled) return Response.json({ paid: false, error: "Payment verification is not connected." }, { status: 503 });
	if (!/^cs_(test_|live_)/.test(sessionId)) return Response.json({ paid: false, error: "Invalid checkout session." }, { status: 400 });
	try { const session: any = await stripeRequest(config.key, `checkout/sessions/${encodeURIComponent(sessionId)}`); return Response.json({ paid: matchesToolPayment(session, config) }, { headers: { "Cache-Control": "no-store" } }); }
	catch (error) { return Response.json({ paid: false, error: error instanceof Error ? error.message : "Payment could not be verified." }, { status: 502 }); }
};
