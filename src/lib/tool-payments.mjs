export const TOOL_PRODUCTS = Object.freeze({
	pdf: { product: "tgd_pdf_download", name: "PDF Maker download", description: "Download your finished, print-ready PDF.", price: 799, path: "/pdf-maker" },
	logo: { product: "tgd_logo_download", name: "Logo Maker download", description: "Download your finished logo as SVG and PNG files.", price: 199, path: "/logo-maker" },
});

export function toolPaymentConfig(env, tool) {
	const item = TOOL_PRODUCTS[tool];
	if (!item) return { enabled: false, mode: "test", key: "", item: null };
	const mode = env.TOOL_PAYMENT_MODE === "live" ? "live" : "test";
	const key = mode === "live" ? env.STRIPE_SECRET_KEY : env.STRIPE_TEST_SECRET_KEY;
	const configuredPrice = Number(env[tool === "pdf" ? "PDF_DOWNLOAD_PRICE_PENCE" : "LOGO_DOWNLOAD_PRICE_PENCE"]);
	const amount = Number.isSafeInteger(configuredPrice) ? configuredPrice : item.price;
	const enabled = env.TOOL_PAYMENTS_ENABLED === "true" && Boolean(key) && amount === item.price && key.startsWith(mode === "live" ? "sk_live_" : "sk_test_");
	return { enabled, mode, key, amount, item };
}

export function matchesToolPayment(session, config) {
	return Boolean(config.enabled && session?.payment_status === "paid" && session?.metadata?.product === config.item.product && session?.amount_total === config.amount && session?.currency === "gbp" && session?.livemode === (config.mode === "live"));
}

export async function stripeRequest(key, path, params) {
	const response = await fetch(`https://api.stripe.com/v1/${path}`, {
		method: params ? "POST" : "GET",
		headers: { Authorization: `Bearer ${key}`, ...(params ? { "Content-Type": "application/x-www-form-urlencoded" } : {}) },
		body: params,
		signal: AbortSignal.timeout(20000),
	});
	const body = await response.json();
	if (!response.ok) throw new Error(body?.error?.message || "Stripe is temporarily unavailable.");
	return body;
}
