const encoder = new TextEncoder();

export const FULFILMENT_TYPES = Object.freeze({
	LICENCE: "licence_download",
	INSTALLATION: "managed_installation",
});

export function resolveFulfilmentType(session) {
	const explicit = session?.metadata?.fulfilment_type;
	if (Object.values(FULFILMENT_TYPES).includes(explicit)) return explicit;

	if (session?.currency?.toLowerCase() !== "gbp") return null;
	if (session?.amount_total === 299000) return FULFILMENT_TYPES.LICENCE;
	if (session?.amount_total === 399000) return FULFILMENT_TYPES.INSTALLATION;
	return null;
}

export function parseStripeSignature(header) {
	const parsed = { timestamp: null, signatures: [] };
	for (const part of String(header || "").split(",")) {
		const separator = part.indexOf("=");
		if (separator === -1) continue;
		const key = part.slice(0, separator).trim();
		const value = part.slice(separator + 1).trim();
		if (key === "t") parsed.timestamp = Number(value);
		if (key === "v1" && value) parsed.signatures.push(value);
	}
	return parsed;
}

async function hmacHex(secret, payload) {
	const key = await crypto.subtle.importKey(
		"raw",
		encoder.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
	return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left, right) {
	if (left.length !== right.length) return false;
	let mismatch = 0;
	for (let index = 0; index < left.length; index += 1) {
		mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
	}
	return mismatch === 0;
}

export async function verifyStripeSignature(rawBody, signatureHeader, secret, nowSeconds = Date.now() / 1000) {
	if (!rawBody || !secret) return false;
	const { timestamp, signatures } = parseStripeSignature(signatureHeader);
	if (!Number.isFinite(timestamp) || Math.abs(nowSeconds - timestamp) > 300 || signatures.length === 0) {
		return false;
	}
	const expected = await hmacHex(secret, `${timestamp}.${rawBody}`);
	return signatures.some((signature) => constantTimeEqual(signature, expected));
}

export function makeAccessToken() {
	const bytes = crypto.getRandomValues(new Uint8Array(32));
	return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function isValidAccessToken(token) {
	return /^[a-f0-9]{64}$/.test(String(token || ""));
}

export function cleanText(value, maxLength = 1000) {
	return String(value || "").trim().slice(0, maxLength);
}

export function isEmail(value) {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

