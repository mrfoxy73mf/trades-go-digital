import { writeFileSync } from "node:fs";
import { join } from "node:path";

const workerPath = join(process.cwd(), "dist", "locked-worker.js");

const worker = String.raw`import astroWorker from "./_worker.js/index.js";

const USERNAME = "president";
const REALM = "Trades Go Digital";
const PUBLIC_EXACT_PATHS = new Set([
	"/business-tools",
	"/business-tools/",
	"/business-tools/pricing",
	"/business-tools/pricing/",
	"/business-tools/feedback",
	"/business-tools/feedback/",
	"/business-tools/support",
	"/business-tools/support/",
	"/business-tools/terms",
	"/business-tools/terms/",
	"/logo-maker",
	"/logo-maker/",
	"/pdf-maker",
	"/pdf-maker/",
	"/api/business-tools-feedback",
	"/api/logo-payment/checkout",
	"/api/logo-payment/verify",
	"/api/pdf-payment/checkout",
	"/api/pdf-payment/verify",
	"/favicon.svg",
]);
const PUBLIC_PATH_PREFIXES = ["/_astro/", "/images/", "/fonts/"];

const preventCaching = (response) => {
	const result = new Response(response.body, response);
	result.headers.set("Cache-Control", "private, no-store");
	result.headers.set("CDN-Cache-Control", "no-store");
	result.headers.set("Cloudflare-CDN-Cache-Control", "no-store");
	return result;
};

const unauthorized = () =>
	new Response("Password required.", {
		status: 401,
		headers: {
			"WWW-Authenticate": ` + "`Basic realm=\"${REALM}\", charset=\"UTF-8\"`" + `,
			"Cache-Control": "no-store",
		},
	});

const getBasicCredentials = (header) => {
	if (!header?.startsWith("Basic ")) return null;

	try {
		const decoded = atob(header.slice("Basic ".length));
		const separator = decoded.indexOf(":");
		if (separator === -1) return null;

		return {
			username: decoded.slice(0, separator),
			password: decoded.slice(separator + 1),
		};
	} catch {
		return null;
	}
};

const isAuthorized = (request, env) => {
	const password = env.SITE_PASSWORD;

	if (password) {
		const credentials = getBasicCredentials(request.headers.get("Authorization"));
		if (credentials?.username === USERNAME && credentials.password === password) {
			return true;
		}
	}

	return false;
};

export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);
		if (url.pathname === "/") {
			return Response.redirect(new URL("/business-tools/", url), 302);
		}

		const isPublicFulfilmentRoute =
			PUBLIC_EXACT_PATHS.has(url.pathname) ||
			PUBLIC_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));

		if (isPublicFulfilmentRoute) {
			return astroWorker.fetch(request, env, ctx);
		}

		if (!isAuthorized(request, env)) {
			return preventCaching(unauthorized());
		}

		return preventCaching(await astroWorker.fetch(request, env, ctx));
	},
};
`;

writeFileSync(workerPath, worker);
