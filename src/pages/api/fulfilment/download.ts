import type { APIRoute } from "astro";
import { FULFILMENT_TYPES, isValidAccessToken } from "../../../lib/fulfilment.mjs";

export const prerender = false;

export const GET: APIRoute = async ({ request, locals }) => {
	const token = new URL(request.url).searchParams.get("token") || "";
	if (!isValidAccessToken(token)) return new Response("Invalid download link.", { status: 400 });

	const env = locals.runtime.env;
	const order = await env.FULFILMENT_DB.prepare(
		`SELECT session_id, payment_status, fulfilment_type, token_expires_at, download_count
		   FROM fulfilment_orders
		  WHERE access_token = ?`,
	)
		.bind(token)
		.first<any>();

	if (
		!order ||
		order.payment_status !== "paid" ||
		order.fulfilment_type !== FULFILMENT_TYPES.LICENCE ||
		Date.parse(order.token_expires_at) <= Date.now()
	) {
		return new Response("This download link is invalid or expired.", { status: 410 });
	}
	if (Number(order.download_count) >= 3) {
		return new Response("The download limit has been reached. Please contact support.", { status: 410 });
	}

	const sourcePackage = await env.FULFILMENT_FILES.get("lettingdesk:master-package", {
		type: "arrayBuffer",
	});
	if (!sourcePackage) {
		console.error("LettingDesk master package is missing from fulfilment storage.");
		return new Response("The download is temporarily unavailable. Please contact support.", { status: 503 });
	}

	await env.FULFILMENT_DB.prepare(
		`UPDATE fulfilment_orders
		    SET download_count = download_count + 1, updated_at = ?
		  WHERE session_id = ? AND download_count < 3`,
	)
		.bind(new Date().toISOString(), order.session_id)
		.run();

	return new Response(sourcePackage, {
		headers: {
			"Content-Type": "application/zip",
			"Content-Disposition": 'attachment; filename="TGD-LettingDesk-source-package.zip"',
			"Cache-Control": "private, no-store",
			"X-Content-Type-Options": "nosniff",
		},
	});
};

