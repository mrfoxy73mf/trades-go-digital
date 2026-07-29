interface Env {
	FULFILMENT_DB: D1Database;
	FULFILMENT_FILES: KVNamespace;
	STRIPE_WEBHOOK_SECRET: string;
	INVITE_TOKEN: string;
	SITE_PASSWORD: string;
}

type Runtime = import("@astrojs/cloudflare").Runtime<Env>;

declare namespace App {
  interface Locals extends Runtime {}
}
