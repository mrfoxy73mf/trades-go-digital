import { test } from "node:test";
import assert from "node:assert/strict";
import { matchesToolPayment, toolPaymentConfig } from "../src/lib/tool-payments.mjs";

test("tool payments stay disabled without an exact test key and published price", () => {
	assert.equal(toolPaymentConfig({}, "pdf").enabled, false);
	assert.equal(toolPaymentConfig({ TOOL_PAYMENTS_ENABLED: "true", STRIPE_TEST_SECRET_KEY: "sk_live_wrong" }, "pdf").enabled, false);
	assert.equal(toolPaymentConfig({ TOOL_PAYMENTS_ENABLED: "true", STRIPE_TEST_SECRET_KEY: "sk_test_ok", PDF_DOWNLOAD_PRICE_PENCE: "499" }, "pdf").enabled, false);
	assert.equal(toolPaymentConfig({ TOOL_PAYMENTS_ENABLED: "true", STRIPE_TEST_SECRET_KEY: "sk_test_ok", PDF_DOWNLOAD_PRICE_PENCE: "799" }, "pdf").enabled, true);
	assert.equal(toolPaymentConfig({ TOOL_PAYMENTS_ENABLED: "true", STRIPE_TEST_SECRET_KEY: "sk_test_ok", LOGO_DOWNLOAD_PRICE_PENCE: "199" }, "logo").enabled, true);
	assert.equal(toolPaymentConfig({ TOOL_PAYMENTS_ENABLED: "true", TOOL_PAYMENT_MODE: "test", LOGO_PAYMENT_MODE: "live", STRIPE_SECRET_KEY: "sk_live_ok", LOGO_DOWNLOAD_PRICE_PENCE: "199" }, "logo").mode, "live");
	assert.equal(toolPaymentConfig({ TOOL_PAYMENTS_ENABLED: "true", TOOL_PAYMENT_MODE: "test", LOGO_PAYMENT_MODE: "live", STRIPE_TEST_SECRET_KEY: "sk_test_ok", PDF_DOWNLOAD_PRICE_PENCE: "799" }, "pdf").mode, "test");
});

test("download unlock requires the exact product, price, currency and Stripe mode", () => {
	const config = toolPaymentConfig({ TOOL_PAYMENTS_ENABLED: "true", STRIPE_TEST_SECRET_KEY: "sk_test_ok", PDF_DOWNLOAD_PRICE_PENCE: "799" }, "pdf");
	const paid = { payment_status: "paid", amount_total: 799, currency: "gbp", livemode: false, metadata: { product: "tgd_pdf_download" } };
	assert.equal(matchesToolPayment(paid, config), true);
	for (const change of [{ payment_status: "unpaid" }, { amount_total: 199 }, { currency: "usd" }, { livemode: true }, { metadata: { product: "tgd_logo_download" } }]) assert.equal(matchesToolPayment({ ...paid, ...change }, config), false);
});
