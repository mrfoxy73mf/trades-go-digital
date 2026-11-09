import type { APIRoute } from "astro";
import { createSupportTicket } from "../../../lib/support.mjs";
import { supportClaims } from "../../../lib/support-access";
export const prerender = false;
export const POST: APIRoute = async ({ request, locals, cookies }) => {
	const subscriber = await supportClaims(cookies, locals.runtime.env);
	if (!subscriber) return Response.json({ error: "Subscriber support access has expired. Open Support again from TGD Trades." }, { status: 401 });
	return createSupportTicket(request, locals.runtime.env, fetch, subscriber);
};
