import { writeFileSync } from "node:fs";
import { join } from "node:path";

const workerPath = join(process.cwd(), "dist", "locked-worker.js");

const worker = String.raw`import astroWorker from "./_worker.js/index.js";

const USERNAME = "president";
const REALM = "Trades Go Digital";

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
	if (!password) return false;

	const credentials = getBasicCredentials(request.headers.get("Authorization"));
	return credentials?.username === USERNAME && credentials.password === password;
};

export default {
	fetch(request, env, ctx) {
		if (!isAuthorized(request, env)) {
			return unauthorized();
		}

		return astroWorker.fetch(request, env, ctx);
	},
};
`;

writeFileSync(workerPath, worker);
