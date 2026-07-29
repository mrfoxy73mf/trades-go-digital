import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = async ({ request, locals }) => {
	const sessionId = new URL(request.url).searchParams.get("session_id") || "";
	if (!/^cs_(test_|live_)?[A-Za-z0-9_]+$/.test(sessionId)) {
		return Response.json({ error: "Invalid order reference." }, { status: 400 });
	}

	const order = await locals.runtime.env.FULFILMENT_DB.prepare(
		`SELECT fulfilment_type, payment_status, access_token, token_expires_at,
		        download_count, form_submitted_at
		   FROM fulfilment_orders
		  WHERE session_id = ?`,
	)
		.bind(sessionId)
		.first<any>();

	if (!order) {
		return Response.json(
			{ pending: true, message: "Stripe is still confirming this payment. Please wait a moment." },
			{ status: 202, headers: { "Cache-Control": "no-store" } },
		);
	}

	if (order.payment_status !== "paid" || Date.parse(order.token_expires_at) <= Date.now()) {
		return Response.json({ error: "This fulfilment link has expired. Please contact support." }, { status: 410 });
	}

	return Response.json(
		{
			pending: false,
			fulfilmentType: order.fulfilment_type,
			token: order.access_token,
			downloadsRemaining: Math.max(0, 3 - Number(order.download_count || 0)),
			formSubmitted: Boolean(order.form_submitted_at),
		},
		{ headers: { "Cache-Control": "no-store" } },
	);
};

