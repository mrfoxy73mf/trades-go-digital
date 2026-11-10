import type { APIRoute } from "astro";
import { matchesToolPayment, stripeRequest, toolPaymentConfig } from "../../../lib/tool-payments.mjs";
export const prerender = false;
const bundleKey = (type = "") => type === "permit" ? "bundlePermit" : type === "rams" ? "bundleRams" : type === "standard" || type === "1" ? "bundle" : "logo";
export const GET: APIRoute = async ({ request, locals }) => {
	const url = new URL(request.url), c = toolPaymentConfig(locals.runtime.env, bundleKey(url.searchParams.get("bundle") || "")), sessionId = url.searchParams.get("session_id") || "";
	if (!c.enabled) return Response.json({ paid: false, error: "Payment verification is not connected." }, { status: 503 });
	if (!/^cs_(test_|live_)/.test(sessionId)) return Response.json({ paid: false, error: "Invalid checkout session." }, { status: 400 });
	try { const session: any = await stripeRequest(c.key, `checkout/sessions/${encodeURIComponent(sessionId)}`); return Response.json({ paid: matchesToolPayment(session, c) }, { headers: { "Cache-Control": "no-store" } }); }
	catch (error) { return Response.json({ paid: false, error: error instanceof Error ? error.message : "Payment could not be verified." }, { status: 502 }); }
};
