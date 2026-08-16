import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";

const baseUrl = process.env.FULFILMENT_TEST_URL || "http://127.0.0.1:8790";
const secret = process.env.FULFILMENT_TEST_WEBHOOK_SECRET || "whsec_local_fulfilment_test";

const stripePost = async (fulfilmentType, amountTotal) => {
	const unique = randomUUID().replaceAll("-", "");
	const sessionId = `cs_test_${unique}`;
	const event = {
		id: `evt_${unique}`,
		type: "checkout.session.completed",
		data: {
			object: {
				id: sessionId,
				payment_status: "paid",
				amount_total: amountTotal,
				currency: "gbp",
				metadata: { fulfilment_type: fulfilmentType },
				customer_details: {
					email: "buyer@example.com",
					name: "Demo Buyer",
				},
			},
		},
	};
	const body = JSON.stringify(event);
	const timestamp = Math.floor(Date.now() / 1000);
	const signature = createHmac("sha256", secret)
		.update(`${timestamp}.${body}`)
		.digest("hex");
	const response = await fetch(`${baseUrl}/api/stripe/webhook`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"Stripe-Signature": `t=${timestamp},v1=${signature}`,
		},
		body,
	});
	assert.equal(response.status, 200, await response.text());

	const duplicate = await fetch(`${baseUrl}/api/stripe/webhook`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"Stripe-Signature": `t=${timestamp},v1=${signature}`,
		},
		body,
	});
	assert.equal(duplicate.status, 200, "Duplicate webhook was not idempotent.");
	return sessionId;
};

const getStatus = async (sessionId) => {
	const response = await fetch(
		`${baseUrl}/api/fulfilment/status?session_id=${encodeURIComponent(sessionId)}`,
	);
	if (response.status !== 200) {
		assert.fail(`Status endpoint returned ${response.status}: ${await response.text()}`);
	}
	return response.json();
};

const lockedPage = await fetch(`${baseUrl}/tgd-lettingdesk`, { redirect: "manual" });
assert.equal(lockedPage.status, 401, "The main website lock was bypassed.");

const licenceSession = await stripePost("licence_download", 499000);
const licenceStatus = await getStatus(licenceSession);
assert.equal(licenceStatus.fulfilmentType, "licence_download");
assert.match(licenceStatus.token, /^[a-f0-9]{64}$/);

const download = await fetch(
	`${baseUrl}/api/fulfilment/download?token=${encodeURIComponent(licenceStatus.token)}`,
);
if (download.status !== 200) {
	assert.fail(`Download endpoint returned ${download.status}: ${await download.text()}`);
}
assert.equal(download.headers.get("content-type"), "application/zip");
const packageBytes = new Uint8Array(await download.arrayBuffer());
assert.equal(packageBytes[0], 0x50);
assert.equal(packageBytes[1], 0x4b);

const installationSession = await stripePost("managed_installation", 649000);
const installationStatus = await getStatus(installationSession);
assert.equal(installationStatus.fulfilmentType, "managed_installation");

const form = new URLSearchParams({
	token: installationStatus.token,
	contact_name: "Demo Buyer",
	business_name: "Demo Lettings Ltd",
	contact_email: "buyer@example.com",
	administrator_email: "admin@example.com",
	phone: "01234 567890",
	agency_address: "1 Demo Street, Colchester",
	preferred_domain: "demo-lettings.example",
	branding_notes: "Navy and orange",
	hosting_notes: "Managed installation",
	integration_notes: "Sentry and backups",
	preferred_start_date: "2026-08-10",
	additional_notes: "Sandbox acceptance test",
	accepted_scope: "yes",
});
const formResponse = await fetch(`${baseUrl}/api/fulfilment/installation`, {
	method: "POST",
	headers: {
		"Content-Type": "application/x-www-form-urlencoded",
		Origin: baseUrl,
	},
	body: form,
	redirect: "manual",
});
assert.equal(formResponse.status, 303, await formResponse.text());
assert.equal(
	new URL(formResponse.headers.get("location"), baseUrl).pathname,
	"/fulfilment/setup-received",
);

const submittedStatus = await getStatus(installationSession);
assert.equal(submittedStatus.formSubmitted, true);

console.log("PASS website_lock");
console.log("PASS signed_stripe_webhook");
console.log("PASS duplicate_webhook_idempotency");
console.log("PASS licence_download_zip");
console.log("PASS installation_setup_form");
