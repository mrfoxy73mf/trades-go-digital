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
import {
	buildBuyerEmail,
	buildFulfilmentUrl,
	buildSellerEmail,
	escapeHtml,
	formatGbp,
} from "../src/lib/fulfilment-email.mjs";
import { validateInput as validateSafeWorkInput } from "../src/lib/safework/orders.mjs";
import { parseEmergencyDetails } from "../src/lib/safework/emergency.mjs";
import { readFile } from "node:fs/promises";

const safeWorkInput = (workerCount) => ({
	description: "Install a timber fence with controlled access.",
	address: "1 Test Street, London",
	company: "Test Trades Ltd",
	companyAddress: "",
	contact: "",
	emergency: "",
	workerCount,
	reviewAccepted: true,
	processingAccepted: true,
});

test("keeps the confirmed SafeWork worker count", () => {
	assert.equal(validateSafeWorkInput(safeWorkInput("4")).workerCount, 4);
});

test("SafeWork knowledge includes the official Chapter 8 and Red Book traffic sources", async () => {
	const knowledge = JSON.parse(await readFile(new URL("../src/lib/safework/runtime-knowledge.json", import.meta.url), "utf8"));
	const trafficTopic = knowledge.topics.find((topic) => topic.id === "temporary-traffic-management-street-works");
	assert.ok(trafficTopic);
	assert.match(trafficTopic.application_rules.join(" "), /Do not invent sign distances/i);
	assert.match(trafficTopic.application_rules.join(" "), /Distinguish static traffic management from.*mobile lane closure/i);
	assert.match(trafficTopic.application_rules.join(" "), /deputy supervisor required for that technique/i);
	const sourceIds = new Set(knowledge.official_sources.sources.map((source) => source.id));
	assert.ok(sourceIds.has("dft-traffic-signs-manual-chapter-8"));
	assert.ok(sourceIds.has("dft-safety-street-road-works-red-book"));
});

test("traffic-management packs distinguish static work from the Chapter 8 mobile lane closure technique", async () => {
	const page = await readFile(new URL("../src/pages/traffic-management.astro", import.meta.url), "utf8");
	const renderer = await readFile(new URL("../src/lib/safework/render.ts", import.meta.url), "utf8");
	assert.match(page, /value="Static lane closure"/);
	assert.match(page, /value="Mobile lane closure \(MLC\)"/);
	assert.match(renderer, /TM-MLC/);
	assert.match(renderer, /IPV \/ leading block-vehicle driver/);
});

test("rejects unsafe SafeWork worker counts", () => {
	for (const count of [0, 51, 1.5, "four", ""]) assert.throws(() => validateSafeWorkInput(safeWorkInput(count)), /number of workers/);
});

test("maps SafeWork emergency form fields into the generated document", () => {
	assert.deepEqual(
		parseEmergencyDetails("Site emergency contact: Site Supervisor: 01206 000000\nFirst aider: First Aider: 01206 000001\nHospital 1: Colchester Hospital: Turner Road, Colchester, Essex, CO4 5JL: 01206 747474"),
		{
			siteContact: "Site Supervisor",
			sitePhone: "01206 000000",
			firstAider: "First Aider",
			firstAiderPhone: "01206 000001",
			hospitals: [
				{ name: "Colchester Hospital", address: "Turner Road, Colchester, Essex, CO4 5JL", phone: "01206 747474" },
				{ name: "", address: "", phone: "" },
				{ name: "", address: "", phone: "" },
			],
		},
	);
});

test("resolves explicit Stripe fulfilment metadata", () => {
	assert.equal(
		resolveFulfilmentType({ metadata: { fulfilment_type: "managed_installation" } }),
		FULFILMENT_TYPES.INSTALLATION,
	);
});

test("uses exact GBP prices only as a controlled fallback", () => {
	assert.equal(resolveFulfilmentType({ currency: "gbp", amount_total: 499000 }), FULFILMENT_TYPES.LICENCE);
	assert.equal(resolveFulfilmentType({ currency: "gbp", amount_total: 649000 }), FULFILMENT_TYPES.INSTALLATION);
	assert.equal(resolveFulfilmentType({ currency: "usd", amount_total: 499000 }), null);
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

test("builds secure buyer and seller order emails", () => {
	const order = {
		sessionId: "cs_live_123",
		customerEmail: "buyer@example.com",
		customerName: "<Buyer>",
		businessName: "Buyer & Co",
		fulfilmentType: FULFILMENT_TYPES.LICENCE,
		amountTotal: 499000,
	};
	const buyer = buildBuyerEmail(order);
	const seller = buildSellerEmail(order);

	assert.equal(formatGbp(499000), "£4,990.00");
	assert.equal(
		buildFulfilmentUrl(order.sessionId),
		"https://trades-go-digital.co.uk/fulfilment/complete?session_id=cs_live_123",
	);
	assert.match(buyer.html, /Open secure download/);
	assert.match(buyer.html, /&lt;Buyer&gt;/);
	assert.match(seller.subject, /£4,990.00/);
	assert.equal(escapeHtml("A&B"), "A&amp;B");
});
