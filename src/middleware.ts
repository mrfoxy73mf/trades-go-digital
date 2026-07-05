import { defineMiddleware } from "astro:middleware";

const USERNAME = "president";
const REALM = "Trades Go Digital";

const unauthorized = () =>
	new Response("Password required.", {
		status: 401,
		headers: {
			"WWW-Authenticate": `Basic realm="${REALM}", charset="UTF-8"`,
			"Cache-Control": "no-store",
		},
	});

const getBasicCredentials = (header: string | null) => {
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

export const onRequest = defineMiddleware(async (context, next) => {
	const password = context.locals.runtime.env.SITE_PASSWORD;

	if (!password) {
		return new Response("Site password is not configured.", {
			status: 503,
			headers: {
				"Cache-Control": "no-store",
			},
		});
	}

	const credentials = getBasicCredentials(context.request.headers.get("Authorization"));

	if (credentials?.username !== USERNAME || credentials.password !== password) {
		return unauthorized();
	}

	const response = await next();
	response.headers.set("Cache-Control", "no-store");
	return response;
});
