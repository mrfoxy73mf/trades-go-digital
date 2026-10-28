import { writeFileSync } from "node:fs";
import { join } from "node:path";

const workerPath = join(process.cwd(), "dist", "locked-worker.js");

const worker = String.raw`import astroWorker from "./_worker.js/index.js";

const PUBLIC_EXACT_PATHS = new Set([
	"/tgd",
	"/tgd/",
	"/contact",
	"/contact/",
	"/terms-and-conditions",
	"/terms-and-conditions/",
	"/robots.txt",
	"/sitemap-index.xml",
	"/api/stripe/webhook",
	"/favicon.svg",
]);
const PUBLIC_PATH_PREFIXES = ["/_astro/", "/images/", "/videos/", "/fonts/", "/sitemap-"];

const unavailable = () =>
	new Response("This page is not currently available.", {
		status: 404,
		headers: { "Cache-Control": "no-store" },
	});

export default {
	fetch(request, env, ctx) {
		const url = new URL(request.url);

		if (url.pathname === "/") {
			return Response.redirect(new URL("/tgd", url), 308);
		}

		if (url.pathname === "/pricing" || url.pathname === "/pricing/") {
			return Response.redirect(new URL("/contact/#tgd-enquiry", url), 308);
		}

		const isPublicRoute =
			PUBLIC_EXACT_PATHS.has(url.pathname) ||
			PUBLIC_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));

		if (isPublicRoute) {
			return astroWorker.fetch(request, env, ctx);
		}

		return unavailable();
	},
};
`;

writeFileSync(workerPath, worker);
