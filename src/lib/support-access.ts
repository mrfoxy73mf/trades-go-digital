export const SUPPORT_COOKIE = "tgd_support_access";

const decodeBase64Url = (value: string) => {
	const padded = value.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat((4 - value.length % 4) % 4);
	return Uint8Array.from(atob(padded), character => character.charCodeAt(0));
};

export async function verifySupportToken(token: string | undefined, secret: string | undefined) {
	if (!token || !secret) return null;
	const [encodedPayload, encodedSignature, extra] = token.split(".");
	if (!encodedPayload || !encodedSignature || extra) return null;
	try {
		const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
		const valid = await crypto.subtle.verify("HMAC", key, decodeBase64Url(encodedSignature), new TextEncoder().encode(encodedPayload));
		if (!valid) return null;
		const claims = JSON.parse(new TextDecoder().decode(decodeBase64Url(encodedPayload)));
		if (!claims?.sub || !claims?.email || Number(claims?.exp || 0) <= Math.floor(Date.now() / 1000)) return null;
		if (!(["active", "trialing"].includes(String(claims.subscription_status || "").toLowerCase()) || claims.role === "admin")) return null;
		return claims;
	} catch {
		return null;
	}
}

export async function supportClaims(cookies: any, env: any) {
	return verifySupportToken(cookies.get(SUPPORT_COOKIE)?.value, env.SUPPORT_PORTAL_SECRET);
}
