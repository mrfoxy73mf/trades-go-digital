import { test } from "node:test";
import assert from "node:assert/strict";
import { matchesToolPayment, toolPaymentConfig } from "../src/lib/tool-payments.mjs";

test("tool payments stay disabled without an exact test key and published price", () => {
	assert.equal(toolPaymentConfig({}, "pdf").enabled, false);
	assert.equal(toolPaymentConfig({ TOOL_PAYMENTS_ENABLED: "true", STRIPE_TEST_SECRET_KEY: "sk_live_wrong" }, "pdf").enabled, false);
	assert.equal(toolPaymentConfig({ TOOL_PAYMENTS_ENABLED: "true", STRIPE_TEST_SECRET_KEY: "sk_test_ok", PDF_DOWNLOAD_PRICE_PENCE: "799" }, "pdf").enabled, false);
	assert.equal(toolPaymentConfig({ TOOL_PAYMENTS_ENABLED: "true", STRIPE_TEST_SECRET_KEY: "sk_test_ok", PDF_DOWNLOAD_PRICE_PENCE: "499" }, "pdf").enabled, true);
	assert.equal(toolPaymentConfig({ TOOL_PAYMENTS_ENABLED: "true", STRIPE_TEST_SECRET_KEY: "sk_test_ok", PDF_PERMIT_PRICE_PENCE: "599" }, "pdfPermit").enabled, true);
	assert.equal(toolPaymentConfig({ TOOL_PAYMENTS_ENABLED: "true", STRIPE_TEST_SECRET_KEY: "sk_test_ok", PDF_RAMS_PRICE_PENCE: "999" }, "pdfRams").enabled, true);
	assert.equal(toolPaymentConfig({ TOOL_PAYMENTS_ENABLED: "true", STRIPE_TEST_SECRET_KEY: "sk_test_ok", LOGO_DOWNLOAD_PRICE_PENCE: "499" }, "logo").enabled, true);
	assert.equal(toolPaymentConfig({ TOOL_PAYMENTS_ENABLED: "true", STRIPE_TEST_SECRET_KEY: "sk_test_ok", LOGO_PDF_BUNDLE_PRICE_PENCE: "799" }, "bundle").enabled, true);
	assert.equal(toolPaymentConfig({ TOOL_PAYMENTS_ENABLED: "true", STRIPE_TEST_SECRET_KEY: "sk_test_ok", LOGO_PERMIT_BUNDLE_PRICE_PENCE: "899" }, "bundlePermit").enabled, true);
	assert.equal(toolPaymentConfig({ TOOL_PAYMENTS_ENABLED: "true", STRIPE_TEST_SECRET_KEY: "sk_test_ok", LOGO_RAMS_BUNDLE_PRICE_PENCE: "1299" }, "bundleRams").enabled, true);
	assert.equal(toolPaymentConfig({ TOOL_PAYMENTS_ENABLED: "true", TOOL_PAYMENT_MODE: "test", LOGO_PAYMENT_MODE: "live", STRIPE_SECRET_KEY: "sk_live_ok", LOGO_DOWNLOAD_PRICE_PENCE: "499" }, "logo").mode, "live");
	assert.equal(toolPaymentConfig({ TOOL_PAYMENTS_ENABLED: "true", TOOL_PAYMENT_MODE: "test", LOGO_PAYMENT_MODE: "live", STRIPE_TEST_SECRET_KEY: "sk_test_ok", PDF_DOWNLOAD_PRICE_PENCE: "499" }, "pdf").mode, "test");
});

test("download unlock requires the exact product, price, currency and Stripe mode", () => {
	const config = toolPaymentConfig({ TOOL_PAYMENTS_ENABLED: "true", STRIPE_TEST_SECRET_KEY: "sk_test_ok", PDF_DOWNLOAD_PRICE_PENCE: "499" }, "pdf");
	const paid = { payment_status: "paid", amount_total: 499, currency: "gbp", livemode: false, metadata: { product: "tgd_pdf_standard" } };
	assert.equal(matchesToolPayment(paid, config), true);
	for (const change of [{ payment_status: "unpaid" }, { amount_total: 599 }, { currency: "usd" }, { livemode: true }, { metadata: { product: "tgd_logo_download" } }]) assert.equal(matchesToolPayment({ ...paid, ...change }, config), false);
});

test("logo and standard PDF bundle verifies only at £7.99", () => {
	const config = toolPaymentConfig({ TOOL_PAYMENTS_ENABLED: "true", STRIPE_TEST_SECRET_KEY: "sk_test_ok", LOGO_PDF_BUNDLE_PRICE_PENCE: "799" }, "bundle");
	const paid = { payment_status: "paid", amount_total: 799, currency: "gbp", livemode: false, metadata: { product: "tgd_logo_pdf_bundle" } };
	assert.equal(matchesToolPayment(paid, config), true);
	assert.equal(matchesToolPayment({ ...paid, amount_total: 499 }, config), false);
	assert.equal(matchesToolPayment({ ...paid, metadata: { product: "tgd_logo_download" } }, config), false);
});

test("permit and RAMS bundles verify their exact products and prices", () => {
	const permit = toolPaymentConfig({ TOOL_PAYMENTS_ENABLED: "true", STRIPE_TEST_SECRET_KEY: "sk_test_ok" }, "bundlePermit");
	const rams = toolPaymentConfig({ TOOL_PAYMENTS_ENABLED: "true", STRIPE_TEST_SECRET_KEY: "sk_test_ok" }, "bundleRams");
	assert.equal(matchesToolPayment({ payment_status:"paid",amount_total:899,currency:"gbp",livemode:false,metadata:{product:"tgd_logo_permit_bundle"} }, permit), true);
	assert.equal(matchesToolPayment({ payment_status:"paid",amount_total:1299,currency:"gbp",livemode:false,metadata:{product:"tgd_logo_rams_bundle"} }, rams), true);
	assert.equal(matchesToolPayment({ payment_status:"paid",amount_total:899,currency:"gbp",livemode:false,metadata:{product:"tgd_logo_rams_bundle"} }, rams), false);
});
