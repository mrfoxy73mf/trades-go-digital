import type { APIRoute } from "astro";
import {
	FULFILMENT_TYPES,
	cleanText,
	isEmail,
	isValidAccessToken,
} from "../../../lib/fulfilment.mjs";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
	const data = await request.formData();
	const token = cleanText(data.get("token"), 64);
	const contactName = cleanText(data.get("contact_name"), 120);
	const businessName = cleanText(data.get("business_name"), 160);
	const contactEmail = cleanText(data.get("contact_email"), 200).toLowerCase();
	const administratorEmail = cleanText(data.get("administrator_email"), 200).toLowerCase();
	const acceptedScope = data.get("accepted_scope") === "yes";

	if (
		!isValidAccessToken(token) ||
		!contactName ||
		!businessName ||
		!isEmail(contactEmail) ||
		!isEmail(administratorEmail) ||
		!acceptedScope
	) {
		return new Response("Please complete all required fields and accept the installation scope.", { status: 400 });
	}

	const env = locals.runtime.env;
	const order = await env.FULFILMENT_DB.prepare(
		`SELECT session_id, payment_status, fulfilment_type, token_expires_at, form_submitted_at
		   FROM fulfilment_orders
		  WHERE access_token = ?`,
	)
		.bind(token)
		.first<any>();

	if (
		!order ||
		order.payment_status !== "paid" ||
		order.fulfilment_type !== FULFILMENT_TYPES.INSTALLATION ||
		Date.parse(order.token_expires_at) <= Date.now()
	) {
		return new Response("This setup link is invalid or expired.", { status: 410 });
	}
	if (order.form_submitted_at) {
		return Response.redirect(new URL("/fulfilment/setup-received", request.url), 303);
	}

	const submittedAt = new Date().toISOString();
	await env.FULFILMENT_DB.batch([
		env.FULFILMENT_DB.prepare(
			`INSERT INTO installation_submissions (
				session_id, contact_name, business_name, contact_email, phone,
				agency_address, preferred_domain, administrator_email, branding_notes,
				hosting_notes, integration_notes, preferred_start_date, additional_notes,
				accepted_scope, submitted_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
		).bind(
			order.session_id,
			contactName,
			businessName,
			contactEmail,
			cleanText(data.get("phone"), 80) || null,
			cleanText(data.get("agency_address"), 500) || null,
			cleanText(data.get("preferred_domain"), 200) || null,
			administratorEmail,
			cleanText(data.get("branding_notes"), 2000) || null,
			cleanText(data.get("hosting_notes"), 2000) || null,
			cleanText(data.get("integration_notes"), 2000) || null,
			cleanText(data.get("preferred_start_date"), 40) || null,
			cleanText(data.get("additional_notes"), 3000) || null,
			submittedAt,
		),
		env.FULFILMENT_DB.prepare(
			`UPDATE fulfilment_orders
			    SET form_submitted_at = ?, updated_at = ?
			  WHERE session_id = ?`,
		).bind(submittedAt, submittedAt, order.session_id),
	]);

	return Response.redirect(new URL("/fulfilment/setup-received", request.url), 303);
};

