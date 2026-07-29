import { writeFileSync } from "node:fs";
import { join } from "node:path";

const workerPath = join(process.cwd(), "dist", "locked-worker.js");

const worker = String.raw`import astroWorker from "./_worker.js/index.js";

const USERNAME = "president";
const REALM = "Trades Go Digital";
const INVITE_COOKIE = "tgd_invite";

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
	const inviteToken = env.INVITE_TOKEN;

	if (password) {
		const credentials = getBasicCredentials(request.headers.get("Authorization"));
		if (credentials?.username === USERNAME && credentials.password === password) {
			return true;
		}
	}

	if (inviteToken) {
		const cookies = request.headers.get("Cookie") ?? "";
		return cookies
			.split(";")
			.map((cookie) => cookie.trim())
			.includes(INVITE_COOKIE + "=" + inviteToken);
	}

	return false;
};

export default {
	fetch(request, env, ctx) {
		const url = new URL(request.url);
		const inviteToken = env.INVITE_TOKEN;
		const invite = url.searchParams.get("invite");

		if (inviteToken && invite === inviteToken) {
			url.searchParams.delete("invite");
			return new Response(null, {
				status: 302,
				headers: {
					Location: url.toString(),
					"Set-Cookie": INVITE_COOKIE + "=" + inviteToken + "; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000",
					"Cache-Control": "no-store",
				},
			});
		}

		if (!isAuthorized(request, env)) {
			return unauthorized();
		}

		return astroWorker.fetch(request, env, ctx);
	},
};
`;

writeFileSync(workerPath, worker);
