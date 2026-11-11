import test from "node:test";
import assert from "node:assert/strict";
import { checkoutCountry, isCheckoutCountryAllowed } from "../src/lib/sales-countries.mjs";

const requestFrom = (country) => ({ cf: { country } });

test("checkout permits only UK and USA production locations", () => {
	assert.equal(isCheckoutCountryAllowed(requestFrom("GB")), true);
	assert.equal(isCheckoutCountryAllowed(requestFrom("US")), true);
	for (const country of ["FR", "IE", "CN", "DE", "CA"]) {
		assert.equal(isCheckoutCountryAllowed(requestFrom(country)), false);
	}
});

test("country values are normalised and local development remains usable", () => {
	assert.equal(checkoutCountry(requestFrom(" us ")), "US");
	assert.equal(isCheckoutCountryAllowed({}), true);
});
