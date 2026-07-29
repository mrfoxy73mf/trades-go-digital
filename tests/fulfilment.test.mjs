import assert from "node:assert/strict";
import test from "node:test";
import {
	FULFILMENT_TYPES,
	isEmail,
	isValidAccessToken,
	parseStripeSignature,
	resolveFulfilmentType,
	verifyStripeSignature,
} from "../src/lib/fulfilment.mjs";

test("resolves explicit Stripe fulfilment metadata", () => {
	assert.equal(
		resolveFulfilmentType({ metadata: { fulfilment_type: "managed_installation" } }),
		FULFILMENT_TYPES.INSTALLATION,
	);
});

test("uses exact GBP prices only as a controlled fallback", () => {
	assert.equal(resolveFulfilmentType({ currency: "gbp", amount_total: 299000 }), FULFILMENT_TYPES.LICENCE);
	assert.equal(resolveFulfilmentType({ currency: "gbp", amount_total: 399000 }), FULFILMENT_TYPES.INSTALLATION);
	assert.equal(resolveFulfilmentType({ currency: "usd", amount_total: 299000 }), null);
	assert.equal(resolveFulfilmentType({ currency: "gbp", amount_total: 100000 }), null);
});

test("parses multiple Stripe v1 signatures", () => {
	assert.deepEqual(parseStripeSignature("t=123,v1=abc,v0=old,v1=def"), {
		timestamp: 123,
		signatures: ["abc", "def"],
	});
});

test("verifies a correctly signed Stripe payload and rejects tampering", async () => {
	const secret = "whsec_test_secret";
	const body = '{"id":"evt_test"}';
	const timestamp = 1700000000;
	const key = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const bytes = await crypto.subtle.sign(
		"HMAC",
		key,
		new TextEncoder().encode(`${timestamp}.${body}`),
	);
	const signature = [...new Uint8Array(bytes)]
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");

	assert.equal(
		await verifyStripeSignature(body, `t=${timestamp},v1=${signature}`, secret, timestamp),
		true,
	);
	assert.equal(
		await verifyStripeSignature(`${body} `, `t=${timestamp},v1=${signature}`, secret, timestamp),
		false,
	);
});

test("validates fulfilment tokens and email addresses", () => {
	assert.equal(isValidAccessToken("a".repeat(64)), true);
	assert.equal(isValidAccessToken("not-a-token"), false);
	assert.equal(isEmail("buyer@example.com"), true);
	assert.equal(isEmail("buyer-at-example"), false);
});

