import type { APIRoute } from "astro";
import {
	FULFILMENT_TYPES,
	makeAccessToken,
	resolveFulfilmentType,
	verifyStripeSignature,
} from "../../../lib/fulfilment.mjs";
import { sendOrderEmails } from "../../../lib/fulfilment-email.mjs";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
	const env = locals.runtime.env;
	const rawBody = await request.text();
	const signature = request.headers.get("stripe-signature") || "";

	if (!(await verifyStripeSignature(rawBody, signature, env.STRIPE_WEBHOOK_SECRET))) {
		return new Response("Invalid signature", { status: 400 });
	}

	let event: any;
	try {
		event = JSON.parse(rawBody);
	} catch {
		return new Response("Invalid JSON", { status: 400 });
	}

	if (event.type !== "checkout.session.completed") {
		return Response.json({ received: true });
	}

	const session = event.data?.object;
	if (!session?.id || session.payment_status !== "paid") {
		return Response.json({ received: true });
	}

	const fulfilmentType = resolveFulfilmentType(session);
	const email = session.customer_details?.email || session.customer_email;
	if (!fulfilmentType || !email) {
		console.error("Paid LettingDesk session is missing fulfilment metadata or customer email", session.id);
		return new Response("Unsupported paid session", { status: 422 });
	}

	const now = new Date();
	const expiryDays = fulfilmentType === FULFILMENT_TYPES.LICENCE ? 7 : 30;
	const expires = new Date(now.getTime() + expiryDays * 86400000);
	const token = makeAccessToken();

	const insert = await env.FULFILMENT_DB.prepare(
		`INSERT OR IGNORE INTO fulfilment_orders (
			session_id, event_id, customer_email, customer_name, business_name,
			fulfilment_type, amount_total, currency, payment_status, access_token,
			token_expires_at, created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'paid', ?, ?, ?, ?)`,
	)
		.bind(
			session.id,
			event.id,
			email,
			session.customer_details?.name || null,
			session.custom_fields?.find((field: any) => field.key === "business_name")?.text?.value || null,
			fulfilmentType,
			session.amount_total,
			String(session.currency || "").toLowerCase(),
			token,
			expires.toISOString(),
			now.toISOString(),
			now.toISOString(),
		)
		.run();

	if (insert.meta.changes > 0) {
		const order = {
			sessionId: session.id,
			customerEmail: email,
			customerName: session.customer_details?.name || null,
			businessName:
				session.custom_fields?.find((field: any) => field.key === "business_name")?.text?.value ||
				null,
			fulfilmentType,
			amountTotal: session.amount_total,
		};
		locals.runtime.ctx.waitUntil(sendOrderEmails(env, order));
	}

	return Response.json({ received: true });
};
