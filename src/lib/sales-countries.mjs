export const SALES_COUNTRIES = Object.freeze(["GB", "US"]);

export function checkoutCountry(request) {
	return String(request?.cf?.country || "").trim().toUpperCase();
}

export function isCheckoutCountryAllowed(request) {
	const country = checkoutCountry(request);
	return !country || SALES_COUNTRIES.includes(country);
}

export const SALES_COUNTRY_ERROR = "Online checkout is currently available only in the United Kingdom and United States. No payment has been taken.";
