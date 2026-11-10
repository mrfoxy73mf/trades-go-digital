export const TOOL_PRODUCTS = Object.freeze({
	pdf: { product: "tgd_pdf_standard", name: "PDF Maker standard document", description: "Download a finished quote, invoice, receipt or sign-off PDF.", price: 499, priceEnv: "PDF_DOWNLOAD_PRICE_PENCE", path: "/pdf-maker" },
	pdfPermit: { product: "tgd_pdf_permit", name: "PDF Maker permit", description: "Download your finished permit PDF.", price: 599, priceEnv: "PDF_PERMIT_PRICE_PENCE", path: "/pdf-maker" },
	pdfRams: { product: "tgd_pdf_rams", name: "PDF Maker RAMS pack", description: "Download your finished four-page RAMS PDF pack.", price: 999, priceEnv: "PDF_RAMS_PRICE_PENCE", path: "/pdf-maker" },
	logo: { product: "tgd_logo_download", name: "Logo Maker download", description: "Download your finished logo as SVG and PNG files.", price: 499, priceEnv: "LOGO_DOWNLOAD_PRICE_PENCE", path: "/logo-maker" },
	bundle: { product: "tgd_logo_pdf_bundle", name: "Logo and standard PDF bundle", description: "Download one finished logo and one standard quote, invoice, receipt or sign-off PDF.", price: 799, priceEnv: "LOGO_PDF_BUNDLE_PRICE_PENCE", path: "/logo-maker" },
	bundlePermit: { product: "tgd_logo_permit_bundle", name: "Logo and permit bundle", description: "Download one finished logo and one permit PDF.", price: 899, priceEnv: "LOGO_PERMIT_BUNDLE_PRICE_PENCE", path: "/logo-maker" },
	bundleRams: { product: "tgd_logo_rams_bundle", name: "Logo and RAMS bundle", description: "Download one finished logo and one four-page RAMS PDF pack.", price: 1299, priceEnv: "LOGO_RAMS_BUNDLE_PRICE_PENCE", path: "/logo-maker" },
});

export function toolPaymentConfig(env, tool) {
	const item = TOOL_PRODUCTS[tool];
	if (!item) return { enabled: false, mode: "test", key: "", item: null };
	const requestedMode = tool === "logo" || tool.startsWith("bundle") ? env.LOGO_PAYMENT_MODE : env.PDF_PAYMENT_MODE;
	const mode = (requestedMode || env.TOOL_PAYMENT_MODE) === "live" ? "live" : "test";
	const key = mode === "live" ? env.STRIPE_SECRET_KEY : env.STRIPE_TEST_SECRET_KEY;
	const configuredPrice = Number(env[item.priceEnv]);
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
